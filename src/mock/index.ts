import { Holding, WatchlistItem, PriceAlert, TradeIdea, DipScore, ActionItem } from '../services/types';

// ─── Market status ────────────────────────────────────────────────────────────

export const MOCK_MARKET = {
  status: 'pre-market' as const,
  spFutures: +0.4,
  spFuturesLabel: '+0.4%',
  date: 'Mon, Jun 16',
  lastUpdated: '8:47 AM',
};

// ─── Morning brief ────────────────────────────────────────────────────────────

export const MOCK_MORNING_BRIEF = {
  generatedAt: '9:00 AM',
  marketMood: 'Cautiously optimistic — 3 buying opportunities in your watchlist',
  actions: [
    { ticker: 'META', action: 'buy' as const,   reason: 'Entry zone hit, R/R 4.9x, 46% analyst upside', urgency: 'today' as const },
    { ticker: 'NBIS', action: 'hold' as const,  reason: 'NDX inclusion Jun 22 — let the passive buying run', urgency: 'this week' as const },
    { ticker: 'MU',   action: 'watch' as const, reason: 'Earnings Jun 24 — high binary risk, 20% implied move', urgency: 'monitor' as const },
    { ticker: 'MRVL', action: 'watch' as const, reason: 'Wait for S&P 500 inclusion dip after Jun 22', urgency: 'monitor' as const },
  ] satisfies ActionItem[],
};

// ─── Watchlist ────────────────────────────────────────────────────────────────

export const MOCK_WATCHLIST: WatchlistItem[] = [
  {
    ticker: 'META',  name: 'Meta Platforms',
    price: 566.98,   high52: 796.25, low52: 520,
    analystTarget: 829,  fwdPE: 17.3, buyPct: 88,
    support: 540, resist: 700, atr: 14, sector: 'Software',
  },
  {
    ticker: 'MSFT',  name: 'Microsoft',
    price: 390.74,   high52: 555.45, low52: 356,
    analystTarget: 561,  fwdPE: 20.1, buyPct: 94,
    support: 385, resist: 450, atr: 8, sector: 'Software',
  },
  {
    ticker: 'NVDA',  name: 'NVIDIA',
    price: 205.19,   high52: 236.54, low52: 140,
    analystTarget: 298,  fwdPE: 25,   buyPct: 92,
    support: 195, resist: 236, atr: 6, sector: 'Semis',
  },
  {
    ticker: 'NBIS',  name: 'Nebius Group',
    price: 232.36,   high52: 278.84, low52: 180,
    analystTarget: 260,  fwdPE: 999,  buyPct: 80,
    support: 220, resist: 279, atr: 10, sector: 'AI Infra',
  },
  {
    ticker: 'MRVL',  name: 'Marvell Technology',
    price: 279.70,   high52: 324,    low52: 61,
    analystTarget: 233,  fwdPE: 66,   buyPct: 62,
    support: 260, resist: 305, atr: 9, sector: 'Semis',
  },
  {
    ticker: 'WDC',   name: 'Western Digital',
    price: 562.92,   high52: 603,    low52: 55,
    analystTarget: 685,  fwdPE: 18,   buyPct: 78,
    support: 530, resist: 603, atr: 15, sector: 'Memory',
  },
  {
    ticker: 'ANET',  name: 'Arista Networks',
    price: 163.24,   high52: 179.80, low52: 85.58,
    analystTarget: 188.75, fwdPE: 40, buyPct: 72,
    support: 155, resist: 179, atr: 6, sector: 'Networking',
  },
  {
    ticker: 'TER',   name: 'Teradyne',
    price: 403.20,   high52: 422,    low52: 83,
    analystTarget: 374.82, fwdPE: 40, buyPct: 72,
    support: 381, resist: 422, atr: 12, sector: 'Semis',
  },
];

// ─── Portfolio holdings ───────────────────────────────────────────────────────

export const MOCK_HOLDINGS: Holding[] = [
  {
    ticker: 'APLD', name: 'Applied Digital',
    shares: 2.03, avgCost: 4.43, currentPrice: 42.70,
    analystTarget: 71, support: 38, atr: 2.5,
    sector: 'AI Infra', source: 'indmoney',
  },
  {
    ticker: 'IREN', name: 'IREN Ltd',
    shares: 2.70, avgCost: 5.81, currentPrice: 64.12,
    analystTarget: 81, support: 58, atr: 3,
    sector: 'AI Infra', source: 'indmoney',
  },
  {
    ticker: 'NBIS', name: 'Nebius Group',
    shares: 0.86, avgCost: 40.93, currentPrice: 232.36,
    analystTarget: 260, support: 220, atr: 10,
    sector: 'AI Infra', source: 'indmoney',
  },
  {
    ticker: 'CRWV', name: 'CoreWeave',
    shares: 1.45, avgCost: 97.97, currentPrice: 142.50,
    analystTarget: 180, support: 130, atr: 8,
    sector: 'AI Infra', source: 'indmoney',
  },
];

// ─── Pre-calculated dip scores ────────────────────────────────────────────────

export const MOCK_DIP_SCORES: Record<string, DipScore> = {
  META: {
    ticker: 'META', score: 82, verdict: 'buy',
    entry: 545.40, stop: 529.20, t1: 573.40, t2: 829, rr: 4.9, offHigh: 28.8,
    signals: ['28.8% off high', '+46% analyst upside', '88% analyst Buy', '17x fwd PE — cheap'],
  },
  MSFT: {
    ticker: 'MSFT', score: 79, verdict: 'buy',
    entry: 388.85, stop: 377.30, t1: 404.85, t2: 561, rr: 7.7, offHigh: 29.6,
    signals: ['29.6% off high', '+43% analyst upside', '94% analyst Buy', '20x fwd PE'],
  },
  NVDA: {
    ticker: 'NVDA', score: 71, verdict: 'buy',
    entry: 196.95, stop: 191.10, t1: 208.95, t2: 298, rr: 4.9, offHigh: 13.2,
    signals: ['+31% analyst upside', '92% analyst Buy', '25x fwd PE'],
  },
  NBIS: {
    ticker: 'NBIS', score: 64, verdict: 'watch',
    entry: 222.20, stop: 215.60, t1: 242.20, t2: 260, rr: 1.5, offHigh: 16.7,
    signals: ['NDX inclusion Jun 22', '684% revenue growth'],
  },
  MRVL: {
    ticker: 'MRVL', score: 48, verdict: 'wait',
    entry: 262.60, stop: 254.80, t1: 280.60, t2: 233, rr: -3.7, offHigh: 13.7,
    signals: ['20% above analyst target', '66x fwd PE'],
  },
  WDC: {
    ticker: 'WDC', score: 67, verdict: 'buy',
    entry: 535.30, stop: 519.40, t1: 565.30, t2: 685, rr: 4.2, offHigh: 6.6,
    signals: ['+22% analyst upside', 'Memory supercycle', '18x fwd PE — cheap'],
  },
  ANET: {
    ticker: 'ANET', score: 59, verdict: 'watch',
    entry: 156.55, stop: 151.90, t1: 168.55, t2: 188.75, rr: 2.8, offHigh: 9.2,
    signals: ['35% revenue growth', 'AI networking leader'],
  },
  TER: {
    ticker: 'TER', score: 41, verdict: 'wait',
    entry: 384.81, stop: 373.38, t1: 408.81, t2: 374.82, rr: -0.9, offHigh: 4.5,
    signals: ['ARK sold $76.6M', '7.6% above analyst target'],
  },
};

// ─── Alerts ───────────────────────────────────────────────────────────────────

export const MOCK_ALERTS: PriceAlert[] = [
  { id: 'META_entry', ticker: 'META', name: 'Meta Platforms', type: 'entry', price: 545.40, condition: 'below', active: true,  note: '1% above support', rr: 4.9 },
  { id: 'META_stop',  ticker: 'META', name: 'Meta Platforms', type: 'stop',  price: 529.20, condition: 'below', active: true,  note: 'Below S1 support' },
  { id: 'META_t1',    ticker: 'META', name: 'Meta Platforms', type: 't1',    price: 573.40, condition: 'above', active: false, note: 'ATR × 2 from entry' },
  { id: 'META_t2',    ticker: 'META', name: 'Meta Platforms', type: 't2',    price: 829,    condition: 'above', active: false, note: 'Analyst consensus' },
  { id: 'MSFT_entry', ticker: 'MSFT', name: 'Microsoft',      type: 'entry', price: 388.85, condition: 'below', active: true,  note: '1% above support', rr: 7.7 },
  { id: 'MSFT_stop',  ticker: 'MSFT', name: 'Microsoft',      type: 'stop',  price: 377.30, condition: 'below', active: false, note: 'Below S2 support' },
  { id: 'NVDA_entry', ticker: 'NVDA', name: 'NVIDIA',          type: 'entry', price: 196.95, condition: 'below', active: true,  note: 'Limit order zone', rr: 4.9 },
  { id: 'NVDA_stop',  ticker: 'NVDA', name: 'NVIDIA',          type: 'stop',  price: 191.10, condition: 'below', active: true,  note: 'Below S2' },
];

// ─── Catalysts ────────────────────────────────────────────────────────────────

export interface MockCatalyst {
  date: string;
  tickers: string[];
  event: string;
  impact: 'high' | 'medium' | 'low';
  description: string;
}

