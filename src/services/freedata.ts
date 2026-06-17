import { TTL } from '../config';
import { getCached, getStale } from './cache';

// ─── Fear & Greed (alternative.me) ───────────────────────────────────────────

export interface FearGreedData {
  value: number;               // 0–100
  label: string;               // "Extreme Fear" | "Fear" | "Neutral" | "Greed" | "Extreme Greed"
  previousClose: number;
  previousWeek: number;
  previousMonth: number;
  updatedAt: string;
}

export async function getFearGreed(): Promise<FearGreedData> {
  const cacheKey = 'fear_greed';
  try {
    return await getCached(cacheKey, TTL.fearGreed, async () => {
      type Raw = { data: Array<{ value: string; value_classification: string; timestamp: string }> };
      const res  = await fetch('https://api.alternative.me/fng/?limit=30');
      if (!res.ok) throw new Error(`FNG ${res.status}`);
      const json = await res.json() as Raw;
      const pts  = json.data;
      return {
        value:         parseInt(pts[0].value, 10),
        label:         pts[0].value_classification,
        previousClose: parseInt(pts[1]?.value ?? pts[0].value, 10),
        previousWeek:  parseInt(pts[6]?.value ?? pts[0].value, 10),
        previousMonth: parseInt(pts[29]?.value ?? pts[0].value, 10),
        updatedAt:     new Date(parseInt(pts[0].timestamp, 10) * 1000).toISOString(),
      };
    });
  } catch {
    const stale = await getStale<FearGreedData>(cacheKey);
    return stale ?? { value: 50, label: 'Neutral', previousClose: 50, previousWeek: 50, previousMonth: 50, updatedAt: '' };
  }
}

// ─── Reddit trending (apewisdom.io) ──────────────────────────────────────────

export interface RedditRank {
  ticker: string;
  rank: number;
  mentions: number;
  mentionsPrev: number;       // 24h ago
  rankPrev: number;           // 24h ago
  rankChange: number;         // positive = moved up
  sentiment: number | null;   // 0–1 if provided
}

export async function getRedditTrending(page = 1): Promise<RedditRank[]> {
  const cacheKey = `reddit_trending_${page}`;
  try {
    return await getCached(cacheKey, TTL.reddit, async () => {
      type Raw = {
        results: Array<{
          ticker: string;
          rank: number;
          mentions: number;
          mentions_24h_ago: number;
          rank_24h_ago: number;
          sentiment: number | null;
        }>;
      };
      const res  = await fetch(`https://apewisdom.io/api/v1.0/filter/all-stocks/page/${page}`);
      if (!res.ok) throw new Error(`Apewisdom ${res.status}`);
      const json = await res.json() as Raw;
      return (json.results ?? []).map(r => ({
        ticker:       r.ticker,
        rank:         r.rank,
        mentions:     r.mentions,
        mentionsPrev: r.mentions_24h_ago,
        rankPrev:     r.rank_24h_ago,
        rankChange:   r.rank_24h_ago - r.rank,  // positive = improved rank
        sentiment:    r.sentiment,
      }));
    });
  } catch {
    return await getStale<RedditRank[]>(cacheKey) ?? [];
  }
}
