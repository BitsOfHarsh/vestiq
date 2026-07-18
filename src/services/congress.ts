import { getCached, getStale } from './cache';

const HOUSE_URL  = 'https://housestockwatcher.com/api/transactions';
const SENATE_URL = 'https://senatestockwatcher.com/api/transactions';

// Cache for 4 hours — congressional disclosures lag by days anyway
const TTL_CONGRESS = 4;

export interface CongressTrade {
  representative: string;
  party: string;
  ticker: string;
  tradeDate: string;
  filingDate: string;
  type: 'Purchase' | 'Sale';
  amountLow: number;
  amountHigh: number;
  chamber: 'House' | 'Senate';
}

function parseAmount(raw: string): [number, number] {
  const nums = raw.replace(/[^0-9\-]/g, ' ').trim().split(/\s+/).filter(Boolean).map(Number);
  if (nums.length === 0) return [0, 0];
  if (nums.length === 1) return [nums[0], nums[0]];
  return [nums[0], nums[1]];
}

async function fetchHouse(): Promise<CongressTrade[]> {
  type HouseRaw = Array<{
    transaction_date: string;
    disclosure_date: string;
    owner?: string;
    ticker: string;
    type: string;
    amount: string;
    party?: string;
  }>;

  const res  = await fetch(HOUSE_URL, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`House ${res.status}`);
  const json = await res.json() as { data?: HouseRaw } | HouseRaw;
  const rows: HouseRaw = Array.isArray(json) ? json : ((json as { data?: HouseRaw }).data ?? []);

  return rows
    .filter(r => r.ticker && r.ticker !== 'N/A' && r.ticker.length <= 5)
    .map(r => {
      const [lo, hi] = parseAmount(r.amount ?? '');
      return {
        representative: r.owner ?? 'Unknown',
        party:          r.party ?? '',
        ticker:         r.ticker.toUpperCase(),
        tradeDate:      r.transaction_date,
        filingDate:     r.disclosure_date,
        type:           r.type?.toLowerCase().includes('sale') ? 'Sale' : 'Purchase',
        amountLow:      lo,
        amountHigh:     hi,
        chamber:        'House' as const,
      };
    });
}

async function fetchSenate(): Promise<CongressTrade[]> {
  type SenateRaw = Array<{
    transaction_date: string;
    date?: string;
    first_name?: string;
    last_name?: string;
    senator?: string;
    ticker: string;
    type: string;
    amount: string;
    party?: string;
  }>;

  const res  = await fetch(SENATE_URL, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`Senate ${res.status}`);
  const json = await res.json() as { data?: SenateRaw } | SenateRaw;
  const rows: SenateRaw = Array.isArray(json) ? json : ((json as { data?: SenateRaw }).data ?? []);

  return rows
    .filter(r => r.ticker && r.ticker !== 'N/A' && r.ticker.length <= 5)
    .map(r => {
      const name = r.senator ?? [r.first_name, r.last_name].filter(Boolean).join(' ') ?? 'Senator';
      const [lo, hi] = parseAmount(r.amount ?? '');
      return {
        representative: name,
        party:          r.party ?? '',
        ticker:         r.ticker.toUpperCase(),
        tradeDate:      r.transaction_date ?? r.date ?? '',
        filingDate:     r.date ?? r.transaction_date ?? '',
        type:           r.type?.toLowerCase().includes('sale') ? 'Sale' : 'Purchase',
        amountLow:      lo,
        amountHigh:     hi,
        chamber:        'Senate' as const,
      };
    });
}

// Returns most recent trades across both chambers, sorted by tradeDate descending
export async function getCongressTrades(ticker?: string, limit = 30): Promise<CongressTrade[]> {
  const cacheKey = `congress_${ticker ?? 'all'}`;
  try {
    return await getCached(cacheKey, TTL_CONGRESS, async () => {
      const [house, senate] = await Promise.allSettled([fetchHouse(), fetchSenate()]);
      const all: CongressTrade[] = [
        ...(house.status   === 'fulfilled' ? house.value   : []),
        ...(senate.status  === 'fulfilled' ? senate.value  : []),
      ];
      const filtered = ticker
        ? all.filter(t => t.ticker === ticker.toUpperCase())
        : all;
      return filtered
        .sort((a, b) => b.tradeDate.localeCompare(a.tradeDate))
        .slice(0, limit);
    });
  } catch {
    return await getStale<CongressTrade[]>(cacheKey) ?? [];
  }
}
