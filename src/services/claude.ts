import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIMessage, Holding, WatchlistItem, TradeIdea, DipScore, ActionItem } from './types';
import { APP_CONFIG } from '../config';
import * as claudeMock from './claudeMock';

const API_KEY = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY ?? '';
const API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-4-6';

// Debug: log key status on module load (first 8 chars only for safety)
console.log('[Claude] key loaded:', API_KEY ? `${API_KEY.slice(0, 8)}…` : 'EMPTY');

// ─── Base call ────────────────────────────────────────────────────────────────

async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  if (!API_KEY) {
    console.error('[Claude] EXPO_PUBLIC_ANTHROPIC_API_KEY is empty — did you restart the Expo server after adding the key?');
    throw new Error('Missing EXPO_PUBLIC_ANTHROPIC_API_KEY');
  }

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
    console.error(`[Claude] API error ${response.status}:`, body);
    throw new Error(`Claude API ${response.status}: ${body}`);
  }

  const data = await response.json() as { content: { text: string }[] };
  return data.content[0].text;
}

// Strips markdown code fences that Claude sometimes wraps JSON in
function extractJSON(raw: string): string {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) return fenced[1].trim();
  const start = raw.indexOf('{');
  const end   = raw.lastIndexOf('}');
  if (start !== -1 && end !== -1) return raw.slice(start, end + 1);
  return raw.trim();
}

// ─── Cache helpers ────────────────────────────────────────────────────────────

interface CacheEntry<T> { data: T; ts: number }

async function getCached<T>(key: string, ttlHours: number): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(`vc3_${key}`);
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
    await AsyncStorage.setItem(`vc3_${key}`, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    // Non-critical — response is still returned to caller
  }
}

// ─── 1. News → Trade idea ─────────────────────────────────────────────────────

