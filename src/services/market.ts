import AsyncStorage from '@react-native-async-storage/async-storage';
import { Holding, WatchlistItem, Catalyst } from './types';

const POLYGON_KEY = process.env.EXPO_PUBLIC_POLYGON_API_KEY ?? '';

const PRICE_TTL_MS  = 5 * 60_000;   // 5 min during market hours

// ─── Market status ────────────────────────────────────────────────────────────

export type MarketStatus = 'pre-market' | 'open' | 'closed' | 'after-hours';

export function getMarketStatus(): MarketStatus {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 6=Sat
  if (day === 0 || day === 6) return 'closed';

  // ET = UTC-4 (EDT). Close enough without DST library.
  const etHour = ((now.getUTCHours() - 4 + 24) % 24) + now.getUTCMinutes() / 60;
  if (etHour >= 4 && etHour < 9.5)  return 'pre-market';
  if (etHour >= 9.5 && etHour < 16) return 'open';
  if (etHour >= 16 && etHour < 20)  return 'after-hours';
  return 'closed';
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

async function readCache<T>(key: string, ttlMs: number): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`mkt_${key}`);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: T; ts: number };
    if (Date.now() - ts > ttlMs) return null;
    return data;
  } catch { return null; }
}

async function writeCache(key: string, data: unknown): Promise<void> {
  try { await AsyncStorage.setItem(`mkt_${key}`, JSON.stringify({ data, ts: Date.now() })); }
  catch { /* non-critical */ }
}

// ─── Price service ────────────────────────────────────────────────────────────

async function fetchPolygon(ticker: string): Promise<number> {
  const url = `https://api.polygon.io/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}?apiKey=${POLYGON_KEY}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`Polygon ${res.status}`);
  const data = await res.json() as { ticker?: { day?: { c?: number } } };
  const price = data.ticker?.day?.c;
  if (!price) throw new Error('No price from Polygon');
  return price;
}

async function fetchYahoo(ticker: string): Promise<number> {
  const url  = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
  const res  = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!res.ok) throw new Error(`Yahoo ${res.status}`);
  const data = await res.json() as { chart?: { result?: Array<{ meta?: { regularMarketPrice?: number } }> } };
  const price = data.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (!price) throw new Error('No price from Yahoo');
  return price;
}

export interface YahooQuote {
  price: number;
  change: number;
  changePct: number;
  prevClose: number;
  postPrice: number | null;
  postChange: number | null;
  postChangePct: number | null;
}

export async function getYahooQuote(ticker: string): Promise<YahooQuote | null> {
  const cacheKey = `mkt_yq_${ticker}`;
  const ttl = getMarketStatus() === 'closed' ? 60 * 60_000 : PRICE_TTL_MS;
  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    if (raw) {
      const { data, ts } = JSON.parse(raw) as { data: YahooQuote; ts: number };
      if (Date.now() - ts < ttl) return data;
    }
  } catch { /* proceed to fetch */ }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1d`;
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`Yahoo ${res.status}`);
    type Meta = {
      regularMarketPrice?: number;
      regularMarketChange?: number;
      regularMarketChangePercent?: number;
      previousClose?: number;
      chartPreviousClose?: number;
      postMarketPrice?: number;
      postMarketChange?: number;
      postMarketChangePercent?: number;
      preMarketPrice?: number;
      preMarketChange?: number;
      preMarketChangePercent?: number;
    };
    const json = await res.json() as { chart?: { result?: Array<{ meta?: Meta }> } };
    const meta = json.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) throw new Error('No price');

    const prev = meta.previousClose ?? meta.chartPreviousClose ?? meta.regularMarketPrice;

    // Extended hours: prefer post-market, fall back to pre-market
    const extPrice  = meta.postMarketPrice  ?? meta.preMarketPrice  ?? null;
    const extChange = meta.postMarketChange ?? meta.preMarketChange ?? null;
    const extPct    = meta.postMarketChangePercent ?? meta.preMarketChangePercent ?? null;

    const quote: YahooQuote = {
      price:        meta.regularMarketPrice,
      change:       meta.regularMarketChange    ?? (meta.regularMarketPrice - prev),
      changePct:    meta.regularMarketChangePercent ?? (prev ? ((meta.regularMarketPrice - prev) / prev) * 100 : 0),
      prevClose:    prev,
      postPrice:    extPrice,
      postChange:   extChange,
      postChangePct: extPct,
    };
    await AsyncStorage.setItem(cacheKey, JSON.stringify({ data: quote, ts: Date.now() }));
    return quote;
  } catch {
    return null;
  }
}

export async function getPrice(ticker: string): Promise<number> {
  const cacheKey = `price_${ticker}`;
  const ttl = getMarketStatus() === 'closed' ? 24 * 60 * 60_000 : PRICE_TTL_MS;
  const cached = await readCache<number>(cacheKey, ttl);
  if (cached !== null) return cached;

  // Try Polygon → Yahoo → cached stale → mock
  const sources = [
    POLYGON_KEY ? () => fetchPolygon(ticker) : null,
    () => fetchYahoo(ticker),
  ].filter(Boolean) as Array<() => Promise<number>>;

  for (const fn of sources) {
    try {
      const price = await fn();
      await writeCache(cacheKey, price);
      return price;
    } catch { /* try next */ }
  }

  // Return stale cache rather than crashing
  const stale = await readCache<number>(cacheKey, Infinity);
  if (stale !== null) return stale;

  // Final fallback: return 0 (UI handles gracefully)
  return 0;
}