export const MOCK_CATALYSTS: MockCatalyst[] = [
  {
    date: 'Jun 22', tickers: ['NBIS', 'CRWV', 'RKLB', 'TER'],
    event: 'Nasdaq-100 inclusion', impact: 'high',
    description: 'Passive funds must buy before open. $800B+ in QQQ/QQQM.',
  },
  {
    date: 'Jun 23', tickers: ['AMZN'],
    event: 'Prime Day starts', impact: 'medium',
    description: 'Two-day sales event — AMZN sentiment catalyst.',
  },
  {
    date: 'Jun 24', tickers: ['MU'],
    event: 'Earnings after close ⚠️', impact: 'high',
    description: '20% implied move. 932% EPS growth expected. High binary risk.',
  },
  {
    date: 'Jun 25', tickers: ['WDC', 'STX', 'SNDK'],
    event: 'Post-MU reaction', impact: 'medium',
    description: 'Memory sector moves: buy WDC dip if MU beats.',
  },
];

// ─── Headlines ────────────────────────────────────────────────────────────────

export interface HeadlineWatchStock {
  ticker: string;
  name: string;
  sentiment: 'bullish' | 'bearish' | 'neutral';
  price: number;
  change: number;
  description: string;
}

export interface HeadlineDetail {
  publishedAgo: string;
  sourcesCount: number;
  bullets: string[];
  marketImpact: number; // 0–100
  whatItMeansForYou: { bold: string; text: string }[];
  watchStocks: HeadlineWatchStock[];
  fullBreakdown: {
    whatIsHappening: string;
    whatDoesMean: string;
    whyShouldICare: string;
    bullCase: string;
    bearCase: string;
    whatToWatch: string;
  };
}

export interface SourceArticle {
  url: string;
  headline: string;
  source: string;   // human-readable publisher name e.g. "Yahoo Finance"
  domain: string;   // domain for favicon e.g. "finance.yahoo.com"
}

export interface Headline {
  id: string;
  time: string;
  date: 'today' | 'yesterday';
  country: string;
  headline: string;
  summary: string;
  ticker: string;
  tickerName: string;
  tickerPrice: number;
  tickerChange: number;
  url?: string;
  source?: string;
  logoUrl?: string;
  detail?: HeadlineDetail;
  sourceCount?: number;
  clusterArticles?: SourceArticle[];
}

