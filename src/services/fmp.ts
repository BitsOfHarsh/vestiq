import { KEYS, TTL } from '../config';
import { getCached, getStale } from './cache';

const BASE = 'https://financialmodelingprep.com/api';
const KEY  = KEYS.fmp;

function fmp(path: string, params: Record<string, string> = {}): string {
  const q = new URLSearchParams({ ...params, apikey: KEY }).toString();
  return `${BASE}${path}?${q}`;
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FMP ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── Company profile ──────────────────────────────────────────────────────────

export interface CompanyProfile {
  ticker: string;
  name: string;
  description: string;
  sector: string;
  industry: string;
  exchange: string;
  marketCap: number;
  price: number;
  beta: number;
  volAvg: number;
  website: string;
  ceo: string;
  employees: number;
  country: string;
  ipoDate: string;
}

export async function getProfile(ticker: string): Promise<CompanyProfile | null> {
  const cacheKey = `profile_${ticker}`;
  try {
    return await getCached(cacheKey, TTL.profile, async () => {
      type Raw = Array<{ symbol: string; companyName: string; description: string; sector: string; industry: string; exchangeShortName: string; mktCap: number; price: number; beta: number; volAvg: number; website: string; ceo: string; fullTimeEmployees: string; country: string; ipoDate: string }>;
      const data = await get<Raw>(fmp(`/v3/profile/${ticker}`));
      if (!data[0]) return null;
      const r = data[0];
      return {
        ticker:      r.symbol,
        name:        r.companyName,
        description: r.description,
        sector:      r.sector,
        industry:    r.industry,
        exchange:    r.exchangeShortName,
        marketCap:   r.mktCap,
        price:       r.price,
        beta:        r.beta,
        volAvg:      r.volAvg,
        website:     r.website,
        ceo:         r.ceo,
        employees:   parseInt(r.fullTimeEmployees ?? '0', 10),
        country:     r.country,
        ipoDate:     r.ipoDate,
      };
    });
  } catch {
    return await getStale<CompanyProfile>(cacheKey);
  }
}

// ─── Real-time quote ──────────────────────────────────────────────────────────

export interface FMPQuote {
  ticker: string;
  price: number;
  change: number;
  changePct: number;
  dayHigh: number;
  dayLow: number;
  volume: number;
  marketCap: number;
  pe: number;
  eps: number;
  high52: number;
  low52: number;
  avgVolume: number;
  sharesOutstanding: number;
}

export async function getQuote(ticker: string): Promise<FMPQuote | null> {
  const cacheKey = `fmpq_${ticker}`;
  try {
    return await getCached(cacheKey, TTL.quote, async () => {
      type Raw = Array<{ symbol: string; price: number; change: number; changesPercentage: number; dayHigh: number; dayLow: number; volume: number; marketCap: number; pe: number; eps: number; yearHigh: number; yearLow: number; avgVolume: number; sharesOutstanding: number }>;
      const data = await get<Raw>(fmp(`/v3/quote/${ticker}`));
      if (!data[0]) return null;
      const r = data[0];
      return {
        ticker, price: r.price, change: r.change, changePct: r.changesPercentage,
        dayHigh: r.dayHigh, dayLow: r.dayLow, volume: r.volume,
        marketCap: r.marketCap, pe: r.pe, eps: r.eps,
        high52: r.yearHigh, low52: r.yearLow,
        avgVolume: r.avgVolume, sharesOutstanding: r.sharesOutstanding,
      };
    });
  } catch {
    return await getStale<FMPQuote>(cacheKey);
  }
}

// ─── Batch quotes (headlines, watchlist) ─────────────────────────────────────

export async function getBatchQuotes(tickers: string[]): Promise<Record<string, FMPQuote>> {
  if (!tickers.length) return {};
  const sorted = [...tickers].sort();
  const cacheKey = `fmpbatch_${sorted.join('_')}`;
  try {
    return await getCached(cacheKey, TTL.quote, async () => {
      type Raw = Array<{ symbol: string; price: number; change: number; changesPercentage: number; dayHigh: number; dayLow: number; volume: number; marketCap: number; pe: number; eps: number; yearHigh: number; yearLow: number; avgVolume: number; sharesOutstanding: number }>;
      const data = await get<Raw>(fmp(`/v3/quote/${sorted.join(',')}`));
      const result: Record<string, FMPQuote> = {};
      for (const r of data) {
        if (!r.symbol || !r.price) continue;
        result[r.symbol] = {
          ticker: r.symbol, price: r.price, change: r.change, changePct: r.changesPercentage,
          dayHigh: r.dayHigh, dayLow: r.dayLow, volume: r.volume,
          marketCap: r.marketCap, pe: r.pe, eps: r.eps,
          high52: r.yearHigh, low52: r.yearLow,
          avgVolume: r.avgVolume, sharesOutstanding: r.sharesOutstanding,
        };
      }
      return result;
    });
  } catch {
    return await getStale<Record<string, FMPQuote>>(cacheKey) ?? {};
  }
}

// ─── Income statement ─────────────────────────────────────────────────────────

export interface IncomePeriodData {
  period: string;
  revenue: number;
  netIncome: number;
  grossProfit: number;
  operatingIncome: number;
  netMargin: number;
  grossMargin: number;
}

export async function getIncomeStatement(ticker: string, period: 'annual' | 'quarter' = 'annual', limit = 8): Promise<IncomePeriodData[]> {
  const cacheKey = `income_${ticker}_${period}`;
  try {
    return await getCached(cacheKey, TTL.earnings, async () => {
      type Raw = Array<{ date: string; calendarYear: string; period: string; revenue: number; netIncome: number; grossProfit: number; operatingIncome: number; netIncomeRatio: number; grossProfitRatio: number }>;
      const data = await get<Raw>(fmp(`/v3/income-statement/${ticker}`, { period, limit: String(limit) }));
      return data.map(r => ({
        period:          period === 'annual' ? r.calendarYear : `${r.calendarYear} ${r.period}`,
        revenue:         r.revenue,
        netIncome:       r.netIncome,
        grossProfit:     r.grossProfit,
        operatingIncome: r.operatingIncome,
        netMargin:       r.netIncomeRatio * 100,
        grossMargin:     r.grossProfitRatio * 100,
      }));
    });
  } catch {
    return await getStale<IncomePeriodData[]>(cacheKey) ?? [];
  }
}

// ─── Earnings history ─────────────────────────────────────────────────────────

export interface EarningsResult {
  date: string;
  period: string;
  epsEstimate: number;
  epsActual: number;
  revenueEstimate: number;
  revenueActual: number;
  beatEps: boolean;
  beatRevenue: boolean;
}

export async function getEarningsHistory(ticker: string, limit = 8): Promise<EarningsResult[]> {
  const cacheKey = `earnings_${ticker}`;
  try {
    return await getCached(cacheKey, TTL.earnings, async () => {
      type Raw = Array<{ date: string; fiscalDateEnding: string; estimatedEPS: number; actualEarningResult: number; estimatedRevenue?: number; actualRevenue?: number }>;
      const data = await get<Raw>(fmp(`/v3/historical/earning_calendar/${ticker}`, { limit: String(limit) }));
      return data.map(r => ({
        date:             r.date,
        period:           r.fiscalDateEnding,
        epsEstimate:      r.estimatedEPS ?? 0,
        epsActual:        r.actualEarningResult ?? 0,
        revenueEstimate:  r.estimatedRevenue ?? 0,
        revenueActual:    r.actualRevenue ?? 0,
        beatEps:          (r.actualEarningResult ?? 0) > (r.estimatedEPS ?? 0),
        beatRevenue:      (r.actualRevenue ?? 0) > (r.estimatedRevenue ?? 0),
      }));
    });
  } catch {
    return await getStale<EarningsResult[]>(cacheKey) ?? [];
  }
}

// ─── Upcoming earnings estimate ───────────────────────────────────────────────

export interface EarningsEstimate {
  date: string;
  epsLow: number;
  epsHigh: number;
  epsAvg: number;
  revenueLow: number;
  revenueHigh: number;
  revenueAvg: number;
}

export async function getEarningsEstimate(ticker: string): Promise<EarningsEstimate | null> {
  const cacheKey = `est_${ticker}`;
  try {
    return await getCached(cacheKey, TTL.earnings, async () => {
      type Raw = Array<{ date: string; estimatedEpsAvg: number; estimatedEpsLow: number; estimatedEpsHigh: number; estimatedRevenueAvg: number; estimatedRevenueLow: number; estimatedRevenueHigh: number }>;
      const data = await get<Raw>(fmp(`/v3/analyst-estimates/${ticker}`, { limit: '1' }));
      if (!data[0]) return null;
      const r = data[0];
      return {
        date:         r.date,
        epsAvg:       r.estimatedEpsAvg,
        epsLow:       r.estimatedEpsLow,
        epsHigh:      r.estimatedEpsHigh,
        revenueAvg:   r.estimatedRevenueAvg,
        revenueLow:   r.estimatedRevenueLow,
        revenueHigh:  r.estimatedRevenueHigh,
      };
    });
  } catch {
    return await getStale<EarningsEstimate>(cacheKey);
  }
}

// ─── Analyst price targets ────────────────────────────────────────────────────

export interface PriceTarget {
  analyst: string;
  firm: string;
  target: number;
  date: string;
  action: string;
}

export async function getPriceTargets(ticker: string, limit = 10): Promise<PriceTarget[]> {
  const cacheKey = `pt_${ticker}`;
  try {
    return await getCached(cacheKey, TTL.earnings, async () => {
      type Raw = Array<{ analystName: string; publishedDate: string; newsTitle: string; adjPriceTarget: number; priceWhen: number; newsPublisher: string }>;
      const data = await get<Raw>(fmp(`/v4/price-target`, { symbol: ticker, limit: String(limit) }));
      return data.map(r => ({
        analyst: r.analystName,
        firm:    r.newsPublisher,
        target:  r.adjPriceTarget,
        date:    r.publishedDate,
        action:  r.newsTitle,
      }));
    });
  } catch {
    return await getStale<PriceTarget[]>(cacheKey) ?? [];
  }
}

// ─── Insider trades ───────────────────────────────────────────────────────────

export interface InsiderTrade {
  name: string;
  title: string;
  type: 'Buy' | 'Sell';
  shares: number;
  value: number;
  price: number;
  date: string;
  filingDate: string;
}

export interface RecentInsiderTrade extends InsiderTrade {
  ticker: string;
}

type InsiderRaw = Array<{ symbol: string; reportingName: string; typeOfOwner: string; transactionType: string; securitiesTransacted: number; price: number; filingDate: string; transactionDate: string }>;

function mapInsiderRaw(r: InsiderRaw[number]): RecentInsiderTrade {
  return {
    ticker:     r.symbol,
    name:       r.reportingName,
    title:      r.typeOfOwner,
    type:       r.transactionType?.includes('Sale') ? 'Sell' : 'Buy',
    shares:     Math.abs(r.securitiesTransacted),
    value:      Math.abs(r.securitiesTransacted) * (r.price || 0),
    price:      r.price || 0,
    date:       r.transactionDate,
    filingDate: r.filingDate,
  };
}

export async function getInsiderTrades(ticker: string, limit = 20): Promise<InsiderTrade[]> {
  const cacheKey = `insider_${ticker}`;
  try {
    return await getCached(cacheKey, TTL.insiderTrades, async () => {
      const data = await get<InsiderRaw>(fmp(`/v4/insider-trading`, { symbol: ticker, limit: String(limit) }));
      return data.map(r => {
        const { ticker: _t, ...rest } = mapInsiderRaw({ ...r, symbol: ticker });
        return rest;
      });
    });
  } catch {
    return await getStale<InsiderTrade[]>(cacheKey) ?? [];
  }
}

export async function getRecentInsiderTrades(limit = 40): Promise<RecentInsiderTrade[]> {
  const cacheKey = 'insider_recent';
  try {
    return await getCached(cacheKey, TTL.insiderTrades, async () => {
      const data = await get<InsiderRaw>(fmp(`/v4/insider-trading`, { limit: String(limit) }));
      return data.map(mapInsiderRaw);
    });
  } catch {
    return await getStale<RecentInsiderTrade[]>(cacheKey) ?? [];
  }
}

// ─── Earnings calendar (upcoming, date range) ─────────────────────────────────

export interface UpcomingEarning {
  ticker: string;
  date: string;
  time: 'bmo' | 'amc' | 'dmh' | '';
  epsEstimate: number;
  revenueEstimate: number;
}

export async function getEarningsCalendar(daysAhead = 14): Promise<UpcomingEarning[]> {
  const from = new Date().toISOString().slice(0, 10);
  const to   = new Date(Date.now() + daysAhead * 86_400_000).toISOString().slice(0, 10);
  const cacheKey = `ecal_${from}`;
  try {
    return await getCached(cacheKey, TTL.calendar, async () => {
      type Raw = Array<{ symbol: string; date: string; time: string; epsEstimated: number; revenueEstimated: number }>;
      const data = await get<Raw>(fmp(`/v3/earning_calendar`, { from, to }));
      return data.map(r => ({
        ticker:          r.symbol,
        date:            r.date,
        time:            (r.time ?? '') as 'bmo' | 'amc' | 'dmh' | '',
        epsEstimate:     r.epsEstimated,
        revenueEstimate: r.revenueEstimated,
      }));
    });
  } catch {
    return await getStale<UpcomingEarning[]>(cacheKey) ?? [];
  }
}

// ─── Economic calendar ────────────────────────────────────────────────────────

export interface EconomicEvent {
  event: string;
  date: string;
  country: string;
  impact: 'Low' | 'Medium' | 'High';
  actual: number | null;
  estimate: number | null;
}

export async function getEconomicCalendar(daysAhead = 14): Promise<EconomicEvent[]> {
  const from = new Date().toISOString().slice(0, 10);
  const to   = new Date(Date.now() + daysAhead * 86_400_000).toISOString().slice(0, 10);
  const cacheKey = `ecocal_${from}`;
  try {
    return await getCached(cacheKey, TTL.calendar, async () => {
      type Raw = Array<{ event: string; date: string; country: string; impact: string; actual: number | null; estimate: number | null }>;
      const data = await get<Raw>(fmp(`/v3/economic_calendar`, { from, to }));
      return data.map(r => ({
        event:    r.event,
        date:     r.date,
        country:  r.country,
        impact:   (r.impact ?? 'Low') as 'Low' | 'Medium' | 'High',
        actual:   r.actual,
        estimate: r.estimate,
      }));
    });
  } catch {
    return await getStale<EconomicEvent[]>(cacheKey) ?? [];
  }
}
