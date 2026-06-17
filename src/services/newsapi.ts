import { KEYS, TTL } from '../config';
import { getCached, getStale } from './cache';

const BASE = 'https://newsapi.org/v2';
const KEY  = KEYS.newsapi;

function apiUrl(path: string, params: Record<string, string> = {}): string {
  const q = new URLSearchParams({ ...params, apiKey: KEY }).toString();
  return `${BASE}${path}?${q}`;
}

async function get<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`NewsAPI ${res.status}`);
  return res.json() as Promise<T>;
}

type RawArticle = {
  source: { id: string | null; name: string };
  title: string;
  description: string | null;
  url: string;
  urlToImage: string | null;
  publishedAt: string;
  content: string | null;
};

type RawResp = { status: string; articles: RawArticle[] };

export interface NewsAPIArticle {
  id: string;
  title: string;
  description: string;
  url: string;
  image: string;
  publishedAt: string;   // ISO-8601
  source: string;
  ticker: string | null; // best-guess ticker from title text, null if no confident match
}

// Reputable financial/tech news domains for the /everything endpoint
const FINANCIAL_DOMAINS = [
  'reuters.com', 'bloomberg.com', 'cnbc.com', 'marketwatch.com',
  'wsj.com', 'finance.yahoo.com', 'seekingalpha.com', 'benzinga.com',
  'thestreet.com', 'investors.com', 'fool.com', 'barrons.com',
  'ft.com', 'businessinsider.com', 'techcrunch.com', 'theverge.com',
  'forbes.com', 'fortune.com', 'axios.com', 'apnews.com',
].join(',');

// Reject obvious deal/shopping/non-market articles
const JUNK_PATTERNS = [
  /\$[\d.]+\s*(w\/|with)\s*(s&s|prime|subscribe|coupon|code)/i,
  /free shipping/i,
  /\d+%\s*off/i,
  /\bdeals?\b.*\bpack\b/i,
  /\bpack\b.*\b(for|at)\s*\$[\d.]+/i,
  /save \$[\d.]+/i,
  /promo code/i,
  /discount code/i,
];

function isJunk(title: string, description: string): boolean {
  const text = `${title} ${description}`;
  return JUNK_PATTERNS.some(p => p.test(text));
}

// ─── Company keyword → ticker map ─────────────────────────────────────────────

const KEYWORD_TICKER: Array<[string, string]> = [
  ['Apple Inc', 'AAPL'], ['Apple stock', 'AAPL'], ['iPhone', 'AAPL'], ['Tim Cook', 'AAPL'], ['Apple shares', 'AAPL'],
  ['Nvidia', 'NVDA'], ['Jensen Huang', 'NVDA'],
  ['Microsoft', 'MSFT'], ['Azure', 'MSFT'], ['Satya Nadella', 'MSFT'],
  ['Google', 'GOOGL'], ['Alphabet', 'GOOGL'], ['YouTube', 'GOOGL'], ['Sundar Pichai', 'GOOGL'],
  ['Tesla', 'TSLA'], ['Elon Musk', 'TSLA'], ['SpaceX', 'TSLA'],
  ['Amazon.com', 'AMZN'], ['Amazon stock', 'AMZN'], ['Amazon shares', 'AMZN'], ['AWS', 'AMZN'], ['Andy Jassy', 'AMZN'],
  ['Meta Platforms', 'META'], ['Facebook', 'META'], ['Instagram', 'META'], ['WhatsApp', 'META'], ['Mark Zuckerberg', 'META'],
  ['Netflix', 'NFLX'],
  ['AMD', 'AMD'], ['Advanced Micro Devices', 'AMD'],
  ['Intel', 'INTC'],
  ['Coinbase', 'COIN'],
  ['Palantir', 'PLTR'],
  ['SoFi', 'SOFI'],
  ['Alibaba', 'BABA'],
  ['JPMorgan', 'JPM'], ['JP Morgan', 'JPM'], ['Jamie Dimon', 'JPM'],
  ['Goldman Sachs', 'GS'],
  ['Bank of America', 'BAC'],
  ['Berkshire Hathaway', 'BRK.B'], ['Warren Buffett', 'BRK.B'],
  ['Bitcoin', 'BTCUSD'], [' BTC ', 'BTCUSD'],
  ['Ethereum', 'ETHUSD'],
  ['S&P 500', 'SPY'], ['S&P500', 'SPY'], ['Federal Reserve', 'SPY'], ['Fed rate', 'SPY'], ['Fed cut', 'SPY'],
  ['Nasdaq', 'QQQ'], ['Dow Jones', 'DIA'],
  ['Uber', 'UBER'], ['Lyft', 'LYFT'],
  ['Airbnb', 'ABNB'], ['Snap Inc', 'SNAP'],
];

export function inferTicker(title: string, description: string): string | null {
  const text = `${title} ${description}`.toLowerCase();
  for (const [kw, ticker] of KEYWORD_TICKER) {
    if (text.includes(kw.toLowerCase())) return ticker;
  }
  return null;
}

function mapArticles(raw: RawArticle[]): NewsAPIArticle[] {
  return raw
    .filter(a =>
      a.title &&
      a.title !== '[Removed]' &&
      !a.title.startsWith('[Removed]') &&
      !isJunk(a.title, a.description ?? '')
    )
    .map((a, i) => ({
      id:          `na_${i}_${a.publishedAt}`,
      title:       a.title,
      description: a.description ?? '',
      url:         a.url,
      image:       a.urlToImage ?? '',
      publishedAt: a.publishedAt,
      source:      a.source.name,
      ticker:      inferTicker(a.title, a.description ?? ''),
    }));
}

// ─── Top US business headlines ────────────────────────────────────────────────

export async function getBusinessHeadlines(pageSize = 50): Promise<NewsAPIArticle[]> {
  const cacheKey = 'newsapi_business_v2';
  try {
    return await getCached(cacheKey, TTL.news, async () => {
      const data = await get<RawResp>(apiUrl('/top-headlines', {
        country:  'us',
        category: 'business',
        pageSize: String(Math.min(pageSize, 100)),
      }));
      return mapArticles(data.articles ?? []);
    });
  } catch {
    return await getStale<NewsAPIArticle[]>(cacheKey) ?? [];
  }
}

// ─── Stock-specific search (financial domains only) ───────────────────────────

export async function getStockNewsSearch(pageSize = 50): Promise<NewsAPIArticle[]> {
  const cacheKey = 'newsapi_stocks_v2';
  try {
    return await getCached(cacheKey, TTL.news, async () => {
      const q = '"stock" OR "earnings" OR "shares" OR "market cap" OR "SEC filing" OR "Fed rate" OR "interest rate" OR "IPO" OR "quarterly results"';
      const data = await get<RawResp>(apiUrl('/everything', {
        q,
        domains:  FINANCIAL_DOMAINS,
        language: 'en',
        sortBy:   'publishedAt',
        pageSize: String(Math.min(pageSize, 100)),
      }));
      return mapArticles(data.articles ?? []);
    });
  } catch {
    return await getStale<NewsAPIArticle[]>(cacheKey) ?? [];
  }
}