export const MOCK_HEADLINES: Headline[] = [
  {
    id: '1', time: '19:30', date: 'today', country: 'United States',
    headline: "Apple's Siri AI Finally Works, Easing Two-Year AI Crisis",
    summary: "Apple unveiled Siri AI at WWDC 2026, a fully rebuilt assistant with natural language, context awareness, and on-device processing.",
    ticker: 'GOOGL', tickerName: 'Alphabet Inc.', tickerPrice: 359.68, tickerChange: +0.53,
    detail: {
      publishedAgo: '44 mins ago', sourcesCount: 18,
      bullets: [
        "Apple's rebuilt Siri uses on-device LLM processing with no cloud dependency for most queries",
        'WWDC demo showed Siri booking flights, editing photos, and summarising apps end-to-end',
        'Google Search and Assistant face direct competition — analysts see 3–5% search share at risk',
      ],
      marketImpact: 72,
      whatItMeansForYou: [
        { bold: 'GOOGL under pressure', text: ' as Siri AI directly threatens Google Search market share on 1.5B iPhones.' },
        { bold: 'AAPL likely to rally', text: ' — this was the missing AI feature dragging sentiment. Expect a relief pop.' },
        { bold: 'Short-term trade', text: ': fade GOOGL strength and add AAPL on any dip below $220.' },
      ],
      watchStocks: [
        { ticker: 'AAPL', name: 'Apple Inc.', sentiment: 'bullish', price: 218.54, change: +2.31, description: 'Siri AI is the catalyst the stock needed. Expect re-rating as AI narrative shifts back to Apple.' },
        { ticker: 'GOOGL', name: 'Alphabet Inc.', sentiment: 'bearish', price: 359.68, change: +0.53, description: 'Siri on 1.5B devices is an existential challenge to Google Search. Watch for ad revenue guidance cuts.' },
        { ticker: 'MSFT', name: 'Microsoft', sentiment: 'neutral', price: 390.74, change: -0.12, description: 'Copilot competes with Siri but Microsoft is more enterprise-focused — limited direct impact.' },
      ],
      fullBreakdown: {
        whatIsHappening: "Apple unveiled a ground-up rebuild of Siri at WWDC 2026, powered by a new on-device LLM that handles complex, multi-step requests without sending data to Apple's servers. The new Siri can book flights, summarise conversations, and control third-party apps through a new AI Actions API.",
        whatDoesMean: "Siri AI is Apple's answer to ChatGPT and Google Gemini. Unlike cloud-based assistants, it runs mostly on-device, making it faster and more private. The AI Actions API means any developer can plug their app into Siri — creating a new ecosystem layer Apple controls.",
        whyShouldICare: "If you own AAPL, this removes the single biggest concern that held the stock back since 2023. If you own GOOGL, this is a direct threat — Siri at scale could meaningfully reduce how often iPhone users open Google Search.",
        bullCase: "Apple executes on Siri AI, developers adopt the Actions API rapidly, and AAPL re-rates toward $250 as AI narrative normalises. Google Search share erosion stays below 2%, limiting GOOGL downside.",
        bearCase: "Siri AI launches with bugs and limited developer adoption — recall the original Siri hype cycle. AAPL pops then fades. GOOGL proves resilient as most searches happen on Android anyway.",
        whatToWatch: "Watch AAPL's opening price on Monday — a gap above $220 signals real momentum. For GOOGL, watch the next earnings call for any commentary on Search query volume or AI Overview engagement.",
      },
    },
  },
  {
    id: '2', time: '19:16', date: 'today', country: 'United States',
    headline: 'EU Commission Assessing Anthropic AI Access Cut After US Order',
    summary: 'US government ordered Anthropic to block non-citizens from its Fable 5 and Mythos 5 AI models, prompting EU review.',
    ticker: 'ASML', tickerName: 'ASML Holding N.V.', tickerPrice: 1863.55, tickerChange: -1.89,
    detail: {
      publishedAgo: '58 mins ago', sourcesCount: 11,
      bullets: [
        'US executive order restricts non-US persons from accessing Anthropic Fable 5 and Mythos 5 frontier models',
        'EU Commission opened a formal review citing digital sovereignty concerns',
        'UK and Canada issued diplomatic protests; tech firms urge carve-outs for allied nations',
      ],
      marketImpact: 45,
      whatItMeansForYou: [
        { bold: 'ASML and chip equipment', text: ' face indirect pressure — if AI restrictions escalate, European AI investment could slow.' },
        { bold: 'Watch MSFT and GOOG', text: ': both license US frontier models to EU clients. New restrictions could hit their cloud AI revenue.' },
        { bold: 'Regulatory risk is rising', text: ' — avoid adding to AI positions until the EU review outcome is clearer.' },
      ],
      watchStocks: [
        { ticker: 'ASML', name: 'ASML Holding N.V.', sentiment: 'bearish', price: 1863.55, change: -1.89, description: 'If EU retaliates with chip equipment restrictions, ASML\'s export licence framework becomes uncertain.' },
        { ticker: 'MSFT', name: 'Microsoft', sentiment: 'bearish', price: 390.74, change: -0.12, description: 'Azure OpenAI customers in EU could face restrictions. Potential €2B+ revenue exposure.' },
      ],
      fullBreakdown: {
        whatIsHappening: "The US government issued an executive order requiring Anthropic to block access to its two most powerful AI models — Fable 5 and Mythos 5 — for users who are not US citizens or permanent residents. This affects millions of users in Europe, Asia, and Latin America.",
        whatDoesMean: "Frontier AI models are increasingly being treated like military technology — subject to export controls. This could set a precedent where access to cutting-edge AI becomes dependent on citizenship, fragmenting the global AI market.",
        whyShouldICare: "If you hold tech stocks with significant EU revenue — MSFT, GOOG, AMZN — this adds regulatory risk. A prolonged EU-US AI dispute could reduce cloud AI adoption in the EU, one of the largest enterprise markets.",
        bullCase: "US and EU reach a 'trusted partner' framework within 90 days, carving out allied nations. Markets shrug it off as political noise with limited economic impact.",
        bearCase: "EU retaliates with its own AI Act enforcement, restricting US AI companies from EU markets. Digital trade war escalates — tech sector multiple compression across the board.",
        whatToWatch: "Monitor the EU Commission's 60-day review timeline. Any formal digital trade investigation filing is a negative catalyst for US cloud stocks.",
      },
    },
  },
  {
    id: '3', time: '17:30', date: 'today', country: 'United States',
    headline: "Meta's $14B AI Bet Strains as Zuckerberg Clashes with Star Hire Wang",
    summary: "Meta's $14.3 billion AI bet faces internal turmoil as leadership tensions surface around the company's AI research direction.",
    ticker: 'META', tickerName: 'Meta Platforms', tickerPrice: 566.98, tickerChange: -0.26,
    detail: {
      publishedAgo: '2 hrs ago', sourcesCount: 9,
      bullets: [
        'Zuckerberg and AI research chief Wang Fang reportedly disagree on open vs closed model strategy',
        'Three senior AI researchers resigned in the past 30 days, per internal sources',
        'Board is reviewing AI roadmap; $14.3B annual AI capex commitment under scrutiny',
      ],
      marketImpact: 38,
      whatItMeansForYou: [
        { bold: 'Leadership drama is noise', text: ' — META fundamentals remain exceptional at 17x forward PE. Internal tensions do not affect ad revenue.' },
        { bold: 'This is a buying opportunity', text: ': META is in its buy zone at $558–$570. Institutions will use this dip to accumulate.' },
        { bold: 'Real risk', text: ': if Wang departs, Llama 5 roadmap is delayed — watch for any announcement in the next 2 weeks.' },
      ],
      watchStocks: [
        { ticker: 'META', name: 'Meta Platforms', sentiment: 'bullish', price: 566.98, change: -0.26, description: 'Leadership noise at 17x PE is a gift. Ad revenue and AI monetisation are unaffected by research headcount.' },
        { ticker: 'GOOGL', name: 'Alphabet Inc.', sentiment: 'bullish', price: 359.68, change: +0.53, description: 'If Meta\'s open-source AI strategy weakens, Google DeepMind benefits as the default frontier model provider.' },
      ],
      fullBreakdown: {
        whatIsHappening: "Reports emerged of significant tension between Mark Zuckerberg and Wang Fang, Meta's recently hired AI research chief who came from a leading Chinese AI lab. The dispute centres on whether Meta should continue its open-source Llama model strategy or pivot to a closed, API-only approach like OpenAI.",
        whatDoesMean: "Meta's $14.3B AI budget is the largest in the industry. If internal dysfunction delays Llama 5 or forces a strategy pivot, Meta's competitive position in AI infrastructure weakens — and so does its ability to attract AI talent.",
        whyShouldICare: "META is one of the most widely held US tech stocks. Short-term, this is sentiment noise — the stock may dip 3–5%. Medium-term, if the open-source strategy changes, META loses a key developer ecosystem advantage.",
        bullCase: "Zuckerberg maintains his open-source commitment, Wang adapts or is replaced quietly, and Llama 5 launches on schedule in Q4. META trades to $650 by year-end.",
        bearCase: "Wang departs publicly, Llama 5 is delayed 6+ months, and Meta's AI developer ecosystem fractures. Multiple compression to 14x PE = $490 stock.",
        whatToWatch: "Any official statement from Meta on Wang Fang's role. If Zuckerberg posts on Threads about AI strategy — he tends to telegraph moves there first.",
      },
    },
  },
  {
    id: '4', time: '16:45', date: 'today', country: 'United States',
    headline: 'Micron Earnings Expected to Show 932% EPS Growth on Jun 24',
    summary: 'Wall Street expects Micron to report EPS of $19.72 and revenue of $34.4B, with HBM4 certification for NVIDIA driving demand.',
    ticker: 'MU', tickerName: 'Micron Technology', tickerPrice: 981.61, tickerChange: -1.43,
    detail: {
      publishedAgo: '3 hrs ago', sourcesCount: 14,
      bullets: [
        'Consensus EPS: $19.72 (+932% YoY) — revenue: $34.4B (+73% YoY)',
        'HBM4 memory certified for NVIDIA Blackwell Ultra; Micron is sole supplier for Q3 ramp',
        '20% implied options move — high binary risk either direction',
      ],
      marketImpact: 88,
      whatItMeansForYou: [
        { bold: 'High binary risk', text: ': a 20% options-implied move means this could go +20% or -20% on earnings night.' },
        { bold: 'Safer play', text: ': buy WDC (Western Digital) instead — same memory exposure, lower valuation, no earnings binary until August.' },
        { bold: 'If MU beats', text: ', the entire memory sector (WDC, SKX, LRCX) rallies. Position before Jun 24 close.' },
      ],
      watchStocks: [
        { ticker: 'MU', name: 'Micron Technology', sentiment: 'bullish', price: 981.61, change: -1.43, description: 'HBM4 sole supplier status is a structural advantage. But 20% implied move = high risk for undiversified bets.' },
        { ticker: 'WDC', name: 'Western Digital', sentiment: 'bullish', price: 534.20, change: +0.88, description: 'Best proxy for a MU beat — cheaper PE (18x), no earnings binary, same memory sector upside.' },
        { ticker: 'LRCX', name: 'Lam Research', sentiment: 'bullish', price: 812.50, change: -0.65, description: 'Memory capex surge benefits Lam\'s etch equipment sales. Quieter way to play the memory boom.' },
      ],
      fullBreakdown: {
        whatIsHappening: "Micron reports earnings on June 24 after market close. Wall Street expects explosive growth driven by HBM (High Bandwidth Memory) demand from AI data centres. Micron is the only certified HBM4 supplier for NVIDIA's next-gen Blackwell Ultra GPU.",
        whatDoesMean: "HBM4 is the memory standard required for next-generation AI training chips. Micron's sole supplier status means every NVIDIA Blackwell Ultra sold generates direct, high-margin revenue for Micron — a structural moat that competitors can't quickly replicate.",
        whyShouldICare: "If you hold NVDA, this report affects your investment too — strong MU numbers confirm AI chip demand is accelerating. If you don't hold memory stocks, this is the last chance to position before the report.",
        bullCase: "MU beats on both EPS and revenue, raises Q4 guidance, and announces expanded HBM4 supply agreements. Stock gaps to $1,100+. Memory sector re-rates higher across the board.",
        bearCase: "MU meets but doesn't raise guidance — market interprets as peak. Stock falls 15%+ on sell-the-news. HBM pricing pressure cited as margin headwind.",
        whatToWatch: "Gross margin guidance is the number that matters most — not revenue. If GM% stays above 40%, bulls win. Below 38% = sell signal.",
      },
    },
  },
  {
    id: '5', time: '15:20', date: 'today', country: 'United States',
    headline: 'Nasdaq-100 Adds NBIS, CRWV, RKLB, TER — Effective June 22',
    summary: 'Four stocks join the Nasdaq-100 index, triggering $800B+ in passive fund buying from QQQ and QQQM before June 22 open.',
    ticker: 'NBIS', tickerName: 'Nebius Group', tickerPrice: 232.36, tickerChange: +4.55,
    detail: {
      publishedAgo: '4 hrs ago', sourcesCount: 7,
      bullets: [
        'NBIS, CRWV, RKLB and TER join Nasdaq-100 effective at open June 22',
        'QQQ and QQQM must buy all four stocks before market open — combined ~$800B AUM',
        'Historical data: NDX additions average +8% in the 5 days before inclusion date',
      ],
      marketImpact: 65,
      whatItMeansForYou: [
        { bold: 'Time-sensitive', text: ': the passive buying window closes at June 22 open. You have Mon–Tue to position.' },
        { bold: 'NBIS is the highest conviction', text: ' — largest weight addition, AI infrastructure thesis intact, support at $220.' },
        { bold: 'Set a stop', text: ' at $210 — if it breaks that level before June 22, the trade thesis is invalidated.' },
      ],
      watchStocks: [
        { ticker: 'NBIS', name: 'Nebius Group', sentiment: 'bullish', price: 232.36, change: +4.55, description: 'Largest NDX weight add. AI infrastructure pure-play with $800B of forced buying incoming.' },
        { ticker: 'CRWV', name: 'CoreWeave', sentiment: 'bullish', price: 87.42, change: +2.18, description: 'GPU cloud company added to NDX. Higher float means more passive buying in dollar terms.' },
        { ticker: 'RKLB', name: 'Rocket Lab', sentiment: 'bullish', price: 24.15, change: +3.44, description: 'Smallest weight add but highest volatility — can move 10%+ on forced buying days.' },
      ],
      fullBreakdown: {
        whatIsHappening: "Nasdaq announced its quarterly index rebalance. Four stocks — NBIS, CRWV, RKLB, and TER — are being added to the Nasdaq-100. This requires every ETF and fund that tracks the Nasdaq-100 (combined AUM over $800B) to purchase these stocks before June 22 open.",
        whatDoesMean: "Index inclusion creates guaranteed, price-insensitive buying. Fund managers must buy regardless of valuation. This is mechanical demand — it doesn't care about fundamentals, earnings, or macro. It simply must happen before a specific date.",
        whyShouldICare: "This is one of the most reliable short-term catalysts in markets. Stocks added to major indices consistently outperform in the days before inclusion. It's a known, scheduled event — rare in markets where most catalysts are uncertain.",
        bullCase: "All four stocks gap up on June 20–21 as passive funds front-run each other. NBIS hits $260, CRWV hits $95. Sell into the close on June 21.",
        bearCase: "Stocks were already bid up on the announcement (today). The actual buying is already priced in, and they sell off after June 22 as momentum fades.",
        whatToWatch: "Monitor daily volume on NBIS, CRWV, and RKLB vs. their 30-day average. Unusual volume spike = passive funds buying early. That's your signal to add.",
      },
    },
  },
  {
    id: '6', time: '23:52', date: 'yesterday', country: 'United States',
    headline: "MRVL: Jensen Huang Calls It 'Next Trillion-Dollar Company'",
    summary: 'NVIDIA CEO Jensen Huang endorsed Marvell Technology at Computex, citing its NVLink Fusion partnership and custom AI silicon leadership.',
    ticker: 'MRVL', tickerName: 'Marvell Technology', tickerPrice: 279.70, tickerChange: -0.36,
    detail: {
      publishedAgo: '14 hrs ago', sourcesCount: 6,
      bullets: [
        'Jensen Huang mentioned MRVL by name at Computex as a key NVLink Fusion partner',
        'Marvell\'s custom AI silicon (XPUs) for hyperscalers is on track for $5B+ revenue by FY28',
        'S&P 500 inclusion expected next quarterly rebalance — passive buying of ~$3B',
      ],
      marketImpact: 55,
      whatItMeansForYou: [
        { bold: 'Wait for the dip', text: ': MRVL will likely be added to S&P 500 next quarter. Buy the post-inclusion sell-off at $260–$270.' },
        { bold: 'Jensen\'s endorsement', text: ' is not accidental — MRVL is a strategic NVIDIA partner. This is long-term bullish.' },
        { bold: 'Risk', text: ': at $279, MRVL is pricing in a lot of good news. Overextended near-term.' },
      ],
      watchStocks: [
        { ticker: 'MRVL', name: 'Marvell Technology', sentiment: 'bullish', price: 279.70, change: -0.36, description: 'Custom XPU silicon for hyperscalers + NVLink Fusion = structural AI tailwind. Wait for S&P dip.' },
        { ticker: 'AVGO', name: 'Broadcom', sentiment: 'neutral', price: 1842.30, change: +0.14, description: 'Direct competitor in custom AI silicon. MRVL gaining share is a relative negative for AVGO.' },
      ],
      fullBreakdown: {
        whatIsHappening: "At Computex 2026, NVIDIA CEO Jensen Huang publicly named Marvell Technology as a key partner in NVIDIA's NVLink Fusion ecosystem — the architecture that connects custom AI chips from different vendors. He called Marvell's trajectory 'the next trillion-dollar company' in the silicon space.",
        whatDoesMean: "NVLink Fusion is NVIDIA's strategy to connect custom silicon (built by hyperscalers like Google and Amazon) to NVIDIA's GPU ecosystem. Marvell designs the connecting chips. Jensen's endorsement means Marvell is locked in as a structural component of the AI compute stack.",
        whyShouldICare: "MRVL is a less obvious AI play than NVDA or AMD but could deliver higher percentage returns from here. Jensen Huang's public endorsements have a track record of preceding significant stock moves.",
        bullCase: "S&P 500 inclusion triggers $3B in passive buying, XPU revenue hits $5B by FY28, and MRVL re-rates to 30x forward PE = $380 stock.",
        bearCase: "Hyperscalers slow custom silicon investment amid macro uncertainty. MRVL's $5B XPU target gets pushed to FY30. Stock drifts back to $220.",
        whatToWatch: "Next quarterly S&P 500 rebalance announcement date. That's the inclusion catalyst. Also watch MRVL's next earnings for any update to the XPU revenue guidance.",
      },
    },
  },
  {
    id: '7', time: '11:30', date: 'today', country: 'India',
    headline: 'Infosys Wins $2B AI Cloud Migration Deal with European Bank',
    summary: 'Infosys secured one of its largest AI-led transformation deals, boosting outlook for FY26 revenue guidance.',
    ticker: 'INFY', tickerName: 'Infosys', tickerPrice: 18.42, tickerChange: +1.12,
    detail: {
      publishedAgo: '3 hrs ago', sourcesCount: 5,
      bullets: [
        '$2B, 5-year deal with a major European bank to migrate core banking to AWS using AI automation',
        'Deal adds ~1.8% to FY26 revenue guidance; analyst upgrades expected',
        'Infosys AI cloud practice has won $7B in deals YTD — largest ever annual total',
      ],
      marketImpact: 58,
      whatItMeansForYou: [
        { bold: 'INFY is a buy on this dip', text: ': deal pipeline confirms the AI migration super-cycle is real for Indian IT.' },
        { bold: 'TCS and Wipro', text: ' will benefit by association — sector-wide re-rating likely this week.' },
        { bold: 'Risk', text: ': INR appreciation could reduce reported USD revenue — watch currency hedges in the next earnings.' },
      ],
      watchStocks: [
        { ticker: 'INFY', name: 'Infosys', sentiment: 'bullish', price: 18.42, change: +1.12, description: 'Largest ever AI deal pipeline. FY26 guidance raise expected at next quarterly update.' },
        { ticker: 'WIT', name: 'Wipro', sentiment: 'bullish', price: 5.82, change: +0.44, description: 'Sector halo effect — similar AI migration deals in pipeline. Cheaper PE than INFY.' },
      ],
      fullBreakdown: {
        whatIsHappening: "Infosys announced a $2 billion, 5-year contract with a large European bank to migrate its core banking infrastructure to AWS cloud, with Infosys handling AI-powered automation of legacy systems. This is one of Infosys's largest single contracts ever.",
        whatDoesMean: "Large financial institutions are finally committing to full cloud migrations — deals that were delayed for years due to regulatory concerns. Infosys has positioned its AI automation tools as the key differentiator that makes these migrations faster and cheaper.",
        whyShouldICare: "Indian IT stocks (INFY, TCS, WIT) have underperformed US tech in 2025. Large deal wins like this signal that the sector's growth cycle is accelerating again, driven by AI transformation budgets rather than traditional IT outsourcing.",
        bullCase: "INFY raises FY26 revenue guidance to 12%+ growth, triggers sector-wide analyst upgrades. INFY ADR returns to $22 by Q3.",
        bearCase: "Deal execution risk — large migrations frequently encounter delays and cost overruns. If the European bank has regulatory issues, deal could be paused.",
        whatToWatch: "Next INFY earnings call (July) for official guidance raise. Watch for TCS and Wipro deal announcements — sector momentum tends to cluster.",
      },
    },
  },
  {
    id: '8', time: '10:15', date: 'yesterday', country: 'India',
    headline: 'Reliance Jio to Launch Satellite Broadband Across Rural India',
    summary: 'JioSpaceFiber expansion targets 100M underserved households by end of 2026, with TRAI approval expected next month.',
    ticker: 'RELIANCE', tickerName: 'Reliance Industries', tickerPrice: 2934.00, tickerChange: +0.67,
  },
  {
    id: '9', time: '09:45', date: 'today', country: 'China',
    headline: 'Alibaba Cloud Revenue Surges 25% as AI Demand Offsets Slowdown',
    summary: 'Cloud and AI segment growth accelerated in Q4 FY26, with management citing GenAI workloads as the primary driver.',
    ticker: 'BABA', tickerName: 'Alibaba Group', tickerPrice: 118.30, tickerChange: +2.14,
  },
  {
    id: '10', time: '08:20', date: 'yesterday', country: 'Japan',
    headline: 'Toyota Delays Solid-State Battery Launch to 2028 on Cost Pressure',
    summary: 'Manufacturing cost hurdles and supply constraints push EV battery timeline, though the company reiterated long-term EV targets.',
    ticker: 'TM', tickerName: 'Toyota Motor', tickerPrice: 178.50, tickerChange: -0.55,
  },
  {
    id: '11', time: '07:10', date: 'today', country: 'Australia',
    headline: 'BHP Eyes $3B Copper Expansion as EV Demand Surge Lifts Prices',
    summary: 'Copper futures hit 18-month highs as BHP fast-tracks Chilean mine expansion, betting on electrification tailwinds through 2030.',
    ticker: 'BHP', tickerName: 'BHP Group', tickerPrice: 42.80, tickerChange: +1.22,
  },
];

