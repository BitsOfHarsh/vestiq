export interface Stock {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap?: number;
  volume?: number;
  pe?: number;
  eps?: number;
  high52w?: number;
  low52w?: number;
}

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export interface NewsArticle {
  id: string;
  title: string;
  summary: string;
  source: string;
  publishedAt: string;
  url: string;
  tickers?: string[];
  sentiment?: 'positive' | 'negative' | 'neutral';
}

export interface Holding {
  ticker: string;
  name: string;
  shares: number;
  avgCost: number;
  currentPrice: number;
  analystTarget: number;
  support: number;
  atr: number;
  sector: string;
  source: 'manual' | 'indmoney';
}

export interface WatchlistItem {
  ticker: string;
  name: string;
  price: number;
  high52: number;
  low52: number;
  analystTarget: number;
  fwdPE: number;
  buyPct: number;
  support: number;
  resist: number;
  atr: number;
  sector: string;
}

export interface DipScore {
  ticker: string;
  score: number;
  verdict: 'buy' | 'watch' | 'wait' | 'avoid';
  entry: number;
  stop: number;
  t1: number;
  t2: number;
  rr: number;
  signals: string[];
  offHigh: number;
}

export interface PriceAlert {
  id: string;
  ticker: string;
  name: string;
  type: 'entry' | 'stop' | 't1' | 't2';
  price: number;
  condition: 'below' | 'above';
  active: boolean;
  note: string;
  rr?: number;
}

export interface Catalyst {
  date: string;
  ticker: string;
  event: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
}

export interface NewsItem {
  id: string;
  time: string;
  headline: string;
  summary: string;
  ticker?: string;
  tickerName?: string;
  tickerPrice?: number;
  tickerChange?: number;
  country: string;
  url: string;
}

export interface TradeIdea {
  stocks: string[];
  direction: 'bullish' | 'bearish' | 'neutral';
  entry: string;
  stop: string;
  confidence: 'high' | 'medium' | 'speculative';
  reason: string;
  timeframe: string;
}

export interface ActionItem {
  ticker: string;
  action: 'buy' | 'hold' | 'trim' | 'watch';
  reason: string;
  urgency: 'today' | 'this week' | 'monitor';
}
