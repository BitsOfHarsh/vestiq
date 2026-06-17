import { WatchlistItem, DipScore, PriceAlert, Holding } from '../services/types';

// ─── Formatting ───────────────────────────────────────────────────────────────

export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1_000_000_000_000) return `$${(value / 1_000_000_000_000).toFixed(2)}T`;
    if (Math.abs(value) >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(2)}B`;
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(2)}M`;
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(1)}K`;
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);
}

export function formatPercent(value: number, decimals = 2): string {
  const sign = value >= 0 ? '+' : '';
  return `${sign}${value.toFixed(decimals)}%`;
}

export function formatVolume(volume: number): string {
  if (volume >= 1_000_000) return `${(volume / 1_000_000).toFixed(1)}M`;
  if (volume >= 1_000) return `${(volume / 1_000).toFixed(0)}K`;
  return String(volume);
}

export function timeAgo(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

// ─── Dip score ────────────────────────────────────────────────────────────────

export function calculateDipScore(stock: WatchlistItem): DipScore {
  const offHigh = ((stock.high52 - stock.price) / stock.high52) * 100;
  const upside = ((stock.analystTarget - stock.price) / stock.price) * 100;
  const atSupport = stock.price <= stock.support * 1.03;
  const aboveTarget = stock.price > stock.analystTarget;

  let score = 0;

  if (offHigh >= 30) score += 22;
  else if (offHigh >= 20) score += 16;
  else if (offHigh >= 10) score += 10;
  else if (offHigh >= 5) score += 5;

  if (upside >= 40) score += 20;
  else if (upside >= 25) score += 15;
  else if (upside >= 10) score += 10;
  else if (upside > 0) score += 5;
  else score -= 10;

  if (stock.buyPct >= 90) score += 18;
  else if (stock.buyPct >= 75) score += 13;
  else if (stock.buyPct >= 60) score += 8;
  else score -= 5;

  if (stock.fwdPE <= 20) score += 15;
  else if (stock.fwdPE <= 30) score += 10;
  else if (stock.fwdPE <= 50) score += 6;
  else if (stock.fwdPE > 80) score -= 5;

  if (atSupport) score += 10;
  if (aboveTarget) score -= 12;

  score = Math.max(0, Math.min(100, Math.round(score)));

  const entry = +(stock.support * 1.01).toFixed(2);
  const stop = +(stock.support * 0.98).toFixed(2);
  const t1 = +(entry + stock.atr * 2).toFixed(2);
  const t2 = stock.analystTarget;
  const rr = +((t2 - entry) / (entry - stop)).toFixed(1);

  let verdict: DipScore['verdict'];
  if (aboveTarget && stock.buyPct < 50) verdict = 'avoid';
  else if (score >= 65) verdict = 'buy';
  else if (score >= 50) verdict = 'watch';
  else if (score >= 35) verdict = 'wait';
  else verdict = 'avoid';

  const signals: string[] = [];
  if (offHigh >= 20) signals.push(`${offHigh.toFixed(0)}% off high`);
  if (atSupport) signals.push('At support');
  if (upside >= 20) signals.push(`+${upside.toFixed(0)}% analyst upside`);
  if (stock.buyPct >= 85) signals.push(`${stock.buyPct}% analyst Buy`);
  if (aboveTarget) signals.push('Above analyst target');
  if (stock.fwdPE > 80) signals.push(`${stock.fwdPE}x PE — expensive`);

  return { ticker: stock.ticker, score, verdict, entry, stop, t1, t2, rr, signals, offHigh: +offHigh.toFixed(1) };
}

// ─── Alert levels ─────────────────────────────────────────────────────────────

export function calculateAlertLevels(stock: WatchlistItem): PriceAlert[] {
  const entry = +(stock.support * 1.01).toFixed(2);
  const stop = +(stock.support * 0.98).toFixed(2);
  const t1 = +(entry + stock.atr * 2).toFixed(2);
  const t2 = stock.analystTarget;

  return [
    { id: `${stock.ticker}_stop`, ticker: stock.ticker, name: stock.name, type: 'stop', price: stop, condition: 'below', active: false, note: 'Below S1 support' },
    { id: `${stock.ticker}_entry`, ticker: stock.ticker, name: stock.name, type: 'entry', price: entry, condition: 'below', active: true, note: '1% above support' },
    { id: `${stock.ticker}_t1`, ticker: stock.ticker, name: stock.name, type: 't1', price: t1, condition: 'above', active: false, note: 'ATR × 2 from entry' },
    { id: `${stock.ticker}_t2`, ticker: stock.ticker, name: stock.name, type: 't2', price: t2, condition: 'above', active: false, note: 'Analyst consensus' },
  ];
}

// ─── Portfolio stats ──────────────────────────────────────────────────────────

export function calculatePortfolioStats(holdings: Holding[]) {
  const totalValue = holdings.reduce((sum, h) => sum + h.currentPrice * h.shares, 0);
  const totalCost = holdings.reduce((sum, h) => sum + h.avgCost * h.shares, 0);
  const lifetimePnL = totalValue - totalCost;
  const lifetimePnLPct = totalCost > 0 ? (lifetimePnL / totalCost) * 100 : 0;
  return { totalValue, totalCost, lifetimePnL, lifetimePnLPct };
}

// ─── Price distance ───────────────────────────────────────────────────────────

export function priceDistance(
  currentPrice: number,
  targetLevel: number,
): { pct: number; direction: 'above' | 'below'; label: string; urgency: 'close' | 'near' | 'far' } {
  const pct = ((targetLevel - currentPrice) / currentPrice) * 100;
  const absPct = Math.abs(pct);
  const direction: 'above' | 'below' = pct > 0 ? 'below' : 'above';
  const urgency: 'close' | 'near' | 'far' = absPct <= 2 ? 'close' : absPct <= 5 ? 'near' : 'far';
  const label = `${pct > 0 ? '↓' : '↑'} ${absPct.toFixed(1)}%`;
  return { pct: +absPct.toFixed(1), direction, label, urgency };
}