// ─── Trade ideas (keyed by ticker for easy lookup) ────────────────────────────

export const MOCK_TRADE_IDEAS: Record<string, TradeIdea> = {
  GOOGL: {
    stocks: ['GOOGL', 'AAPL'], direction: 'bearish',
    entry: 'Avoid GOOGL near $360 — Siri AI directly threatens Google Search',
    stop: '$340', confidence: 'medium',
    reason: 'Apple rebuilding Siri with on-device AI directly threatens Google Search market share. Near-term sentiment negative for GOOGL.',
    timeframe: 'Short-term (1–2 weeks)',
  },
  ASML: {
    stocks: ['ASML', 'NVDA'], direction: 'bearish',
    entry: 'Wait for ASML dip to $1,750 before adding',
    stop: '$1,680', confidence: 'speculative',
    reason: 'AI access restrictions create regulatory uncertainty for chip equipment. ASML already near analyst target — limited upside until clarity.',
    timeframe: 'Medium-term (2–4 weeks)',
  },
  META: {
    stocks: ['META'], direction: 'bullish',
    entry: 'META already in buy zone at $558–$570',
    stop: '$539', confidence: 'high',
    reason: 'Leadership drama is noise — META fundamentals remain exceptional at 17x forward PE. Internal tensions do not affect ad revenue or AI monetisation.',
    timeframe: 'Medium-term (1–3 months)',
  },
  MU: {
    stocks: ['WDC', 'MU'], direction: 'bullish',
    entry: 'Buy WDC at $530 as MU proxy — lower binary risk',
    stop: '$505', confidence: 'medium',
    reason: 'If MU beats on Jun 24, entire memory sector rallies. WDC is the safer play — cheaper PE (18x), no earnings binary, same upside exposure.',
    timeframe: 'Short-term (1 week)',
  },
  NBIS: {
    stocks: ['NBIS', 'CRWV', 'RKLB'], direction: 'bullish',
    entry: 'Add NBIS at current price ($232) before Jun 22',
    stop: '$210', confidence: 'high',
    reason: 'NDX inclusion creates guaranteed passive buying from $800B+ in QQQ/QQQM. Window is Mon–Fri this week only. Event expires Jun 22.',
    timeframe: 'Short-term (this week)',
  },
  MRVL: {
    stocks: ['MRVL'], direction: 'bullish',
    entry: 'Wait for post S&P 500 inclusion dip to $260–$270',
    stop: '$248', confidence: 'medium',
    reason: 'Jensen endorsement validates the NVLink Fusion thesis but at $280 it trades 20% above analyst consensus. Better entry after Jun 22 inclusion event.',
    timeframe: 'Medium-term (2–3 weeks)',
  },
};

