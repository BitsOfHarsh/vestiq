import { KEYS, TTL } from '../config';
import { getCached, getStale } from './cache';

const STABLE = 'https://financialmodelingprep.com/stable';
const KEY    = KEYS.fmp;

function fmp(path: string, params: Record<string, string> = {}): string {
  const q = new URLSearchParams({ ...params, apikey: KEY }).toString();
  return `${STABLE}${path}?${q}`;
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`FMP ${res.status}`);
  const json = await res.json() as unknown;
  // Stable endpoints return an error object (not HTTP error code) for restricted endpoints
  if (json && typeof json === 'object' && !Array.isArray(json) && ('Error Message' in (json as object) || 'error' in (json as object))) {
    throw new Error(String((json as Record<string, unknown>)['Error Message'] ?? (json as Record<string, unknown>)['error']));
  }
  return json as T;
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
      type Raw = Array<{ symbol: string; companyName: string; description: string; sector: string; industry: string; exchange: string; marketCap: number; price: number; beta: number; averageVolume: number; website: string; ceo: string; fullTimeEmployees: string | number; country: string; ipoDate: string }>;
      const data = await get<Raw>(fmp('/profile', { symbol: ticker }));
      if (!data[0]) return null;
      const r = data[0];
      return {
        ticker:      r.symbol,
        name:        r.companyName,
        description: r.description,
        sector:      r.sector,
        industry:    r.industry,
        exchange:    r.exchange,
        marketCap:   r.marketCap,
        price:       r.price,
        beta:        r.beta,
        volAvg:      r.averageVolume,
        website:     r.website,
        ceo:         r.ceo,
        employees:   parseInt(String(r.fullTimeEmployees ?? '0'), 10),
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
      type Raw = Array<{ symbol: string; price: number; change: number; changePercentage: number; dayHigh: number; dayLow: number; volume: number; marketCap: number; yearHigh: number; yearLow: number }>;
      const data = await get<Raw>(fmp('/quote', { symbol: ticker }));
      if (!data[0]) return null;
      const r = data[0];
      return {
        ticker,
        price:             r.price,
        change:            r.change,
        changePct:         r.changePercentage,
        dayHigh:           r.dayHigh,
        dayLow:            r.dayLow,
        volume:            r.volume,
        marketCap:         r.marketCap,
        pe:                0,
        eps:               0,
        high52:            r.yearHigh,
        low52:             r.yearLow,
        avgVolume:         0,
        sharesOutstanding: 0,
      };
    });
  } catch {
    return await getStale<FMPQuote>(cacheKey);
  }
}

// ─── Batch quotes — parallel single-symbol calls (stable has no batch endpoint) ──

export async function getBatchQuotes(tickers: string[]): Promise<Record<string, FMPQuote>> {
  if (!tickers.length) return {};
  const results = await Promise.allSettled(tickers.map(t => getQuote(t)));
  const out: Record<string, FMPQuote> = {};
  for (let i = 0; i < tickers.length; i++) {
    const r = results[i];
    if (r.status === 'fulfilled' && r.value) out[tickers[i]] = r.value;
  }
  return out;
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
      type Raw = Array<{ date: string; fiscalYear: string; period: string; revenue: number; netIncome: number; grossProfit: number; operatingIncome: number }>;
      const data = await get<Raw>(fmp('/income-statement', { symbol: ticker, period, limit: String(limit) }));
      return data.map(r => ({
        period:          period === 'annual' ? r.fiscalYear : `${r.fiscalYear} ${r.period}`,
        revenue:         r.revenue,
        netIncome:       r.netIncome,
        grossProfit:     r.grossProfit,
        operatingIncome: r.operatingIncome,
        netMargin:       r.revenue > 0 ? (r.netIncome / r.revenue) * 100 : 0,
        grossMargin:     r.revenue > 0 ? (r.grossProfit / r.revenue) * 100 : 0,
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
      type Raw = Array<{ date: string; epsEstimated: number; epsActual: number | null; revenueEstimated: number; revenueActual: number | null }>;
      const data = await get<Raw>(fmp('/earnings', { symbol: ticker, limit: String(limit) }));
      return data
        .filter(r => r.epsActual !== null)   // only past results with actuals
        .map(r => ({
          date:            r.date,
          period:          r.date,
          epsEstimate:     r.epsEstimated ?? 0,
          epsActual:       r.epsActual ?? 0,
          revenueEstimate: r.revenueEstimated ?? 0,
          revenueActual:   r.revenueActual ?? 0,
          beatEps:         (r.epsActual ?? 0) > (r.epsEstimated ?? 0),
          beatRevenue:     (r.revenueActual ?? 0) > (r.revenueEstimated ?? 0),
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
      type Raw = Array<{ date: string; epsAvg: number; epsLow: number; epsHigh: number; revenueAvg: number; revenueLow: number; revenueHigh: number }>;
      const data = await get<Raw>(fmp('/analyst-estimates', { symbol: ticker, period: 'annual', limit: '1' }));
      if (!data[0]) return null;
      const r = data[0];
      return {
        date:        r.date,
        epsAvg:      r.epsAvg,
        epsLow:      r.epsLow,
        epsHigh:     r.epsHigh,
        revenueAvg:  r.revenueAvg,
        revenueLow:  r.revenueLow,
        revenueHigh: r.revenueHigh,
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
      type Raw = Array<{ analystName: string; publishedDate: string; newsTitle: string; adjPriceTarget: number; newsPublisher: string }>;
      const data = await get<Raw>(fmp('/price-target', { symbol: ticker, limit: String(limit) }));
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
      const data = await get<InsiderRaw>(fmp('/insider-trading', { symbol: ticker, limit: String(limit) }));
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
      const data = await get<InsiderRaw>(fmp('/insider-trading', { limit: String(limit) }));
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
      type Raw = Array<{ symbol: string; date: string; epsEstimated: number; revenueEstimated: number }>;
      const data = await get<Raw>(fmp('/earnings-calendar', { from, to }));
      return data.map(r => ({
        ticker:          r.symbol,
        date:            r.date,
        time:            '' as '',
        epsEstimate:     r.epsEstimated,
        revenueEstimate: r.revenueEstimated,
      }));
    });
  } catch {
    return await getStale<UpcomingEarning[]>(cacheKey) ?? [];
  }
}

// ─── Economic calendar (restricted on free plan — returns empty gracefully) ───

export interface EconomicEvent {
  event: string;
  date: string;
  country: string;
  impact: 'Low' | 'Medium' | 'High';
  actual: number | null;
  estimate: number | null;
}

export async function getEconomicCalendar(_daysAhead = 14): Promise<EconomicEvent[]> {
  return await getStale<EconomicEvent[]>('ecocal') ?? [];
}
