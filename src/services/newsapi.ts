/**
 * News feed powered by Finnhub (general market news + company-specific news).
 * Exports the same NewsAPIArticle interface so headlines.tsx is unchanged.
 */
import { KEYS, TTL } from '../config';
import { getCached, getStale } from './cache';

const BASE  = 'https://finnhub.io/api/v1';
const TOKEN = KEYS.finnhub;

function fh(path: string, params: Record<string, string> = {}): string {
  const q = new URLSearchParams({ ...params, token: TOKEN }).toString();
  return `${BASE}${path}?${q}`;
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Finnhub ${res.status}`);
  return res.json() as Promise<T>;
}

type RawItem = {
  id: number;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;   // unix seconds
  related: string;    // comma-separated tickers e.g. "AAPL,MSFT"
  image: string;
};

export interface NewsAPIArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  image: string;
  publishedAt: string;   // ISO-8601
  source: string;
  ticker: string | null; // primary ticker from Finnhub `related` field
}

function mapItem(r: RawItem, fallbackTicker?: string): NewsAPIArticle {
  const primaryTicker = r.related?.split(',')[0].trim() || fallbackTicker || null;
  return {
    id:          String(r.id),
    title:       r.headline,
    description: r.summary ?? '',
    url:         r.url,
    image:       r.image ?? '',
    publishedAt: new Date(r.datetime * 1000).toISOString(),
    source:      r.source,
    ticker:      primaryTicker || null,
  };
}

// Top tickers to fetch company news for, giving us ticker-tagged articles
const TOP_TICKERS = ['AAPL', 'NVDA', 'MSFT', 'TSLA', 'AMZN', 'META', 'GOOGL', 'JPM', 'AMD', 'NFLX'];

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

// ─── General market news (replaces getBusinessHeadlines) ─────────────────────

export async function getBusinessHeadlines(_pageSize = 50): Promise<NewsAPIArticle[]> {
  const cacheKey = 'fh_marketnews_general_v1';
  try {
    return await getCached(cacheKey, TTL.news, async () => {
      const data = await get<RawItem[]>(fh('/news', { category: 'general' }));
      return (data ?? [])
        .filter(r => r.headline && r.headline !== '[Removed]')
        .slice(0, 40)
        .map(r => mapItem(r));
    });
  } catch {
    return await getStale<NewsAPIArticle[]>(cacheKey) ?? [];
  }
}

// ─── Company news for top tickers (replaces getStockNewsSearch) ───────────────

export async function getStockNewsSearch(_pageSize = 50): Promise<NewsAPIArticle[]> {
  const cacheKey = 'fh_companynews_top_v1';
  const from = daysAgo(3);
  const to   = new Date().toISOString().slice(0, 10);
  try {
    return await getCached(cacheKey, TTL.news, async () => {
      const batches = await Promise.allSettled(
        TOP_TICKERS.map(ticker =>
          get<RawItem[]>(fh('/company-news', { symbol: ticker, from, to }))
            .then(data => (data ?? []).slice(0, 5).map(r => mapItem(r, ticker)))
        )
      );
      const articles: NewsAPIArticle[] = [];
      for (const r of batches) {
        if (r.status === 'fulfilled') articles.push(...r.value);
      }
      return articles;
    });
  } catch {
    return await getStale<NewsAPIArticle[]>(cacheKey) ?? [];
  }
}

// Keep inferTicker exported in case other files import it
export function inferTicker(_title: string, _description: string): string | null {
  return null;
}