// ─── Skills ───────────────────────────────────────────────────────────────────

export const MOCK_SKILLS = [
  {
    category: 'Fundamental Analysis',
    skills: [
      {
        id: 'great_company', icon: 'cash-outline' as const,
        title: 'Is This a Great Company?',
        description: 'Judge if a company is worth owning long-term',
        prompt: 'Analyse {ticker} as a long-term investment. Cover: business model quality, competitive moat, revenue growth trend, profit margins, balance sheet strength, and key risks. Give a clear verdict: Great / Good / Average / Avoid.',
      },
      {
        id: 'earnings_deep', icon: 'bar-chart-outline' as const,
        title: 'Earnings Deep Dive',
        description: 'Analyze past or upcoming earnings for a stock',
        prompt: 'Analyse the most recent earnings for {ticker}. Cover: EPS beat or miss, revenue vs expectations, guidance, management tone, key red flags, key green flags, and whether the reaction was justified.',
      },
    ],
  },
  {
    category: 'Technical & Price Levels',
    skills: [
      {
        id: 'when_to_buy', icon: 'stats-chart-outline' as const,
        title: 'When to Buy and Sell',
        description: 'Find the smartest entry and exit levels',
        prompt: 'For {ticker} at its current price, calculate: support level (S1, S2), resistance level (R1, R2), ideal entry zone, stop loss, Target 1, Target 2, and risk/reward ratio. Explain each level in plain English.',
      },
      {
        id: 'dip_score', icon: 'trending-down-outline' as const,
        title: 'Score This Dip',
        description: 'Is this a buying opportunity or a value trap?',
        prompt: 'Score the current dip in {ticker} from 0 to 100. Consider: % below 52wk high, analyst upside, analyst buy %, forward PE, support proximity, and risk/reward. Give a verdict: Buy / Watch / Wait / Avoid with reasoning.',
      },
    ],
  },
  {
    category: 'News & Events',
    skills: [
      {
        id: 'news_to_trade', icon: 'newspaper-outline' as const,
        title: 'Turn News into Trading Ideas',
        description: 'Paste headline and see which stocks move',
        prompt: 'I will paste a news headline. Identify: which stocks are affected, expected price direction, a simple trade idea with entry and stop, confidence level, and reason in 2–3 sentences. Headline: {headline}',
      },
      {
        id: 'earnings_preview', icon: 'calendar-outline' as const,
        title: 'Pre-Earnings Brief',
        description: 'Know exactly what to watch before results drop',
        prompt: 'Give me a pre-earnings brief for {ticker} reporting soon. Cover: what analysts expect (EPS, revenue), the implied options move, what the company needs to beat, key metrics to watch, and a suggested strategy.',
      },
    ],
  },
  {
    category: 'Smart Money',
    skills: [
      {
        id: 'insider_trades', icon: 'person-outline' as const,
        title: 'Follow the Insiders',
        description: 'See what company executives are buying or selling',
        prompt: 'Analyse recent insider trades for {ticker}. Focus on: executive buy vs sell patterns, cluster buys, transaction sizes vs salary, and what the signal means for the stock direction.',
      },
      {
        id: 'celeb_portfolio', icon: 'star-outline' as const,
        title: 'Celebrity Watchlist',
        description: 'Follow top investors like Leopold or Cathie Wood',
        prompt: "Tell me about {investor}'s current portfolio thesis and top positions. What is their investment philosophy, what sectors are they concentrated in, and what can I learn from their approach?",
      },
    ],
  },
  {
    category: 'Portfolio Tools',
    skills: [
      {
        id: 'health_check', icon: 'fitness-outline' as const,
        title: 'Portfolio Health Check',
        description: 'Find concentration risks and blind spots',
        prompt: 'Analyse my portfolio for health. Check: sector concentration (is any sector >40%?), single-stock concentration (any stock >20%?), correlation clusters, and give a health score 0–100 with 3 specific action items.',
      },
      {
        id: 'morning_strategy', icon: 'sunny-outline' as const,
        title: 'Morning Strategy',
        description: 'Your personalised pre-market action plan',
        prompt: 'Given my portfolio and watchlist, what is my strategy for today? Give me: 1–2 stocks to consider buying (with entry), 1–2 to hold without action, any to consider trimming, and the single most important thing to watch today.',
      },
      {
        id: 'peer_compare', icon: 'git-compare-outline' as const,
        title: 'Compare Two Stocks',
        description: 'Head-to-head between any two stocks',
        prompt: 'Compare {tickerA} vs {tickerB} head-to-head. Cover: revenue growth, profit margins, valuation (PE, PEG), analyst consensus, upcoming catalysts, key risks, and give a clear verdict: which do I buy first and why?',
      },
    ],
  },
];

// ─── Market snapshot ──────────────────────────────────────────────────────────

export const MOCK_MARKET_SNAPSHOT = {
  status: 'open' as 'pre-market' | 'open' | 'after-hours' | 'closed',
  statusLabel: 'Market Open',
  lastUpdated: '15 minutes ago',
  headline: 'Wall Street Pauses, Tech Lags as Oil Tumbles',
  description: 'Stocks are sliding this afternoon, led by a sharp drop in semiconductors, while oil crashes and gold rises. Investors are cautious ahead of tomorrow\'s first Fed meeting under new Chair Kevin Warsh.',
  fearGreed: { value: 40, label: 'FEAR' as const },
  valuation: { value: 88, label: 'EXTREME' as const },
  tickers: [
    { symbol: 'VIX',     value: 16.24,    change: +0.25, isPrice: false },
    { symbol: 'S&P 500', value: 7513.14,  change: -0.54, isPrice: true },
    { symbol: 'Bitcoin', value: 65488,    change: -2.01, isPrice: true },
  ],
  summary: [
    { text: 'Stocks Drift Lower as Tech Profit-Taking Starts',     color: 'teal' as const },
    { text: 'Semiconductors Fall Sharply, Reversing Morning Gains', color: 'red' as const },
    { text: 'Oil Plunges on Iran Peace Deal Progress',              color: 'amber' as const },
    { text: 'All Eyes on Tomorrow\'s Fed Huddle',                   color: 'amber' as const },
    { text: 'SpaceX Options Debut with Record Volatility',          color: 'teal' as const },
  ],
};

// ─── Upcoming events ──────────────────────────────────────────────────────────

export interface NotableEvent {
  title: string;
  bullets: string[];
}

export interface EarningsCompany {
  ticker: string;
  name: string;
  beatPct?: number;
  verdict?: 'Beat' | 'Miss';
}

export interface EarningsDay {
  date: string;
  preMarket: EarningsCompany[];
  postMarket: EarningsCompany[];
}

export interface EconomicDay {
  date: string;
  events: string[];
}

export const MOCK_UPCOMING_EVENTS = {
  notable: [
    {
      title: 'FOMC Rate Decision and Press Conference — Wednesday, June 17, 2:00 PM ET',
      bullets: [
        'Highly anticipated first FOMC meeting chaired by Kevin Warsh; markets expect no rate change, but the dot plot and economic projections carry extra weight.',
        'History suggests new Fed chairs\' initial meetings are often followed by weaker equity returns over the following two months.',
        'Investors will watch for hints on future rate hikes, especially given recent policy changes and inflation data.',
      ],
    },
    {
      title: 'Fed Chair Kevin Warsh Speaks — Wednesday, June 17 (FOMC Press Conference)',
      bullets: [
        'Fed Chair Kevin Warsh leads his first press conference after the rate decision; markets will parse every word on inflation, AI investment, and the labor market.',
        'Additional context: Warsh\'s tone on the Iran deal\'s potential inflationary impact and ongoing AI-driven capex will be closely watched.',
        'This is part of the same event as the FOMC decision, but the presser often moves markets more than the decision itself.',
      ],
    },
    {
      title: 'Formal US-Iran Peace Deal Signing Ceremony',
      bullets: [
        'Expected to be signed this week; oil markets already pricing in a 12% supply increase once sanctions lift.',
        'Energy sector and defence stocks likely to see continued volatility around the signing date.',
      ],
    },
  ] as NotableEvent[],

  earnings: [
    {
      date: 'Tue, Jun 23',
      preMarket: [],
      postMarket: [
        { ticker: 'CCL', name: 'Carnival' },
        { ticker: 'FDX', name: 'FedEx' },
      ],
    },
    {
      date: 'Wed, Jun 24',
      preMarket: [],
      postMarket: [
        { ticker: 'MU', name: 'Micron Technology' },
      ],
    },
    {
      date: 'Thu, Jun 25',
      preMarket: [],
      postMarket: [
        { ticker: 'NKE', name: 'Nike' },
      ],
    },
  ] as EarningsDay[],

  economic: [
    { date: 'Wed, Jun 17', events: ['Retail Sales MoM', 'FOMC Economic Projections', 'Fed Interest Rate Decision', 'Fed Press Conference'] },
    { date: 'Thu, Jun 18', events: ['Initial Jobless Claims'] },
    { date: 'Thu, Jun 25', events: ['Core PCE Price Index', 'Initial Jobless Claims'] },
  ] as EconomicDay[],
};

// ─── Early Signals ────────────────────────────────────────────────────────────

export interface CongressTrade {
  id: string;
  ticker: string;
  representative: string;
  title: string;
  type: 'Buy' | 'Sell';
  amount: string;
  date: string;
}