export async function getPrices(tickers: string[]): Promise<Record<string, number>> {
  const entries = await Promise.all(tickers.map(async (t) => [t, await getPrice(t)] as const));
  return Object.fromEntries(entries);
}

export async function getMarketMovers() {
  // Returns top movers as Stock-compatible objects for the old Dashboard
  // TODO: wire to Polygon gainers endpoint when API key is present
  return MOCK_WATCHLIST.slice(0, 6).map((w) => ({
    symbol: w.ticker, name: w.name, price: w.price,
    change: w.price - w.support, changePercent: ((w.price - w.support) / w.support) * 100,
  }));
}

// ─── Mock data ────────────────────────────────────────────────────────────────

export const MOCK_WATCHLIST: WatchlistItem[] = [
  {
    ticker: 'META',  name: 'Meta Platforms',
    price: 562.40,   high52: 740.91,  low52: 443.45,
    analystTarget: 826.00, fwdPE: 22.4, buyPct: 95,
    support: 539.00, resist: 620.00, atr: 12.4,
    sector: 'Technology',
  },
  {
    ticker: 'MSFT',  name: 'Microsoft Corp.',
    price: 415.30,   high52: 468.35,  low52: 361.77,
    analystTarget: 520.00, fwdPE: 31.2, buyPct: 92,
    support: 400.00, resist: 445.00, atr: 5.1,
    sector: 'Technology',
  },
  {
    ticker: 'NVDA',  name: 'NVIDIA Corp.',
    price: 131.38,   high52: 153.13,  low52: 85.12,
    analystTarget: 180.00, fwdPE: 34.8, buyPct: 89,
    support: 124.00, resist: 145.00, atr: 4.2,
    sector: 'Technology',
  },
  {
    ticker: 'MRVL',  name: 'Marvell Technology',
    price: 79.70,    high52: 119.10,  low52: 52.00,
    analystTarget: 111.00, fwdPE: 27.6, buyPct: 78,
    support: 72.00,  resist: 90.00,  atr: 2.8,
    sector: 'Technology',
  },
  {
    ticker: 'NBIS',  name: 'Nebius Group',
    price: 232.36,   high52: 285.00,  low52: 38.50,
    analystTarget: 310.00, fwdPE: 0,   buyPct: 88,
    support: 210.00, resist: 260.00, atr: 9.6,
    sector: 'Technology',
  },
  {
    ticker: 'WDC',   name: 'Western Digital',
    price: 51.20,    high52: 80.00,   low52: 38.50,
    analystTarget: 75.00,  fwdPE: 14.2, buyPct: 71,
    support: 48.00,  resist: 57.00,  atr: 1.9,
    sector: 'Technology',
  },
  {
    ticker: 'ANET',  name: 'Arista Networks',
    price: 108.50,   high52: 131.40,  low52: 72.34,
    analystTarget: 138.00, fwdPE: 38.5, buyPct: 82,
    support: 104.00, resist: 120.00, atr: 3.1,
    sector: 'Technology',
  },
];

export const MOCK_HOLDINGS: Holding[] = [
  {
    ticker: 'APLD', name: 'Applied Digital Corp.',
    shares: 300, avgCost: 8.40, currentPrice: 11.20,
    analystTarget: 18.00, support: 9.80, atr: 0.52,
    sector: 'Technology', source: 'indmoney',
  },
  {
    ticker: 'IREN', name: 'IREN Ltd.',
    shares: 250, avgCost: 9.10, currentPrice: 12.85,
    analystTarget: 20.00, support: 11.50, atr: 0.68,
    sector: 'Technology', source: 'indmoney',
  },
  {
    ticker: 'RKLB', name: 'Rocket Lab USA',
    shares: 180, avgCost: 14.20, currentPrice: 28.40,
    analystTarget: 35.00, support: 25.00, atr: 1.40,
    sector: 'Industrials', source: 'indmoney',
  },
  {
    ticker: 'NBIS', name: 'Nebius Group',
    shares: 40, avgCost: 38.50, currentPrice: 232.36,
    analystTarget: 310.00, support: 210.00, atr: 9.60,
    sector: 'Technology', source: 'indmoney',
  },
  {
    ticker: 'CRWV', name: 'CoreWeave Inc.',
    shares: 60, avgCost: 55.00, currentPrice: 88.40,
    analystTarget: 120.00, support: 78.00, atr: 4.20,
    sector: 'Technology', source: 'indmoney',
  },
];

export const MOCK_CATALYSTS: Catalyst[] = [
  {
    date: 'Jun 22', ticker: 'NBIS',
    event: 'Nasdaq-100 inclusion', impact: 'high',
    description: 'Passive funds must buy before open. $800B+ in QQQ/QQQM.',
  },
  {
    date: 'Jun 23', ticker: 'AMZN',
    event: 'Prime Day starts', impact: 'medium',
    description: 'Two-day sales event — AMZN revenue catalyst.',
  },
  {
    date: 'Jun 24', ticker: 'MU',
    event: 'Earnings after close', impact: 'high',
    description: '20% implied move. 932% EPS growth expected. High binary risk.',
  },
  {
    date: 'Jun 25', ticker: 'MU',
    event: 'Post-earnings reaction', impact: 'medium',
    description: 'Memory sector moves: WDC, STX, SNDK all affected.',
  },
];

