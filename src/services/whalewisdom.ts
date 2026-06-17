import { KEYS, TTL } from '../config';
import { getCached, getStale } from './cache';

const BASE = 'https://whalewisdom.com/api';
const KEY  = KEYS.whalewisdom;

function ww(path: string, params: Record<string, string> = {}): string {
  const q = new URLSearchParams({ ...params, api_key: KEY }).toString();
  return `${BASE}${path}?${q}`;
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: { 'X-Api-Key': KEY } });
  if (!res.ok) throw new Error(`WhaleWisdom ${res.status}`);
  return res.json() as Promise<T>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InstitutionalHolder {
  filerName: string;
  shares: number;
  value: number;           // USD
  pctPortfolio: number;
  pctChange: number;       // quarter-over-quarter change
  filingDate: string;
  action: 'New' | 'Added' | 'Reduced' | 'Sold';
}

export interface FilerHolding {
  ticker: string;
  name: string;
  shares: number;
  value: number;
  pctPortfolio: number;
  quarterChange: number;
  action: 'New' | 'Added' | 'Reduced' | 'Sold';
  filingDate: string;
}

export interface CongressTrade {
  representative: string;
  party: string;
  ticker: string;
  tradeDate: string;
  filingDate: string;
  type: 'Purchase' | 'Sale';
  amountLow: number;
  amountHigh: number;
}

// ─── Institutional holders for a stock ───────────────────────────────────────

export async function getHolders(ticker: string, limit = 20): Promise<InstitutionalHolder[]> {
  const cacheKey = `ww_holders_${ticker}`;
  try {
    return await getCached(cacheKey, TTL.institutional, async () => {
      type Raw = {
        current_quarter_holdings?: Array<{
          source_name: string;
          current_shares: number;
          current_value: number;
          percent_of_portfolio: number;
          percent_change: number;
          filing_date: string;
          action: string;
        }>;
      };
      const data = await get<Raw>(ww(`/stock/${ticker}/holders`, { limit: String(limit) }));
      return (data.current_quarter_holdings ?? []).map(r => ({
        filerName:    r.source_name,
        shares:       r.current_shares,
        value:        r.current_value,
        pctPortfolio: r.percent_of_portfolio,
        pctChange:    r.percent_change,
        filingDate:   r.filing_date,
        action:       (r.action ?? 'Added') as InstitutionalHolder['action'],
      }));
    });
  } catch {
    return await getStale<InstitutionalHolder[]>(cacheKey) ?? [];
  }
}

// ─── Specific filer's portfolio (super investor) ──────────────────────────────

export async function getFilerPortfolio(filerName: string, limit = 30): Promise<FilerHolding[]> {
  const cacheKey = `ww_filer_${filerName.replace(/\s/g, '_')}`;
  try {
    return await getCached(cacheKey, TTL.institutional, async () => {
      type Raw = {
        holdings?: Array<{
          ticker: string;
          security_name: string;
          current_shares: number;
          current_value: number;
          percent_of_portfolio: number;
          quarter_change: number;
          action: string;
          filing_date: string;
        }>;
      };
      const data = await get<Raw>(ww(`/filer/search`, { q: filerName, limit: String(limit) }));
      return (data.holdings ?? []).map(r => ({
        ticker:        r.ticker,
        name:          r.security_name,
        shares:        r.current_shares,
        value:         r.current_value,
        pctPortfolio:  r.percent_of_portfolio,
        quarterChange: r.quarter_change,
        action:        (r.action ?? 'Added') as FilerHolding['action'],
        filingDate:    r.filing_date,
      }));
    });
  } catch {
    return await getStale<FilerHolding[]>(cacheKey) ?? [];
  }
}

// ─── Congressional trades ─────────────────────────────────────────────────────

export async function getCongressTrades(ticker?: string, limit = 30): Promise<CongressTrade[]> {
  const cacheKey = `ww_congress_${ticker ?? 'all'}`;
  try {
    return await getCached(cacheKey, TTL.congressional, async () => {
      const params: Record<string, string> = { limit: String(limit) };
      if (ticker) params.ticker = ticker;

      type Raw = {
        trades?: Array<{
          representative_name: string;
          party: string;
          ticker: string;
          transaction_date: string;
          filed_date: string;
          type: string;
          amount: string;
        }>;
      };
      const data = await get<Raw>(ww('/congressional-trading', params));
      return (data.trades ?? []).map(r => {
        const parts = (r.amount ?? '').split(' - ');
        const low  = parseInt(parts[0]?.replace(/\D/g, '') ?? '0', 10);
        const high = parseInt(parts[1]?.replace(/\D/g, '') ?? String(low), 10);
        return {
          representative: r.representative_name,
          party:          r.party ?? '',
          ticker:         r.ticker,
          tradeDate:      r.transaction_date,
          filingDate:     r.filed_date,
          type:           r.type?.includes('Sale') ? 'Sale' : 'Purchase',
          amountLow:      low,
          amountHigh:     high,
        };
      });
    });
  } catch {
    return await getStale<CongressTrade[]>(cacheKey) ?? [];
  }
}