export const MOCK_CONGRESS_TRADES: CongressTrade[] = [
  { id: 'c1', ticker: 'TCNNF', representative: 'Greg Stanton', title: 'Representative (D-AZ)', type: 'Sell', amount: '$15,001 - $50,000', date: 'May 6, 2026' },
  { id: 'c2', ticker: 'CARR',  representative: 'Maria Elvira Salazar', title: 'Representative (R-FL)', type: 'Buy',  amount: '$1,001 - $15,000',  date: 'May 1, 2026' },
  { id: 'c3', ticker: 'CARR',  representative: 'Maria Elvira Salazar', title: 'Representative (R-FL)', type: 'Buy',  amount: '$15,001 - $50,000', date: 'May 1, 2026' },
  { id: 'c4', ticker: 'NVDA',  representative: 'Nancy Pelosi',        title: 'Representative (D-CA)', type: 'Buy',  amount: '$250,001 - $500,000', date: 'Apr 22, 2026' },
  { id: 'c5', ticker: 'MSFT',  representative: 'Josh Gottheimer',     title: 'Representative (D-NJ)', type: 'Buy',  amount: '$15,001 - $50,000', date: 'Apr 18, 2026' },
];

export interface RedditStock {
  rank: number;
  ticker: string;
  rankChange: number;
  mentions: number;
}

export interface RedditMover {
  rank: number;
  ticker: string;
  name: string;
  rankChange: number;
  postMarket: number;
  prevSession: number;
}

export const MOCK_REDDIT_STOCKS: RedditStock[] = [
  { rank: 1, ticker: 'SPCX',  rankChange: +2, mentions: 312 },
  { rank: 2, ticker: 'SPY',   rankChange: -1, mentions: 287 },
  { rank: 3, ticker: 'MU',    rankChange: -1, mentions: 241 },
  { rank: 4, ticker: 'MSFT',  rankChange:  0, mentions: 198 },
  { rank: 5, ticker: 'QQQ',   rankChange:  0, mentions: 176 },
  { rank: 6, ticker: 'NVDA',  rankChange: +1, mentions: 162 },
  { rank: 7, ticker: 'TSLA',  rankChange: +4, mentions: 154 },
  { rank: 8, ticker: 'VOO',   rankChange: +7, mentions: 143 },
  { rank: 9, ticker: 'ASTS',  rankChange: +1, mentions: 138 },
  { rank: 10, ticker: 'SNDK', rankChange: -4, mentions: 121 },
];

export const MOCK_REDDIT_MOVERS: RedditMover[] = [
  { rank: 1, ticker: 'NFLX', name: 'Netflix, Inc.',      rankChange: +47, postMarket: -0.2, prevSession: -3.6 },
  { rank: 2, ticker: 'WDC',  name: 'Western Digital',    rankChange: +42, postMarket: +0.1, prevSession: +4.2 },
  { rank: 3, ticker: 'AMZN', name: 'Amazon.com, Inc.',   rankChange: +21, postMarket: +0.1, prevSession: -0.0 },
];

export interface InsiderTrade {
  id: string;
  ticker: string;
  insiderName: string;
  title: string;
  type: 'Buy' | 'Sell';
  average: string;
  value: string;
  dateRange: string;
}

export const MOCK_INSIDER_TRADES: InsiderTrade[] = [
  { id: 'i1', ticker: 'SOFI', insiderName: 'Noto Anthony',       title: 'Director, Chief Executive Officer', type: 'Buy',  average: '$18.06', value: '$251K',   dateRange: '2026-06-16' },
  { id: 'i2', ticker: 'FISV', insiderName: 'Disimone Harry',     title: 'Director',                         type: 'Buy',  average: '$48.41', value: '$101K',   dateRange: '2026-06-16' },
  { id: 'i3', ticker: 'JBLU', insiderName: 'Jones Byron Riche',  title: 'Director',                         type: 'Buy',  average: '$3.38',  value: '$152.10K', dateRange: '2026-06-15' },
  { id: 'i4', ticker: 'NVDA', insiderName: 'Jensen Huang',       title: 'Director, Chief Executive Officer', type: 'Sell', average: '$121.40', value: '$1.2M',  dateRange: '2026-06-12' },
  { id: 'i5', ticker: 'META', insiderName: 'Mark Zuckerberg',    title: 'Director, Chief Executive Officer', type: 'Sell', average: '$572.80', value: '$4.8M',  dateRange: '2026-06-10' },
];

export interface PopularInvestor {
  id: string;
  name: string;
  description: string;
  metric1Label: string;
  metric1Value: string;
  metric2Label?: string;
  metric2Value?: string;
  badge?: string;
  badgeColor?: string;
}

export interface ConvictionPlay {
  rank: number;
  ticker: string;
  name: string;
  investorsCount: number;
  action: string;
  funds: string[];
}

export interface TopPerformer {
  rank: number;
  name: string;
  manager: string;
  aum: string;
  returnPct: number;
}

export const MOCK_POPULAR_INVESTORS: PopularInvestor[] = [
  { id: 'p1', name: 'Donald J. Trump', description: '45th & 47th President of the US', metric1Label: 'Transactions', metric1Value: '3,711', badge: 'Q1 2026', badgeColor: '#F59E0B' },
  { id: 'p2', name: 'Berkshire Hathaway', description: 'Warren Buffett', metric1Label: '2025 Return', metric1Value: '+9.8%', metric2Label: 'AUM', metric2Value: '$263B' },
  { id: 'p3', name: 'Soros Fund Mgmt', description: 'George Soros', metric1Label: '2025 Return', metric1Value: '+14.2%', metric2Label: 'AUM', metric2Value: '$28B' },
];

export const MOCK_CONVICTION_PLAYS: Record<'new' | 'added' | 'reduced' | 'exited', ConvictionPlay[]> = {
  new: [
    { rank: 1, ticker: 'SUNB', name: 'Sunbelt Rentals Holdings Inc', investorsCount: 10, action: 'opened new positions', funds: ['AKO Capital LLP (Gorm Thomassen)', 'Brave Warrior Advisors, LLC (Glenn Greenberg)', '+8 more'] },
    { rank: 2, ticker: 'MU',   name: 'Micron Technology, Inc.',       investorsCount: 6,  action: 'opened new positions', funds: ['Coatue Management LLC (Philippe Laffont)', 'Duquesne Family Office LLC (Stanley Druckenmiller)', '+4 more'] },
    { rank: 3, ticker: 'META', name: 'Meta Platforms, Inc.',          investorsCount: 6,  action: 'opened new positions', funds: ['Parnassus Investments, LLC (Jerome L. Dodson)', 'Polen Capital Management LLC (Dan Davidowitz)', '+4 more'] },
  ],
  added: [
    { rank: 1, ticker: 'NVDA', name: 'NVIDIA Corporation', investorsCount: 8, action: 'added to positions', funds: ['Citadel Advisors LLC', 'Tiger Global Management', '+6 more'] },
    { rank: 2, ticker: 'AAPL', name: 'Apple Inc.',         investorsCount: 5, action: 'added to positions', funds: ['Berkshire Hathaway (Warren Buffett)', 'Appaloosa Management', '+3 more'] },
  ],
  reduced: [
    { rank: 1, ticker: 'TSLA', name: 'Tesla, Inc.', investorsCount: 7, action: 'reduced positions', funds: ['ARK Investment Management', 'Cathie Wood', '+5 more'] },
  ],
  exited: [
    { rank: 1, ticker: 'BABA', name: 'Alibaba Group Holding', investorsCount: 4, action: 'fully exited', funds: ['SoftBank Group Corp', 'Tiger Global Management', '+2 more'] },
  ],
};

export const MOCK_TOP_PERFORMERS: TopPerformer[] = [
  { rank: 1, name: 'Greenhaven Associates', manager: 'Edgar Wachenheim III', aum: '$6.1B', returnPct: 76928.5 },
  { rank: 2, name: 'Duquesne Family Office', manager: 'Stanley Druckenmiller', aum: '$2.9B', returnPct: 4821.3 },
  { rank: 3, name: 'Coatue Management', manager: 'Philippe Laffont', aum: '$18.4B', returnPct: 892.7 },
];

// ─── Stock Overview (universal — opens on any ticker tap) ──────────────────────

export type AnalystVerdict = 'Strong Sell' | 'Sell' | 'Hold' | 'Buy' | 'Strong Buy';

export interface StatItem { label: string; value: string }
export interface IncomePeriod { period: string; revenue: number; netIncome: number; margin: number }
export interface EarningsQuarter { period: string; actualEps: number; estEps: number; beatPct: number; actualRev: number; estRev: number }
export interface InsiderTxn { name: string; title: string; trades: number; type: 'Buy' | 'Sell'; date: string; average?: string; value: string }
export interface StockNews { title: string; source: string; time: string; url?: string }
export interface SuperHolder { name: string; weightPct: number }

