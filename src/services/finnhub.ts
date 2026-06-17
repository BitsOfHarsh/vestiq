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

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86_400_000).toISOString().slice(0, 10);
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FinnhubArticle {
  id: string;
  headline: string;
  summary: string;
  source: string;
  url: string;
  datetime: number;   // unix seconds
  ticker: string;
  image: string;
}

export interface AnalystRecommendation {
  period: string;
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
}

// ─── Ticker-specific news ────────────────────────────────────────────────────

export async function getTickerNews(ticker: string, days = 7): Promise<FinnhubArticle[]> {
  const cacheKey = `fhnews_${ticker}`;
  try {
    return await getCached(cacheKey, TTL.news, async () => {
      const from = daysAgo(days);
      const to   = new Date().toISOString().slice(0, 10);
      type Raw = Array<{ id: number; headline: string; summary: string; source: string; url: string; datetime: number; related: string; image: string }>;
      const data = await get<Raw>(fh('/company-news', { symbol: ticker, from, to }));
      return data.slice(0, 20).map(r => ({
        id:       String(r.id),
        headline: r.headline,
        summary:  r.summary,
        source:   r.source,
        url:      r.url,
        datetime: r.datetime,
        ticker,
        image:    r.image ?? '',
      }));
    });
  } catch {
    return await getStale<FinnhubArticle[]>(cacheKey) ?? [];
  }
}

// ─── General market news ─────────────────────────────────────────────────────

export async function getMarketNews(category: 'general' | 'forex' | 'crypto' | 'merger' = 'general'): Promise<FinnhubArticle[]> {
  const cacheKey = `fhmarketnews_${category}`;
  try {
    return await getCached(cacheKey, TTL.news, async () => {
      type Raw = Array<{ id: number; headline: string; summary: string; source: string; url: string; datetime: number; related: string; image: string }>;
      const data = await get<Raw>(fh('/news', { category }));
      return data.slice(0, 30).map(r => ({
        id:       String(r.id),
        headline: r.headline,
        summary:  r.summary,
        source:   r.source,
        url:      r.url,
        datetime: r.datetime,
        ticker:   r.related ?? '',
        image:    r.image ?? '',
      }));
    });
  } catch {
    return await getStale<FinnhubArticle[]>(cacheKey) ?? [];
  }
}

// ─── Generic quote (works for indices like ^VIX, stocks, ETFs) ───────────────

export interface FinnhubQuote {
  price: number;
  change: number;
  changePct: number;
  prevClose: number;
}

export async function getFHQuote(symbol: string): Promise<FinnhubQuote | null> {
  const cacheKey = `fhquote_${symbol}`;
  try {
    return await getCached(cacheKey, TTL.quote, async () => {
      type Raw = { c: number; d: number; dp: number; pc: number };
      const data = await get<Raw>(fh('/quote', { symbol }));
      if (!data.c) return null;
      return { price: data.c, change: data.d ?? 0, changePct: data.dp ?? 0, prevClose: data.pc ?? 0 };
    });
  } catch {
    return await getStale<FinnhubQuote>(cacheKey);
  }
}

// ─── Analyst recommendations ─────────────────────────────────────────────────

export async function getAnalystRecs(ticker: string): Promise<AnalystRecommendation[]> {
  const cacheKey = `fhrec_${ticker}`;
  try {
    return await getCached(cacheKey, TTL.earnings, async () => {
      type Raw = Array<{ period: string; strongBuy: number; buy: number; hold: number; sell: number; strongSell: number }>;
      const data = await get<Raw>(fh('/stock/recommendation', { symbol: ticker }));
      return data.slice(0, 4).map(r => ({
        period:     r.period,
        strongBuy:  r.strongBuy,
        buy:        r.buy,
        hold:       r.hold,
        sell:       r.sell,
        strongSell: r.strongSell,
      }));
    });
  } catch {
    return await getStale<AnalystRecommendation[]>(cacheKey) ?? [];
  }
}
