import { TradeIdea, DipScore } from './types';
import { MOCK_TRADE_IDEAS, MOCK_DIP_SCORES } from '../mock';
import { APP_CONFIG } from '../config';

function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

// ─── 1. News → Trade idea ─────────────────────────────────────────────────────

export async function newsToTradeIdea(headline: string, ticker?: string): Promise<TradeIdea> {
  await delay(APP_CONFIG.MOCK_DELAY);
  if (ticker && MOCK_TRADE_IDEAS[ticker]) return MOCK_TRADE_IDEAS[ticker];
  // Fallback: scan all trade ideas for matching stocks
  const match = Object.values(MOCK_TRADE_IDEAS).find((idea) =>
    idea.stocks.some((s) => headline.includes(s))
  );
  return match ?? {
    stocks: ticker ? [ticker] : ['UNKNOWN'],
    direction: 'neutral',
    entry: 'No clear entry identified — monitor price action',
    stop: 'N/A',
    confidence: 'speculative',
    reason: 'Insufficient data to form a clear trade thesis from this headline.',
    timeframe: 'Monitor for more information',
  };
}

// ─── 2. Pre-market brief ──────────────────────────────────────────────────────

export async function getPreMarketBrief() {
  await delay(APP_CONFIG.MOCK_DELAY * 2);
  return {
    marketMood: 'Cautiously optimistic — 3 buying opportunities in your watchlist',
    actions: [
      { ticker: 'META', action: 'buy' as const,   reason: 'Entry zone hit at $558, R/R 4.9x, 46% analyst upside',       urgency: 'today' as const },
      { ticker: 'MSFT', action: 'buy' as const,   reason: '30% below 52wk high, 94% analyst Buy, 43% upside to $561',   urgency: 'today' as const },
      { ticker: 'NBIS', action: 'hold' as const,  reason: 'NDX inclusion Jun 22 — passive buying tailwind all week',     urgency: 'this week' as const },
      { ticker: 'MU',   action: 'watch' as const, reason: 'Earnings Jun 24 — 20% implied move, do not buy before',       urgency: 'monitor' as const },
    ],
    topTrade: {
      ticker: 'META',
      idea: 'Buy META at $558–$570 entry zone',
      stop: '$539',
      target: '$700 (T1) → $829 (analyst target)',
      rr: '4.9x',
      reason: 'Cheapest large-cap AI stock by forward PE (17.3x), down 29% from high, ex-dividend today.',
    },
  };
}

// ─── 3. Dip analysis ─────────────────────────────────────────────────────────

export async function getDipAnalysis(ticker: string): Promise<DipScore> {
  await delay(APP_CONFIG.MOCK_DELAY);
  return MOCK_DIP_SCORES[ticker] ?? {
    ticker, score: 50, verdict: 'watch' as const,
    entry: 0, stop: 0, t1: 0, t2: 0, rr: 0, offHigh: 0,
    signals: ['Insufficient data — add to watchlist for analysis'],
  };
}

// ─── 4. Portfolio health ──────────────────────────────────────────────────────

export async function getPortfolioHealth() {
  await delay(APP_CONFIG.MOCK_DELAY);
  return {
    score: 58,
    concentrationRisk: 'High — 67% in AI Infrastructure',
    clusters: [
      'AI Infrastructure (APLD, IREN, NBIS, CRWV) — 67% of portfolio',
      'All 4 positions correlated to NVDA ecosystem',
    ],
    gaps: [
      'No defensive positions (healthcare, consumer staples)',
      'No large-cap diversification (MSFT, META, GOOGL)',
      'Heavy pre-revenue / high-volatility names',
    ],
    actionItems: [
      'Add META or MSFT to reduce concentration risk',
      'Consider trimming one AI infra position if up >50%',
      'Target <50% in any single sector',
    ],
  };
}

// ─── 5. Head-to-head ─────────────────────────────────────────────────────────

export async function getHeadToHead(tickerA: string, tickerB: string) {
  await delay(APP_CONFIG.MOCK_DELAY * 1.5);
  return {
    winner: tickerA,
    reasoning: `${tickerA} wins on valuation and analyst conviction. Better risk/reward at current prices.`,
    buyFirst: tickerA,
    summary: `Both are strong businesses. ${tickerA} has better near-term risk/reward while ${tickerB} offers stronger long-term growth potential.`,
    metrics: [
      { label: 'Forward PE',      a: '17.3x', b: '20.1x', winner: tickerA },
      { label: 'Analyst upside',  a: '+46%',  b: '+43%',  winner: tickerA },
      { label: 'Buy rating',      a: '88%',   b: '94%',   winner: tickerB },
    ],
  };
}

// ─── 6. Portfolio analysis (freeform chat) ───────────────────────────────────

export async function getPortfolioAnalysis(_question: string): Promise<string> {
  await delay(APP_CONFIG.MOCK_DELAY * 2);
  return `Based on your portfolio, here's what I see: Your holdings are heavily concentrated in AI infrastructure — Applied Digital, IREN, Nebius, and CoreWeave all depend on the same AI buildout thesis. That's a high-conviction bet that's paying off, but it means one bad NVIDIA headline could affect all four at once.\n\nFor today, the biggest opportunity is adding META or MSFT to diversify while both are at attractive valuations. If you're asking about your existing positions, NBIS has the most immediate catalyst — the Nasdaq-100 inclusion on Jun 22 creates guaranteed passive buying this week.`;
}

// ─── 7. Research chat (multi-turn) ───────────────────────────────────────────

export async function sendMessage(_messages: unknown[], userMessage: string): Promise<string> {
  await delay(APP_CONFIG.MOCK_DELAY * 1.5);
  return `I can help you with that. "${userMessage}" — this is a mock response while Claude API is not connected. Add your EXPO_PUBLIC_ANTHROPIC_API_KEY to enable live AI responses. The full skill library is ready once the key is set.`;
}
