import AsyncStorage from '@react-native-async-storage/async-storage';
import { Holding, WatchlistItem, Catalyst, NewsItem } from './types';

const POLYGON_KEY = process.env.EXPO_PUBLIC_POLYGON_API_KEY ?? '';
const NEWS_KEY    = process.env.EXPO_PUBLIC_NEWS_API_KEY    ?? '';

const PRICE_TTL_MS  = 5 * 60_000;   // 5 min during market hours
const NEWS_TTL_MS   = 15 * 60_000;  // 15 min

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

// ─── News service ─────────────────────────────────────────────────────────────

const COUNTRY_CODE: Record<string, string> = {
  'United States': 'us',
  India:           'in',
  China:           'cn',
  Japan:           'jp',
  Australia:       'au',
  Europe:          'gb',  // NewsAPI uses gb as closest EU proxy
};

async function fetchNewsAPI(country: string): Promise<NewsItem[]> {
  const code = COUNTRY_CODE[country] ?? 'us';
  const url  = `https://newsapi.org/v2/top-headlines?category=business&country=${code}&pageSize=12&apiKey=${NEWS_KEY}`;
  const res  = await fetch(url);
  if (!res.ok) throw new Error(`NewsAPI ${res.status}`);
  const data = await res.json() as { articles?: Array<{
    title: string; description?: string; publishedAt: string; url: string; source?: { name?: string };
  }> };
  return (data.articles ?? []).map((a, i) => ({
    id:       `${country}_${i}`,
    time:     new Date(a.publishedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
    headline: a.title,
    summary:  a.description ?? '',
    country,
    url:      a.url,
  }));
}

export async function getHeadlines(country: string): Promise<NewsItem[]> {
  const cacheKey = `news_${country}`;
  const cached   = await readCache<NewsItem[]>(cacheKey, NEWS_TTL_MS);
  if (cached) return cached;

  try {
    if (!NEWS_KEY) throw new Error('No NEWS_API_KEY');
    const items = await fetchNewsAPI(country);
    await writeCache(cacheKey, items);
    return items;
  } catch {
    return MOCK_HEADLINES.filter((n) => n.country === country);
  }
}

// ─── Legacy exports (used by existing screens) ────────────────────────────────

export { getHeadlines as getFinancialNews };

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

const MOCK_HEADLINES: Array<NewsItem & { country: string }> = [
  { id: 'us-1', time: '19:30', country: 'United States', headline: "Apple's Siri AI Finally Works, Easing Two-Year AI Crisis",      summary: 'Apple demoed a fully revamped Siri capable of multi-step reasoning at WWDC.',                                              ticker: 'AAPL', tickerName: 'Apple Inc.',       tickerPrice: 211.45, tickerChange: +0.84, url: '' },
  { id: 'us-2', time: '17:55', country: 'United States', headline: "Meta's $14B AI Bet Strains as Zuckerberg Clashes with Star Hire", summary: "Internal tensions at Meta's AI lab as Wang reportedly disagrees with scaling-first strategy.",                               ticker: 'META', tickerName: 'Meta Platforms',  tickerPrice: 566.98, tickerChange: -0.26, url: '' },
  { id: 'us-3', time: '16:40', country: 'United States', headline: 'Micron Earnings Expected to Show 932% EPS Growth',               summary: 'Analysts forecast explosive EPS expansion driven by HBM memory demand, results due Jun 24.',                                ticker: 'MU',   tickerName: 'Micron Technology',tickerPrice: 119.80, tickerChange: -1.43, url: '' },
  { id: 'us-4', time: '15:20', country: 'United States', headline: 'Nasdaq-100 Adds NBIS, CRWV, RKLB, TER on June 22',             summary: 'Index rebalancing will force passive funds to purchase shares, creating a technical tailwind.',                                ticker: 'NBIS', tickerName: 'Nebius Group',     tickerPrice: 232.36, tickerChange: +4.55, url: '' },
  { id: 'us-5', time: '14:05', country: 'United States', headline: "MRVL: Jensen Huang Calls It Next Trillion-Dollar Company",       summary: "NVIDIA's CEO singled out Marvell as a key custom silicon partner for AI infrastructure.",                                     ticker: 'MRVL', tickerName: 'Marvell Tech',     tickerPrice: 79.70,  tickerChange: -0.36, url: '' },
  { id: 'eu-1', time: '18:12', country: 'Europe',        headline: 'EU Commission Assessing Anthropic AI Access Cut After US Order', summary: 'European regulators scrutinising export order restricting EU companies from frontier US AI.',                                  ticker: 'ASML', tickerName: 'ASML Holding',     tickerPrice: 1863.00,tickerChange: -1.89, url: '' },
  { id: 'in-1', time: '11:30', country: 'India',         headline: 'Infosys Wins $2B AI Cloud Migration Deal with European Bank',    summary: 'Infosys secured one of its largest AI-led transformation deals, boosting FY26 revenue outlook.',                               ticker: 'INFY', tickerName: 'Infosys',          tickerPrice: 18.42,  tickerChange: +1.12, url: '' },
  { id: 'in-2', time: '10:15', country: 'India',         headline: 'Reliance Jio to Launch Satellite Broadband Across Rural India',  summary: 'JioSpaceFiber targets 100M underserved households by end of 2026 with TRAI approval pending.',                                 ticker: 'RELI', tickerName: 'Reliance',         tickerPrice: 2934.00,tickerChange: +0.67, url: '' },
  { id: 'cn-1', time: '09:45', country: 'China',         headline: 'Alibaba Cloud Revenue Surges 25% as AI Demand Offsets Slowdown', summary: 'Cloud and AI segment growth accelerated in Q4 FY26 with GenAI workloads as primary driver.',                                   ticker: 'BABA', tickerName: 'Alibaba Group',    tickerPrice: 118.30, tickerChange: +2.14, url: '' },
  { id: 'jp-1', time: '08:20', country: 'Japan',         headline: 'Toyota Delays Solid-State Battery Launch to 2028 on Cost Pressure',summary: 'Manufacturing cost hurdles push EV battery timeline, though long-term EV targets reiterated.',                              ticker: 'TM',   tickerName: 'Toyota Motor',     tickerPrice: 178.50, tickerChange: -0.55, url: '' },
  { id: 'au-1', time: '07:10', country: 'Australia',     headline: 'BHP Eyes $3B Copper Expansion as EV Demand Surge Lifts Prices',  summary: 'Copper futures hit 18-month highs as BHP fast-tracks Chilean mine expansion through 2030.',                                    ticker: 'BHP',  tickerName: 'BHP Group',        tickerPrice: 42.80,  tickerChange: +1.22, url: '' },
];