export async function newsToTradeIdea(headline: string, ticker?: string, currentPrice?: number): Promise<TradeIdea> {
  if (APP_CONFIG.USE_MOCK_CLAUDE) return claudeMock.newsToTradeIdea(headline, ticker);

  const priceKey = currentPrice && currentPrice > 0 ? `_${Math.round(currentPrice)}` : '';
  const cacheKey = `trade3_${encodeURIComponent(headline).slice(0, 48)}${priceKey}`;
  const cached = await getCached<TradeIdea>(cacheKey, 6);
  if (cached) return cached;

  const priceNote = currentPrice && currentPrice > 0
    ? `\n- The stock is currently trading at $${currentPrice.toFixed(2)}. Entry and stop MUST be realistic price levels near this current price.`
    : '';

  const system = `You are Vestiq, a trading assistant for beginner investors. Pick ONE single best trade this news creates. Respond ONLY with valid JSON — no markdown, no extra text:
{"stocks":["PRIMARY_TICKER"],"direction":"bullish","confidence":"medium","reason":"2 clear sentences explaining why this news is a catalyst and what the trade thesis is","entry":"$X–$Y","stop":"$X","timeframe":"1–2 weeks"}
Rules:
- stocks: exactly ONE ticker — the single best trade, not a list
- entry: a clean price range like "$44–$46" anchored to the current stock price${priceNote}
- stop: a single price like "$41", placed at a logical support level below (bullish) or above (bearish) entry
- direction: bullish | bearish | neutral
- confidence: high | medium | speculative
- reason: explain WHY this news moves that one stock, 2 sentences max`;
  const user = `Headline: ${headline}\nPrimary ticker: ${ticker ?? 'unknown'}${currentPrice && currentPrice > 0 ? `\nCurrent price: $${currentPrice.toFixed(2)}` : ''}`;

  const raw = await callClaude(system, user);
  const result = JSON.parse(extractJSON(raw)) as TradeIdea;
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
  const result = JSON.parse(extractJSON(raw)) as DipScore;
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
  const result = JSON.parse(extractJSON(raw)) as PreMarketBrief;
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
  const result = JSON.parse(extractJSON(raw)) as EarningsIntel;
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
  const result = JSON.parse(extractJSON(raw)) as PortfolioHealth;
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
  const result = JSON.parse(extractJSON(raw)) as HeadToHead;
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
  const result = JSON.parse(extractJSON(raw)) as ValuationScore;
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

// ─── 9. Morning market brief (dashboard) ─────────────────────────────────────

export interface MorningBrief {
  headline: string;
  description: string;
  bullets: Array<{ text: string; sentiment: 'positive' | 'neutral' | 'negative' }>;
  valuationLabel: string;   // BARGAIN | FAIR | HIGH | EXTREME
  valuationValue: number;   // 0–100  (0 = bargain, 100 = extreme overvaluation)
}

export async function getMorningBrief(
  date: string,
  fearGreed: { value: number; label: string },
  markets: { spy: number; spyChg: number; vix: number; vixChg: number; btc: number; btcChg: number; tnx?: number; dxy?: number },
  headlines: string[],
  marketStatus: 'pre-market' | 'open' | 'closed' | 'after-hours' = 'closed',
): Promise<MorningBrief | null> {
  if (APP_CONFIG.USE_MOCK_CLAUDE) return null;

  const cacheKey = `brief2_${date}_${marketStatus}`;
  const cached = await getCached<MorningBrief>(cacheKey, 1);
  if (cached) return cached;

  const isOpen    = marketStatus === 'open';
  const isPreMkt  = marketStatus === 'pre-market';
  const timeCtx   = isOpen    ? 'The market is currently OPEN.'
                  : isPreMkt  ? 'The market is in PRE-MARKET. Reference last session\'s closes, not "today".'
                  :             'The market is CLOSED. Reference last session\'s numbers, not "today".';
  const sessionRef = isOpen ? 'today' : 'last session';

  const system = `You are the lead market analyst for Vestiq, a trading app for beginner retail investors.

Your job: write a sharp, scannable market brief that tells a beginner exactly what happened and what it means for their money — in plain English, zero jargon.

Rules:
- ${timeCtx} Never say a market "rose today" or "fell today" unless it is actually open right now.
- Write bullets like a smart friend texting you — short, punchy, specific. No filler phrases like "it's worth noting".
- Each bullet must convey ONE clear insight: a cause, an effect, or an action implication.
- The headline should capture the single dominant market narrative in 4–7 words.
- valuationValue 0 = deep bargain, 100 = extreme bubble. Use Fear & Greed + PE context to calibrate.
- Respond ONLY with valid JSON. No markdown, no explanation, no code fences.`;

  const marketData: Record<string, unknown> = {
    'S&P 500 (SPY)': { price: `$${markets.spy}`, changePct: `${markets.spyChg >= 0 ? '+' : ''}${markets.spyChg.toFixed(2)}%` },
    'VIX (Fear Index)': { value: markets.vix, changePct: `${markets.vixChg >= 0 ? '+' : ''}${markets.vixChg.toFixed(2)}%`, note: markets.vix > 25 ? 'elevated — investors are nervous' : markets.vix < 15 ? 'low — markets are calm' : 'moderate' },
    Bitcoin:         { price: `$${markets.btc.toLocaleString()}`, changePct: `${markets.btcChg >= 0 ? '+' : ''}${markets.btcChg.toFixed(2)}%` },
  };
  if (markets.tnx) marketData['10-Year Treasury Yield'] = { value: `${markets.tnx.toFixed(2)}%`, note: markets.tnx > 4.5 ? 'high — competes with stocks for investor money' : 'moderate' };
  if (markets.dxy) marketData['US Dollar (DXY)'] = { value: markets.dxy.toFixed(1) };

  const user = JSON.stringify({
    date,
    marketStatus,
    fearGreedIndex: { value: fearGreed.value, label: fearGreed.label, interpretation: fearGreed.value < 25 ? 'extreme fear — possible buying opportunity' : fearGreed.value > 75 ? 'extreme greed — markets may be overheated' : 'neutral zone' },
    marketData,
    topHeadlines: headlines.slice(0, 10),
    output: {
      headline:       `4–7 words capturing the ONE dominant story right now (e.g. "Tech Rallies as Fed Stays Patient")`,
      description:    `2–3 sentences. What happened ${sessionRef} and what's driving it. Write for someone who owns ETFs and growth stocks. Use "${sessionRef}" not "today" if market is closed.`,
      bullets:        `Exactly 5 objects: { text: string max 65 chars — one sharp insight each, use "${sessionRef}" not "today" if closed; sentiment: "positive"|"neutral"|"negative" }`,
      valuationLabel: 'BARGAIN | FAIR | HIGH | EXTREME — overall market valuation right now',
      valuationValue: '0–100 integer (0 = deep bargain, 100 = extreme bubble)',
    },
  });

  try {
    const raw = await callClaude(system, user);
    const result = JSON.parse(extractJSON(raw)) as MorningBrief;
    await setCache(cacheKey, result);
    return result;
  } catch (e) {
    console.error('[MorningBrief] failed:', e instanceof Error ? e.message : String(e));
    return null;
  }
}

// ─── 10. Skill runner (research screen) ──────────────────────────────────────

export async function runSkill(systemPrompt: string, userMessage: string): Promise<string> {
  return callClaude(systemPrompt, userMessage);
}

// ─── 11. Deep multi-agent analysis (Bull / Bear / Synthesis) ─────────────────

export interface DeepAnalysis {
  ticker: string;
  stance: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
  confidence: number;        // 0–100
  bullCase: string[];        // 3 concise bullet points
  bearCase: string[];        // 3 concise bullet points
  verdict: string;           // 2-sentence synthesis
  keyRisk: string;           // top downside risk
  keyOpportunity: string;    // top upside catalyst
}

export async function getDeepAnalysis(
  ticker: string,
  context: string,
): Promise<DeepAnalysis | null> {
  if (APP_CONFIG.USE_MOCK_CLAUDE) return null;

  const cacheKey = `deep_${ticker}_${new Date().toDateString()}`;
  const cached = await getCached<DeepAnalysis>(cacheKey, 6);
  if (cached) return cached;

  try {
    // Bull and Bear analysts run in parallel
    const [bullRaw, bearRaw] = await Promise.all([
      callClaude(
        'You are a bullish equity analyst. Make the strongest evidence-based case FOR buying this stock. Give exactly 3 concise bullet points (under 60 chars each). Respond in plain text only — no headers, no JSON.',
        `Stock: ${ticker}\n${context}`,
      ),
      callClaude(
        'You are a bearish equity analyst. Make the strongest case AGAINST buying this stock and highlight key risks. Give exactly 3 concise bullet points (under 60 chars each). Respond in plain text only — no headers, no JSON.',
        `Stock: ${ticker}\n${context}`,
      ),
    ]);

    // Research Manager synthesises into a structured verdict
    const synthesisSystem = `You are an objective investment research manager. You have bull and bear analyst reports for a stock. Synthesise them into a final verdict. Respond ONLY with valid JSON — no markdown, no explanation.`;
    const synthesisUser = `Stock: ${ticker}

BULL ANALYST:
${bullRaw}

BEAR ANALYST:
${bearRaw}

CONTEXT:
${context}

Respond with exactly this JSON shape:
{
  "stance": "Strong Buy|Buy|Hold|Sell|Strong Sell",
  "confidence": <number 0-100>,
  "bullCase": ["<point1>","<point2>","<point3>"],
  "bearCase": ["<point1>","<point2>","<point3>"],
  "verdict": "<2 sentence balanced synthesis>",
  "keyRisk": "<single biggest downside risk>",
  "keyOpportunity": "<single biggest upside catalyst>"
}`;

    const synthRaw = await callClaude(synthesisSystem, synthesisUser);
    const parsed = JSON.parse(synthRaw) as Omit<DeepAnalysis, 'ticker'>;
    const result: DeepAnalysis = { ticker, ...parsed };
    await setCache(cacheKey, result);
    return result;
  } catch {
    return null;
  }
}

// ─── 12. News analysis (Headlines detail screen) ─────────────────────────────

export interface NewsWatchStock {
  ticker: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  reason: string;
}

export interface NewsAnalysis {
  bullets: string[];              // 3 key facts from the article
  marketImpact: number;           // 0–100
  whatItMeansForYou: Array<{ bold: string; text: string }>;
  watchStocks: NewsWatchStock[];  // 2–3 related tickers with sentiment + reason
  digDeeper: string[];            // 3 follow-up questions the user might ask
}

const NEWS_SYSTEM = `You are a financial news analyst for beginner investors. Given a news headline and summary, produce a structured JSON response. Keep language simple and clear.

Respond ONLY with valid JSON. No markdown, no explanation, just the JSON object.

Required shape:
{
  "bullets": ["<fact1>", "<fact2>", "<fact3>"],
  "marketImpact": <number 0-100>,
  "whatItMeansForYou": [
    {"bold": "<Ticker (Company)>", "text": " <impact explanation>"},
    {"bold": "<Ticker (Company)>", "text": " <impact explanation>"}
  ],
  "watchStocks": [
    {"ticker": "<SYMBOL>", "sentiment": "bullish|bearish|neutral", "reason": "<1 sentence>"},
    {"ticker": "<SYMBOL>", "sentiment": "bullish|bearish|neutral", "reason": "<1 sentence>"}
  ],
  "digDeeper": ["<question1>", "<question2>", "<question3>"]
}

Rules:
- bullets: 3 factual bullet points, each under 20 words
- marketImpact: 0=no impact, 100=market-moving event
- whatItMeansForYou: 2–3 items; bold field = "TICKER (Company Name)", text starts with " " (space)
- watchStocks: 2–3 tickers most relevant to this news (include the primary ticker if known)
- digDeeper: 3 smart follow-up questions a beginner investor would want answered`;

export async function getNewsAnalysis(
  headline: string,
  summary: string,
  ticker: string,
): Promise<NewsAnalysis | null> {
  const cacheKey = `news_analysis_${headline.slice(0, 40).replace(/\W/g, '_')}`;
  const cached = await getCached<NewsAnalysis>(cacheKey, 6);
  if (cached) return cached;

  try {
    const userMsg = `Headline: ${headline}\nSummary: ${summary}\nPrimary ticker: ${ticker || 'unknown'}`;
    const raw = await callClaude(NEWS_SYSTEM, userMsg);
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean) as NewsAnalysis;
    await setCache(cacheKey, parsed);
    return parsed;
  } catch {
    return null;
  }
}

