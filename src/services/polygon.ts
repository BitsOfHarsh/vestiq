import { KEYS, TTL } from '../config';
import { getCached, getStale } from './cache';

const BASE = 'https://api.polygon.io';
const KEY  = KEYS.polygon;

function poly(path: string, params: Record<string, string> = {}): string {
  const q = new URLSearchParams({ ...params, apiKey: KEY }).toString();
  return `${BASE}${path}?${q}`;
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Polygon ${res.status}: ${url}`);
  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface TickerSnapshot {
  ticker: string;
  price: number;
  open: number;
  high: number;
  low: number;
  prevClose: number;
  change: number;
  changePct: number;
  volume: number;
}

export interface OHLCVBar {
  t: number;   // timestamp ms
  o: number;
  h: number;
  l: number;
  c: number;
  v: number;
}

// ─── Single ticker snapshot ───────────────────────────────────────────────────

export async function getSnapshot(ticker: string): Promise<TickerSnapshot> {
  const cacheKey = `snap_${ticker}`;
  try {
    return await getCached(cacheKey, TTL.quote, async () => {
      type Resp = { ticker?: { day?: { o: number; h: number; l: number; c: number; v: number }; prevDay?: { c: number }; todaysChangePerc?: number; todaysChange?: number } };
      const data = await get<Resp>(poly(`/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}`));
      const d    = data.ticker?.day;
      const prev = data.ticker?.prevDay?.c ?? d?.c ?? 0;
      // Prefer today's close; fall back to prev-day close so after-hours / weekends show a price
      const price = (d?.c && d.c > 0 ? d.c : null) ?? prev;
      if (!price) throw new Error('No price data');
      return {
        ticker,
        price,
        open:      d?.o ?? 0,
        high:      d?.h ?? 0,
        low:       d?.l ?? 0,
        prevClose: prev,
        change:    data.ticker?.todaysChange    ?? (price - prev),
        changePct: data.ticker?.todaysChangePerc ?? (prev ? ((price - prev) / prev) * 100 : 0),
        volume:    d?.v ?? 0,
      };
    });
  } catch {
    const stale = await getStale<TickerSnapshot>(cacheKey);
    if (stale) return stale;
    return { ticker, price: 0, open: 0, high: 0, low: 0, prevClose: 0, change: 0, changePct: 0, volume: 0 };
  }
}

// ─── Batch snapshots (portfolio holdings, watchlist) ─────────────────────────

export async function getSnapshots(tickers: string[]): Promise<Record<string, TickerSnapshot>> {
  if (!tickers.length) return {};
  const cacheKey = `batch_${tickers.sort().join('_')}`;
  try {
    return await getCached(cacheKey, TTL.quote, async () => {
      type Resp = { tickers?: Array<{ ticker: string; day?: { o: number; h: number; l: number; c: number; v: number }; prevDay?: { c: number }; todaysChangePerc?: number; todaysChange?: number }> };
      const data = await get<Resp>(poly('/v2/snapshot/locale/us/markets/stocks/tickers', { tickers: tickers.join(',') }));
      const result: Record<string, TickerSnapshot> = {};
      for (const t of data.tickers ?? []) {
        const d = t.day;
        const prev = t.prevDay?.c ?? d?.c ?? 0;
        // Use today's close if non-zero, else yesterday's close (handles after-hours / weekends)
        const price = (d?.c && d.c > 0 ? d.c : null) ?? prev;
        if (!price) continue;
        result[t.ticker] = {
          ticker:    t.ticker,
          price,
          open:      d?.o ?? 0,
          high:      d?.h ?? 0,
          low:       d?.l ?? 0,
          prevClose: prev,
          change:    t.todaysChange    ?? (price - prev),
          changePct: t.todaysChangePerc ?? (prev ? ((price - prev) / prev) * 100 : 0),
          volume:    d?.v ?? 0,
        };
      }
      return result;
    });
  } catch {
    const stale = await getStale<Record<string, TickerSnapshot>>(cacheKey);
    return stale ?? {};
  }
}

// ─── OHLCV chart bars ─────────────────────────────────────────────────────────

export type ChartRange = '1D' | '5D' | '1M' | '3M' | '6M' | '1Y' | '5Y';

const RANGE_PARAMS: Record<ChartRange, { multiplier: string; timespan: string; daysBack: number }> = {
  '1D':  { multiplier: '5',  timespan: 'minute', daysBack: 1   },
  '5D':  { multiplier: '30', timespan: 'minute', daysBack: 5   },
  '1M':  { multiplier: '1',  timespan: 'day',    daysBack: 31  },
  '3M':  { multiplier: '1',  timespan: 'day',    daysBack: 92  },
  '6M':  { multiplier: '1',  timespan: 'day',    daysBack: 183 },
  '1Y':  { multiplier: '1',  timespan: 'week',   daysBack: 365 },
  '5Y':  { multiplier: '1',  timespan: 'month',  daysBack: 1825 },
};

export async function getChartBars(ticker: string, range: ChartRange = '1M'): Promise<OHLCVBar[]> {
  const cacheKey = `chart_${ticker}_${range}`;
  try {
    return await getCached(cacheKey, TTL.chart, async () => {
      const { multiplier, timespan, daysBack } = RANGE_PARAMS[range];
      const to   = new Date();
      const from = new Date(Date.now() - daysBack * 86_400_000);
      const fmt  = (d: Date) => d.toISOString().slice(0, 10);

      type Resp = { results?: Array<{ t: number; o: number; h: number; l: number; c: number; v: number }> };
      const data = await get<Resp>(poly(
        `/v2/aggs/ticker/${ticker}/range/${multiplier}/${timespan}/${fmt(from)}/${fmt(to)}`,
        { adjusted: 'true', sort: 'asc', limit: '5000' },
      ));
      return (data.results ?? []).map(r => ({ t: r.t, o: r.o, h: r.h, l: r.l, c: r.c, v: r.v }));
    });
  } catch {
    return [];
  }
}

// ─── Market indices (VIX, SPY, BTC) ─────────────────────────────────────────

export async function getMarketIndices(): Promise<{ vix: TickerSnapshot; spy: TickerSnapshot; btc: TickerSnapshot }> {
  const [vix, spy, btc] = await Promise.all([
    getSnapshot('VIX'),
    getSnapshot('SPY'),
    getSnapshot('X:BTCUSD'),
  ]);
  return { vix, spy, btc };
}

// ─── Market news ──────────────────────────────────────────────────────────────

export interface PolygonArticle {
  id: string;
  title: string;
  description: string;
  articleUrl: string;
  publishedUtc: string;  // ISO-8601
  publisherName: string;
  publisherLogoUrl: string;
  tickers: string[];
  primaryTicker: string;
  sentiment: 'positive' | 'negative' | 'neutral' | '';
}

export async function getPolygonNews(limit = 50): Promise<PolygonArticle[]> {
  const cacheKey = 'poly_news_v2';
  try {
    return await getCached(cacheKey, TTL.news, async () => {
      type Raw = {
        results: Array<{
          id: string;
          title: string;
          description: string;
          article_url: string;
          published_utc: string;
          publisher: { name: string; logo_url: string };
          tickers: string[];
          insights?: Array<{ ticker: string; sentiment: string }>;
        }>;
      };
      const data = await get<Raw>(poly('/v2/reference/news', {
        limit:   String(limit),
        order:   'desc',
        sort:    'published_utc',
        language: 'en',
      }));
      // Filter out press release wires (GlobeNewswire, PR Newswire, BusinessWire)
      const WIRE_DOMAINS = ['globenewswire.com', 'prnewswire.com', 'businesswire.com', 'accesswire.com'];
      return (data.results ?? [])
        .filter(r => {
          const domain = r.article_url ? new URL(r.article_url).hostname.replace(/^www\./, '') : '';
          return !WIRE_DOMAINS.some(w => domain.endsWith(w));
        })
        .map(r => {
        const primaryTicker = r.tickers?.[0] ?? '';
        const insight = r.insights?.find(i => i.ticker === primaryTicker) ?? r.insights?.[0];
        const sentiment = insight?.sentiment as PolygonArticle['sentiment'] ?? '';
        return {
          id:               r.id,
          title:            r.title,
          description:      r.description ?? '',
          articleUrl:       r.article_url,
          publishedUtc:     r.published_utc,
          publisherName:    r.publisher?.name ?? '',
          publisherLogoUrl: r.publisher?.logo_url ?? '',
          tickers:          r.tickers ?? [],
          primaryTicker,
          sentiment,
        };
      });
    });
  } catch {
    return await getStale<PolygonArticle[]>(cacheKey) ?? [];
  }
}
