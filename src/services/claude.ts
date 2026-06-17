import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIMessage, Holding, WatchlistItem, TradeIdea, DipScore, ActionItem } from './types';
import { APP_CONFIG } from '../config';
import * as claudeMock from './claudeMock';

const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

// ─── Base call ────────────────────────────────────────────────────────────────

async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  if (!API_KEY) throw new Error('Missing EXPO_PUBLIC_ANTHROPIC_API_KEY');

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Claude API ${response.status}: ${body}`);
  }

  const data = await response.json() as { content: { text: string }[] };
  return data.content[0].text;
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

interface CacheEntry<T> { data: T; ts: number }

async function getCached<T>(key: string, ttlHours: number): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`vc_${key}`);
    if (!raw) return null;
    const entry = JSON.parse(raw) as CacheEntry<T>;
    if (Date.now() - entry.ts > ttlHours * 3_600_000) return null;
    return entry.data;
  } catch {
    return null;
  }
}

async function setCache(key: string, data: unknown): Promise<void> {
  try {
    await AsyncStorage.setItem(`vc_${key}`, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // Non-critical — response is still returned to caller
  }
}

// ─── 1. News → Trade idea ─────────────────────────────────────────────────────

export async function newsToTradeIdea(headline: string, ticker?: string): Promise<TradeIdea> {
  if (APP_CONFIG.USE_MOCK_CLAUDE) return claudeMock.newsToTradeIdea(headline, ticker);

  const cacheKey = `trade_${encodeURIComponent(headline).slice(0, 48)}`;
  const cached = await getCached<TradeIdea>(cacheKey, 6);
  if (cached) return cached;

  const system = `You are Vestiq, an AI trading assistant. Analyse this news headline and identify the trading opportunity. Be concise and practical for beginner investors. Respond ONLY with valid JSON — no markdown, no explanation.`;
  const user = `Headline: ${headline}\nAffected ticker (if known): ${ticker ?? 'unknown'}`;

  const raw = await callClaude(system, user);
  const result = JSON.parse(raw) as TradeIdea;
  await setCache(cacheKey, result);
  return result;
}

// ─── 2. Dip analysis ─────────────────────────────────────────────────────────

export async function getDipAnalysis(stock: WatchlistItem): Promise<DipScore> {
  if (APP_CONFIG.USE_MOCK_CLAUDE) return claudeMock.getDipAnalysis(stock.ticker);

  const cacheKey = `dip_${stock.ticker}_${new Date().toDateString()}`;
  const cached = await getCached<DipScore>(cacheKey, 6);
  if (cached) return cached;

  const system = `You are Vestiq. Score this stock's dip quality from 0-100. Respond ONLY with valid JSON.`;
  const offHigh = stock.high52 > 0 ? ((stock.high52 - stock.price) / stock.high52) * 100 : 0;
  const upside = stock.analystTarget > 0 ? ((stock.analystTarget - stock.price) / stock.price) * 100 : 0;

  const user = JSON.stringify({
    ticker: stock.ticker, name: stock.name, price: stock.price,
    high52: stock.high52, low52: stock.low52,
    offHighPct: offHigh.toFixed(1), analystUpsidePct: upside.toFixed(1),
    buyPct: stock.buyPct, fwdPE: stock.fwdPE, support: stock.support,
    resist: stock.resist, atr: stock.atr, sector: stock.sector,
  });

  const raw = await callClaude(system, user);
  const result = JSON.parse(raw) as DipScore;
  await setCache(cacheKey, result);
  return result;
}

// ─── 3. Pre-market brief ──────────────────────────────────────────────────────

interface PreMarketBrief {
  buy: ActionItem[];
  hold: ActionItem[];
  trim: ActionItem[];
  watch: ActionItem[];
  topTrade: TradeIdea;
  marketMood: string;
}

export async function getPreMarketBrief(
  holdings: Holding[],
  watchlist: WatchlistItem[],
  date: string,
): Promise<PreMarketBrief> {
  if (APP_CONFIG.USE_MOCK_CLAUDE) return claudeMock.getPreMarketBrief() as unknown as Promise<PreMarketBrief>;

  const cacheKey = `premarket_${date}`;
  const cached = await getCached<PreMarketBrief>(cacheKey, 24);
  if (cached) return cached;

  const system = `You are Vestiq's morning analyst. Review this portfolio and watchlist. Provide a concise pre-market strategy. Respond ONLY with valid JSON.`;
  const user = JSON.stringify({ date, holdings, watchlist });

  const raw = await callClaude(system, user);
  const result = JSON.parse(raw) as PreMarketBrief;
  await setCache(cacheKey, result);
  return result;
}

// ─── 4. Earnings intelligence ─────────────────────────────────────────────────

interface EarningsIntel {
  summary: string;
  redFlags: string[];
  greenFlags: string[];
  verdict: string;
  shortTermView: string;
  longTermView: string;
}