// ─── 13. News clustering (Headlines tab — 1 batch call) ──────────────────────

interface ClusterGroup { id: string; indices: number[] }

export async function clusterArticles(
  articles: Array<{ id: string; headline: string }>,
): Promise<ClusterGroup[]> {
  if (articles.length < 2) return articles.map((_, i) => ({ id: `c${i}`, indices: [i] }));

  const cacheKey = `clusters_${articles.slice(0, 8).map(a => a.id).join('_').slice(0, 60)}_${new Date().toDateString()}`;
  const cached = await getCached<ClusterGroup[]>(cacheKey, 2);
  if (cached) return cached;

  const system = `Group these numbered news headlines by story. Headlines about the same specific event go in one cluster. Return ONLY valid JSON — no markdown, no explanation.
Format: {"clusters":[{"id":"c0","indices":[0,5,12]},{"id":"c1","indices":[1]}]}
Rules: every index must appear in exactly one cluster; only group headlines about the identical event (not just same topic); most articles will be singleton clusters.`;

  const user = articles.map((a, i) => `${i}: ${a.headline}`).join('\n');

  try {
    const raw = await callClaude(system, user);
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean) as { clusters: ClusterGroup[] };
    const result = parsed.clusters;
    await setCache(cacheKey, result);
    return result;
  } catch {
    return articles.map((_, i) => ({ id: `c${i}`, indices: [i] }));
  }
}

// ─── Company about blurb ──────────────────────────────────────────────────────

export async function getCompanyAbout(ticker: string, name: string, sector: string): Promise<string> {
  const cacheKey = `about_${ticker}`;
  try {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) return cached;
    const raw = await callClaude(
      'You are a financial data assistant. Respond ONLY with valid JSON. No markdown, no explanation, just the JSON object.',
      `Write a 2-sentence factual description of ${name} (ticker: ${ticker}, sector: ${sector}). Focus on what the company does and its market position. Return JSON: {"about":"<2 sentences>"}`
    );
    const clean = raw.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean) as { about: string };
    await AsyncStorage.setItem(cacheKey, parsed.about);
    return parsed.about;
  } catch {
    return '';
  }
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
