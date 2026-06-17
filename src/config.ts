export const APP_CONFIG = {
  USE_MOCK_DATA:   false,
  USE_MOCK_CLAUDE: false,
  MOCK_DELAY:      800,
  SHOW_DEV_BADGES: false,
} as const;

// ─── API keys (injected at build time from .env) ──────────────────────────────

export const KEYS = {
  polygon:     process.env.EXPO_PUBLIC_POLYGON_API_KEY     ?? '',
  fmp:         process.env.EXPO_PUBLIC_FMP_API_KEY         ?? '',
  whalewisdom: process.env.EXPO_PUBLIC_WHALEWISDOM_API_KEY ?? '',
  finnhub:     process.env.EXPO_PUBLIC_FINNHUB_API_KEY     ?? '',
  anthropic:   process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY   ?? '',
  newsapi:     process.env.EXPO_PUBLIC_NEWS_API_KEY        ?? '',
} as const;

// ─── Cache TTLs (milliseconds) ────────────────────────────────────────────────

export const TTL = {
  quote:         1 * 60_000,
  chart:         60 * 60_000,
  profile:       7 * 24 * 60 * 60_000,
  earnings:      6 * 60 * 60_000,
  news:          15 * 60_000,
  calendar:      4 * 60 * 60_000,
  fearGreed:     60 * 60_000,
  reddit:        30 * 60_000,
  insiderTrades: 24 * 60 * 60_000,
  congressional: 24 * 60 * 60_000,
  institutional: 24 * 60 * 60_000,
} as const;