export interface StockOverview {
  ticker: string;
  name: string;
  sector: string;
  industry: string;
  price: {
    atClose: number; closeChange: number; closeChangePct: number; closeDate: string;
    postMarket: number; postChange: number; postChangePct: number; hasPostData: boolean;
  };
  chart: number[];
  volume: { value: number; up: boolean }[];
  keyStats: StatItem[];
  income: IncomePeriod[];
  incomeQuarterly: IncomePeriod[];
  priceTarget: { low: number; median: number; high: number; current: number };
  analystRating: { verdict: AnalystVerdict; score: number };
  about: string | null;
  profileSheet: {
    marketCap: string; enterpriseValue: string;
    pe: string; pb: string; ps: string; evEbitda: string;
    revenuePerShare: string; eps: string; bvps: string; dps: string;
  };
  earningsPast: {
    period: string;
    revenue: { result: 'Beat' | 'Miss'; est: string; actual: string };
    eps: { result: 'Beat' | 'Miss'; est: string; actual: string };
    guidance: 'Above' | 'Inline' | 'Below';
    summary: string[];
  };
  earningsHistory: EarningsQuarter[];
  earningsUpcoming: { date: string; epsEstimate: string; revenueEstimate: string; lookout: string[] };
  smartMoney: {
    insiderBuyPct: number;
    congress: { purchases: string; purchaseTrades: number; sales: string; saleTrades: number };
    superInvestors: SuperHolder[];
  };
  insiderTransactions: InsiderTxn[];
  news: StockNews[];
}

