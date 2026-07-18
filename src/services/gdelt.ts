import AsyncStorage from '@react-native-async-storage/async-storage';

export interface GDELTArticle {
  id: string;
  url: string;
  headline: string;
  summary: string;
  ticker: string;
  datetime: number;
  source: string;
  logoUrl: string;
}

// English-language topic queries for each country tab
const COUNTRY_QUERIES: Record<string, string> = {
  India:     'India economy stock market Sensex Nifty',
  China:     'China economy stock market Shanghai trade',
  Japan:     'Japan economy stock market Nikkei Bank of Japan',
  Australia: 'Australia economy stock market ASX Reserve Bank',
  Europe:    'Europe economy stock market ECB eurozone',
};

const TTL_MS = 2 * 60 * 60_000; // 2 hours

function parseGDELTDate(s: string): number {
  // GDELT format: "20260620T183000Z"
  try {
    return new Date(
      `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(9, 11)}:${s.slice(11, 13)}:${s.slice(13, 15)}Z`,
    ).getTime();
  } catch {
    return Date.now();
  }
}

export async function getGDELTNews(country: string): Promise<GDELTArticle[]> {
  const query = COUNTRY_QUERIES[country];
  if (!query) return [];

  const cacheKey = `gdelt_${country}`;
  try {
    const raw = await AsyncStorage.getItem(cacheKey);
    if (raw) {
      const { data, ts } = JSON.parse(raw) as { data: GDELTArticle[]; ts: number };
      if (Date.now() - ts < TTL_MS) return data;
    }
  } catch { /* proceed to fetch */ }

  try {
    const url =
      `https://api.gdeltproject.org/api/v2/doc/doc` +
      `?query=${encodeURIComponent(query)}` +
      `&mode=artlist&maxrecords=25&sourcelang=eng&format=json`;

    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!res.ok) throw new Error(`GDELT ${res.status}`);

    type GDELTItem = { url?: string; title?: string; seendate?: string; domain?: string };
    type GDELTResp = { articles?: GDELTItem[] };

    const data = await res.json() as GDELTResp;
    const articles: GDELTArticle[] = (data.articles ?? [])
      .filter(a => a.url && a.title)
      .map((a, i) => ({
        id:       `gdelt_${country}_${i}`,
        url:      a.url ?? '',
        headline: a.title ?? '',
        summary:  '',
        ticker:   '',
        datetime: a.seendate ? parseGDELTDate(a.seendate) : Date.now(),
        source:   a.domain ?? '',
        logoUrl:  '',
      }));

    await AsyncStorage.setItem(cacheKey, JSON.stringify({ data: articles, ts: Date.now() }));
    return articles;
  } catch {
    return [];
  }
}