export async function getEarningsIntel(
  ticker: string,
  mode: 'pre' | 'post',
  context: string,
): Promise<EarningsIntel> {
  const cacheKey = `earnings_${ticker}_${mode}_${new Date().toDateString()}`;
  const cached = await getCached<EarningsIntel>(cacheKey, 6);
  if (cached) return cached;

  const system = `You are Vestiq's earnings analyst. ${mode === 'pre' ? 'Preview upcoming earnings and what to watch.' : 'Analyse reported earnings and what they mean for the stock.'} Respond ONLY with valid JSON.`;
  const user = `Ticker: ${ticker}\nMode: ${mode}\nContext:\n${context}`;

  const raw = await callClaude(system, user);
  const result = JSON.parse(raw) as EarningsIntel;
  await setCache(cacheKey, result);
  return result;
}

// ─── 5. Portfolio health ──────────────────────────────────────────────────────

interface PortfolioHealth {
  score: number;
  concentrationRisk: string;
  clusters: string[];
  gaps: string[];
  actionItems: string[];
}

export async function getPortfolioHealth(holdings: Holding[]): Promise<PortfolioHealth> {
  if (APP_CONFIG.USE_MOCK_CLAUDE) return claudeMock.getPortfolioHealth();

  const cacheKey = `health_${holdings.map((h) => h.ticker).sort().join('_')}_${new Date().toDateString()}`;
  const cached = await getCached<PortfolioHealth>(cacheKey, 6);
  if (cached) return cached;

  const system = `You are Vestiq's portfolio doctor. Analyse diversification and risk. Give a health score 0-100 and specific suggestions. Respond ONLY with valid JSON.`;
  const user = JSON.stringify(
    holdings.map((h) => ({ ticker: h.ticker, sector: h.sector, value: h.shares * h.currentPrice, source: h.source })),
  );

  const raw = await callClaude(system, user);
  const result = JSON.parse(raw) as PortfolioHealth;
  await setCache(cacheKey, result);
  return result;
}

// ─── 6. Head-to-head ─────────────────────────────────────────────────────────

interface HeadToHead {
  winner: string;
  reasoning: string;
  buyFirst: string;
  summary: string;
}

export async function getHeadToHead(
  tickerA: string,
  tickerB: string,
  dataA: WatchlistItem,
  dataB: WatchlistItem,
): Promise<HeadToHead> {
  if (APP_CONFIG.USE_MOCK_CLAUDE) return claudeMock.getHeadToHead(tickerA, tickerB);

  const tickers = [tickerA, tickerB].sort().join('_');
  const cacheKey = `h2h_${tickers}_${new Date().toDateString()}`;
  const cached = await getCached<HeadToHead>(cacheKey, 6);
  if (cached) return cached;

  const system = `You are Vestiq. Compare two stocks and declare a winner. Respond ONLY with valid JSON.`;
  const user = JSON.stringify({ stockA: dataA, stockB: dataB });

  const raw = await callClaude(system, user);
  const result = JSON.parse(raw) as HeadToHead;
  await setCache(cacheKey, result);
  return result;
}

// ─── 7. Valuation score ───────────────────────────────────────────────────────

interface ValuationScore {
  bucket: 'undervalued' | 'fairly valued' | 'overvalued';
  score: number;
  reasoning: string;
}

export async function getValuationScore(
  ticker: string,
  fwdPE: number,
  peg: number,
  priceVsTarget: number,
): Promise<ValuationScore> {
  const cacheKey = `val_${ticker}_${new Date().toDateString()}`;
  const cached = await getCached<ValuationScore>(cacheKey, 6);
  if (cached) return cached;

  const system = `You are Vestiq's valuation engine. Classify the stock and give a valuation score 0-100 (higher = better value). Respond ONLY with valid JSON.`;
  const user = JSON.stringify({ ticker, fwdPE, peg, priceVsTargetPct: priceVsTarget });

  const raw = await callClaude(system, user);
  const result = JSON.parse(raw) as ValuationScore;
  await setCache(cacheKey, result);
  return result;
}

// ─── 8. Portfolio chat (plain text) ──────────────────────────────────────────

export async function getPortfolioAnalysis(holdings: Holding[], question: string): Promise<string> {
  if (APP_CONFIG.USE_MOCK_CLAUDE) return claudeMock.getPortfolioAnalysis(question);

  const system = `You are Vestiq, a friendly AI investing co-pilot for beginners. Answer questions about this portfolio clearly and concisely. Avoid jargon.`;
  const user = `Portfolio:\n${JSON.stringify(holdings, null, 2)}\n\nQuestion: ${question}`;
  return callClaude(system, user);
}

// ─── Legacy chat (Research screen) ───────────────────────────────────────────

const CHAT_SYSTEM = `You are Vestiq, a friendly AI investment assistant for beginner investors. Explain concepts simply, avoid jargon, and always note this is educational — not financial advice.`;

export async function sendMessage(messages: AIMessage[], userMessage: string): Promise<string> {
  if (APP_CONFIG.USE_MOCK_CLAUDE) return claudeMock.sendMessage(messages, userMessage);
  if (!API_KEY) return 'Please add your Anthropic API key to the .env file to enable AI features.';

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      system: CHAT_SYSTEM,
      messages: [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user' as const, content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Claude API ${response.status}: ${body}`);
  }

  const data = await response.json() as { content: { text: string }[] };
  return data.content[0].text;
}