// Small deterministic RNG so each ticker generates stable data across renders.
function mulberry32(seedStr: string) {
  let a = 0;
  for (let i = 0; i < seedStr.length; i++) a = (a * 31 + seedStr.charCodeAt(i)) >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FY = ['FY2022', 'FY2023', 'FY2024', 'FY2025', 'FY2026'];
const EQ = ['Q2FY26', 'Q3FY26', 'Q4FY26', 'Q1FY27', 'Q2FY27'];

function fmtBig(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(0)}B`;
  if (n >= 1e6) return `$${(n / 1e6).toFixed(0)}M`;
  return `$${n.toFixed(0)}`;
}

// Hardcoded NVDA overview matches the reference screenshots exactly.
const NVDA_OVERVIEW: StockOverview = {
  ticker: 'NVDA', name: 'NVIDIA Corporation', sector: 'Technology', industry: 'Semiconductors',
  price: {
    atClose: 207.42, closeChange: -5.03, closeChangePct: -2.37, closeDate: 'Jun 16, 2026',
    postMarket: 207.78, postChange: +0.36, postChangePct: +0.17, hasPostData: false,
  },
  chart: [208.9, 209.4, 210.2, 208.8, 209.7, 209.1, 209.9, 209.2, 208.7, 209.3, 209.0, 208.6, 209.1, 208.9, 209.4, 209.0, 208.8, 209.2, 209.6, 210.0, 209.5, 209.0, 208.6, 208.9, 209.3, 209.1, 208.7, 208.5, 208.9, 208.6, 208.3, 208.7, 208.4, 208.8, 208.5, 208.2, 207.9, 208.3, 207.6, 207.42],
  volume: [2.1, 2.8, 2.4, 1.9, 2.6, 1.7, 1.4, 2.0, 1.6, 1.2, 1.8, 1.3, 2.2, 1.5, 1.1, 1.9, 1.4, 1.0, 1.6, 1.2, 0.9, 1.4, 1.1, 1.7, 1.3, 1.0, 1.5, 1.2, 0.8, 1.3, 1.0, 1.6, 1.2, 0.9, 1.4, 1.8, 2.3, 3.1, 4.2, 5.7].map((v, i) => ({ value: v, up: i % 3 !== 0 })),
  keyStats: [
    { label: 'Average Volume', value: '165M' },
    { label: 'Market Cap', value: '$5.0T' },
    { label: 'P/E Ratio (TTM)', value: '31.56' },
    { label: '52 Week Range', value: '142.03-236.54' },
    { label: 'EPS (TTM)', value: '$6.57' },
    { label: 'Revenue (FY)', value: '$216B' },
    { label: 'Net Income (FY)', value: '$120B' },
    { label: 'Beta', value: '2.20' },
  ],
  income: [
    { period: 'FY2022', revenue: 26_974_000_000, netIncome:  9_752_000_000, margin: 36 },
    { period: 'FY2023', revenue: 26_974_000_000, netIncome:  4_368_000_000, margin: 16 },
    { period: 'FY2024', revenue: 60_922_000_000, netIncome: 29_760_000_000, margin: 49 },
    { period: 'FY2025', revenue: 130_497_000_000, netIncome: 72_880_000_000, margin: 56 },
    { period: 'FY2026', revenue: 216_000_000_000, netIncome: 120_960_000_000, margin: 56 },
  ],
  incomeQuarterly: [
    { period: 'Q2 FY25', revenue: 30_040_000_000, netIncome: 16_599_000_000, margin: 55 },
    { period: 'Q3 FY25', revenue: 35_082_000_000, netIncome: 19_309_000_000, margin: 55 },
    { period: 'Q4 FY25', revenue: 39_331_000_000, netIncome: 22_091_000_000, margin: 56 },
    { period: 'Q1 FY26', revenue: 44_062_000_000, netIncome: 18_775_000_000, margin: 43 },
  ],
  priceTarget: { low: 139, median: 294, high: 500, current: 207.42 },
  analystRating: { verdict: 'Buy', score: 72 },
  about: 'NVIDIA Corporation stands as a prominent provider of advanced graphics, computational, and networking solutions, operating across the United States, Taiwan, China, and numerous international markets.',
  profileSheet: {
    marketCap: '$5.02T', enterpriseValue: '$5.02T',
    pe: '31.56x', pb: '25.77x', ps: '19.82x', evEbitda: '26.06x',
    revenuePerShare: '10.44', eps: '6.57', bvps: '8.05', dps: '0.28',
  },
  earningsPast: {
    period: 'Q1 FY27 · May 20, 2026',
    revenue: { result: 'Beat', est: '$78.4B', actual: '$81.6B' },
    eps: { result: 'Beat', est: '$1.76', actual: '$1.87' },
    guidance: 'Below',
    summary: [
      'Revenue $82 billion, up 85% YoY and 20% sequential; data center $75 billion up 92% YoY.',
      'GAAP gross margin 74.9%, non-GAAP 75%, flat QoQ; operating expenses up 12% QoQ.',
      'Free cash flow $49 billion, record; dividend raised to $0.20 per share; $80 billion share repurchase authorized.',
      'Q2 revenue guidance $91 billion ±2%; margin guidance 74.9%-75% ±50 basis points.',
      'Growth decelerating QoQ and supply constraints raise concerns.',
    ],
  },
  earningsHistory: [
    { period: 'Q2FY26', actualEps: 0.98, estEps: 0.94, beatPct: 4, actualRev: 56, estRev: 54 },
    { period: 'Q3FY26', actualEps: 1.24, estEps: 1.20, beatPct: 3, actualRev: 62, estRev: 60 },
    { period: 'Q4FY26', actualEps: 1.55, estEps: 1.47, beatPct: 5, actualRev: 68, estRev: 66 },
    { period: 'Q1FY27', actualEps: 1.87, estEps: 1.76, beatPct: 6, actualRev: 81.6, estRev: 78.4 },
    { period: 'Q2FY27', actualEps: 0, estEps: 2.07, beatPct: 0, actualRev: 0, estRev: 91.7 },
  ],
  earningsUpcoming: {
    date: '~ Aug 26, 2026', epsEstimate: '$2.07', revenueEstimate: '$91.70B',
    lookout: [
      'Data center revenue trajectory and whether Blackwell Ultra ramp offsets decelerating sequential growth.',
      'Gross margin guidance — any dip below 74% would pressure the multiple.',
      'Commentary on China export licensing and supply constraints.',
    ],
  },
  smartMoney: {
    insiderBuyPct: 0,
    congress: { purchases: '$3.2M - $10M', purchaseTrades: 39, sales: '$1.2M - $5.6M', saleTrades: 20 },
    superInvestors: [
      { name: 'Altimeter Capital Management, Lp', weightPct: 28.57 },
      { name: 'Tiger Global Management LLC', weightPct: 19.42 },
      { name: 'Coatue Management LLC', weightPct: 14.10 },
    ],
  },
  insiderTransactions: [
    { name: 'Stevens Mark A', title: 'Director', trades: 3, type: 'Sell', date: 'Jun 2, 2026 - Jun 4, 2026', average: '$221.10', value: '$221M' },
    { name: 'Neal Stephen C', title: 'Director', trades: 1, type: 'Sell', date: 'Jun 3, 2026', average: '$215.73', value: '$3.3M' },
    { name: 'Stevens Mark A', title: 'Director', trades: 2, type: 'Sell', date: 'Mar 20, 2026', average: '$173.68', value: '$39M' },
    { name: 'Stevens Mark A', title: 'Director', trades: 1, type: 'Sell', date: 'Dec 19, 2025', average: '$180.17', value: '$40M' },
    { name: 'Jones Harvey C', title: 'Director', trades: 1, type: 'Sell', date: 'Dec 15, 2025', average: '$168.40', value: '$12M' },
  ],
  news: [
    { title: 'Famed Venture Capital Fund Says this Stock is Like Buying Nvidia in 2023', source: '247wallst.com', time: 'about 13 hours ago' },
    { title: 'Looking for a Dividend ETF to Buy? Choose Between This High Yield and High Dividend Growth ETF', source: 'fool.com', time: 'about 14 hours ago' },
    { title: 'Paying 50x Earnings Can Still Be Cheap — If You Know This One Thing', source: '247wallst.com', time: 'about 15 hours ago' },
    { title: "Nvidia's Huang pledges AI will boost manufacturing jobs. A test will come in Texas", source: 'techxplore.com', time: 'about 15 hours ago' },
    { title: 'Nvidia As Big Borrower: AI Data Centers, Suppliers Racking Up Debt', source: 'investors.com', time: 'about 16 hours ago' },
  ],
};

const VERDICTS: AnalystVerdict[] = ['Strong Sell', 'Sell', 'Hold', 'Buy', 'Strong Buy'];

export function getStockOverview(
  ticker: string,
  name?: string,
  price?: number,
  sector?: string,
): StockOverview {
  const t = ticker.toUpperCase();
  if (t === 'NVDA') return NVDA_OVERVIEW;

  const rand = mulberry32(t);
  const basePrice = price ?? +(20 + rand() * 480).toFixed(2);
  const up = rand() > 0.5;
  const closeChangePct = +((rand() * 4 - (up ? 1.2 : 2.8))).toFixed(2);
  const closeChange = +(basePrice * (closeChangePct / 100)).toFixed(2);
  const postChangePct = +((rand() * 0.8 - 0.3)).toFixed(2);
  const postChange = +(basePrice * (postChangePct / 100)).toFixed(2);

  // Price walk (40 points) ending near basePrice.
  const chart: number[] = [];
  let p = basePrice * (1 - closeChangePct / 100);
  for (let i = 0; i < 40; i++) {
    p += (rand() - 0.5) * basePrice * 0.006;
    chart.push(+p.toFixed(2));
  }
  chart[chart.length - 1] = basePrice;

  const volume = Array.from({ length: 40 }, (_, i) => ({
    value: +(0.5 + rand() * 5).toFixed(1),
    up: rand() > 0.45,
    ...(i === 39 ? { value: +(3 + rand() * 3).toFixed(1) } : {}),
  })) as { value: number; up: boolean }[];

  const shares = 0.5e9 + rand() * 4e9;
  const marketCap = basePrice * shares;
  const eps = +(basePrice / (12 + rand() * 30)).toFixed(2);
  const pe = +(basePrice / eps).toFixed(2);
  const revenueFY = marketCap * (0.15 + rand() * 0.25);
  const netIncomeFY = revenueFY * (0.08 + rand() * 0.3);

  const income: IncomePeriod[] = FY.map((period, i) => {
    const growth = 0.4 + i * 0.18 + rand() * 0.1;
    const rev = revenueFY * growth / (0.4 + 4 * 0.18);
    const margin = Math.round(12 + rand() * 44);
    return { period, revenue: Math.round(rev), netIncome: Math.round(rev * margin / 100), margin };
  });

  const QQ = ['Q1', 'Q2', 'Q3', 'Q4'].map(q => `${q} FY26`);
  const incomeQuarterly: IncomePeriod[] = QQ.map((period, i) => {
    const rev = (revenueFY / 4) * (0.85 + i * 0.1 + rand() * 0.1);
    const margin = Math.round(12 + rand() * 44);
    return { period, revenue: Math.round(rev), netIncome: Math.round(rev * margin / 100), margin };
  });

  const low = +(basePrice * (0.6 + rand() * 0.15)).toFixed(0);
  const high = +(basePrice * (1.4 + rand() * 0.8)).toFixed(0);
  const median = +((low + high) / 2 * (0.9 + rand() * 0.2)).toFixed(0);
  const verdictIdx = Math.min(4, Math.max(0, Math.round(rand() * 4)));
  const sentimentScore = [12, 32, 50, 72, 90][verdictIdx];

  const beatBase = () => Math.round(2 + rand() * 7);
  const earningsHistory: EarningsQuarter[] = EQ.map((period, i) => {
    const estE = +(eps * (0.7 + i * 0.12)).toFixed(2);
    const beat = beatBase();
    const isUpcoming = i === EQ.length - 1;
    return {
      period,
      estEps: estE,
      actualEps: isUpcoming ? 0 : +(estE * (1 + beat / 100)).toFixed(2),
      beatPct: isUpcoming ? 0 : beat,
      estRev: +((revenueFY / 1e9) * (0.2 + i * 0.05)).toFixed(0),
      actualRev: isUpcoming ? 0 : +((revenueFY / 1e9) * (0.2 + i * 0.05) * (1 + beat / 200)).toFixed(0),
    };
  });

  const guidanceRoll = rand();
  const guidance: 'Above' | 'Inline' | 'Below' = guidanceRoll > 0.66 ? 'Above' : guidanceRoll > 0.33 ? 'Inline' : 'Below';
  const lastReported = earningsHistory[3];
  const company = name ?? `${t} Inc.`;
  const sec = sector ?? 'Technology';

  return {
    ticker: t, name: company, sector: sec, industry: '',
    price: {
      atClose: basePrice, closeChange, closeChangePct, closeDate: 'Jun 16, 2026',
      postMarket: +(basePrice + postChange).toFixed(2), postChange, postChangePct, hasPostData: false,
    },
    chart, volume,
    keyStats: [
      { label: 'Average Volume', value: `${(20 + rand() * 180).toFixed(0)}M` },
      { label: 'Market Cap', value: fmtBig(marketCap) },
      { label: 'P/E Ratio (TTM)', value: pe.toFixed(2) },
      { label: '52 Week Range', value: `${low.toFixed(2)}-${high.toFixed(2)}` },
      { label: 'EPS (TTM)', value: `$${eps.toFixed(2)}` },
      { label: 'Revenue (FY)', value: fmtBig(revenueFY) },
      { label: 'Net Income (FY)', value: fmtBig(netIncomeFY) },
      { label: 'Beta', value: (0.6 + rand() * 1.8).toFixed(2) },
    ],
    income,
    incomeQuarterly,
    priceTarget: { low, median, high, current: basePrice },
    analystRating: { verdict: VERDICTS[verdictIdx], score: sentimentScore },
    about: null,
    profileSheet: {
      marketCap: fmtBig(marketCap), enterpriseValue: fmtBig(marketCap * (0.95 + rand() * 0.1)),
      pe: `${pe.toFixed(2)}x`, pb: `${(2 + rand() * 24).toFixed(2)}x`,
      ps: `${(1 + rand() * 18).toFixed(2)}x`, evEbitda: `${(8 + rand() * 20).toFixed(2)}x`,
      revenuePerShare: ((revenueFY / 1e9) / (shares / 1e9)).toFixed(2),
      eps: eps.toFixed(2), bvps: (basePrice / (4 + rand() * 20)).toFixed(2),
      dps: (rand() * 1.2).toFixed(2),
    },
    earningsPast: {
      period: 'Q1 FY27 · May 20, 2026',
      revenue: { result: 'Beat', est: `$${lastReported.estRev}B`, actual: `$${lastReported.actualRev}B` },
      eps: { result: 'Beat', est: `$${lastReported.estEps.toFixed(2)}`, actual: `$${lastReported.actualEps.toFixed(2)}` },
      guidance,
      summary: [
        `Revenue $${lastReported.actualRev}B, beating the $${lastReported.estRev}B estimate by ${lastReported.beatPct}%.`,
        `EPS of $${lastReported.actualEps.toFixed(2)} vs $${lastReported.estEps.toFixed(2)} expected.`,
        `Management ${guidance === 'Below' ? 'guided below consensus on the next quarter' : guidance === 'Above' ? 'raised forward guidance above consensus' : 'guided in line with expectations'}.`,
        `Margins held steady; capital allocation focused on buybacks and reinvestment.`,
      ],
    },
    earningsHistory,
    earningsUpcoming: {
      date: '~ Aug 26, 2026',
      epsEstimate: `$${(earningsHistory[4].estEps).toFixed(2)}`,
      revenueEstimate: `$${earningsHistory[4].estRev.toFixed(2)}B`,
      lookout: [
        `Whether ${t} can sustain its recent growth trajectory into the next quarter.`,
        'Forward guidance and any change to full-year outlook.',
        'Margin trends and commentary on demand environment.',
      ],
    },
    smartMoney: {
      insiderBuyPct: Math.round(rand() * 100),
      congress: {
        purchases: '$1.5M - $5M', purchaseTrades: Math.round(rand() * 40),
        sales: '$500K - $2.5M', saleTrades: Math.round(rand() * 25),
      },
      superInvestors: [
        { name: 'Citadel Advisors LLC', weightPct: +(10 + rand() * 20).toFixed(2) },
        { name: 'Tiger Global Management LLC', weightPct: +(8 + rand() * 14).toFixed(2) },
        { name: 'Coatue Management LLC', weightPct: +(5 + rand() * 12).toFixed(2) },
      ],
    },
    insiderTransactions: [
      { name: 'Director A', title: 'Director', trades: 2, type: rand() > 0.5 ? 'Buy' : 'Sell', date: 'Jun 2, 2026', average: `$${(basePrice * 0.98).toFixed(2)}`, value: fmtBig(marketCap * 0.0001) },
      { name: 'Officer B', title: 'Chief Financial Officer', trades: 1, type: 'Sell', date: 'May 28, 2026', average: `$${(basePrice * 1.02).toFixed(2)}`, value: fmtBig(marketCap * 0.00005) },
      { name: 'Director C', title: 'Director', trades: 1, type: 'Buy', date: 'May 14, 2026', average: `$${(basePrice * 0.95).toFixed(2)}`, value: fmtBig(marketCap * 0.00003) },
    ],
    news: [
      { title: `Analysts Weigh In on ${company} After Latest Quarter`, source: '247wallst.com', time: 'about 12 hours ago' },
      { title: `Is ${t} a Buy Right Now? Here's What the Charts Say`, source: 'fool.com', time: 'about 14 hours ago' },
      { title: `${company} Stock: 3 Things to Watch This Week`, source: 'marketwatch.com', time: 'about 16 hours ago' },
      { title: `Why ${t} Could Be a Long-Term Winner`, source: 'investors.com', time: 'about 18 hours ago' },
    ],
  };
}
