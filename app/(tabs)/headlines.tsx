import { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import {
  View, Text, StyleSheet, FlatList, ScrollView,
  Modal, Pressable, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { Headline, SourceArticle } from '../../src/mock';
import { useNewsStore } from '../../src/store/newsStore';
import THEME from '../../src/theme';
import { getTickerNews, getMarketNews, getFHQuote } from '../../src/services/finnhub';
import { newsToTradeIdea } from '../../src/services/claude';
import { TradeIdea } from '../../src/services/types';
import { TickerLogo } from '../../src/components/ui';
import ScalePressable from '../../src/components/ui/ScalePressable';
import VSkeleton from '../../src/components/ui/Skeleton';

const { colors, fontSize, fontWeight, fontFamily, radius, spacing } = THEME;

// ─── Sources bottom sheet ─────────────────────────────────────────────────────

function SourcesSheet({ item, onClose }: { item: Headline | null; onClose: () => void }) {
  const articles: SourceArticle[] = item?.clusterArticles ?? [];
  return (
    <Modal visible={!!item} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={sh.backdrop} onPress={onClose} />
      <View style={sh.sheet}>
        <View style={sh.sheetHeader}>
          <Text style={sh.sheetTitle}>Sources</Text>
          <ScalePressable onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
            <Ionicons name="close" size={20} color={colors.text.secondary} />
          </ScalePressable>
        </View>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={sh.list}>
          {articles.map((a, i) => (
            <View key={i} style={sh.row}>
              <View style={sh.rankBadge}>
                <Text style={sh.rankText}>{i + 1}</Text>
              </View>
              <Image
                source={{ uri: `https://www.google.com/s2/favicons?domain=${a.domain || a.source}&sz=32` }}
                style={sh.favicon}
                defaultSource={require('../../assets/icon.png')}
              />
              <View style={sh.rowMid}>
                <Text style={sh.rowHeadline} numberOfLines={2}>{a.headline}</Text>
                <Text style={sh.rowDomain}>{a.source}</Text>
              </View>
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>
  );
}

// ─── Trade idea sheet ─────────────────────────────────────────────────────────

const DIR_COLOR: Record<string, string> = {
  bullish: '#10B981', bearish: '#EF4444', neutral: '#F59E0B',
};
const DIR_ICON: Record<string, string> = {
  bullish: 'trending-up', bearish: 'trending-down', neutral: 'remove',
};
const CONF_COLOR: Record<string, string> = {
  high: '#10B981', medium: '#F59E0B', speculative: '#EF4444',
};

function TradeIdeaSheet({ item, onClose }: { item: Headline | null; onClose: () => void }) {
  const [idea, setIdea]       = useState<TradeIdea | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!item) { setIdea(null); setErrorMsg(null); return; }
    setLoading(true); setErrorMsg(null);
    newsToTradeIdea(item.headline, item.ticker || undefined, item.tickerPrice || undefined)
      .then(r => setIdea(r))
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        console.error('[TradeIdea] failed:', msg);
        setErrorMsg(msg);
      })
      .finally(() => setLoading(false));
  }, [item?.id]);

  const dir      = (idea?.direction ?? 'neutral') as string;
  const dirColor = DIR_COLOR[dir] ?? colors.text.primary;
  const dirIcon  = (DIR_ICON[dir] ?? 'remove') as 'trending-up' | 'trending-down' | 'remove';
  const confColor = CONF_COLOR[idea?.confidence ?? ''] ?? colors.text.muted;
  const primaryTicker = (idea?.stocks ?? [])[0] ?? item?.ticker ?? '';

  return (
    <Modal visible={!!item} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={ti.backdrop} onPress={onClose} />
      <View style={ti.sheet}>

        {/* Colour accent strip */}
        <View style={[ti.accentBar, { backgroundColor: loading ? colors.bg.elevated : dirColor }]} />

        {/* Header */}
        <View style={ti.header}>
          <View style={ti.headerLeft}>
            <Text style={ti.headerLabel}>TRADE IDEA</Text>
            {!!item?.ticker && <Text style={ti.headerSource} numberOfLines={1}>{item.headline.slice(0, 42)}…</Text>}
          </View>
          <ScalePressable onPress={onClose} style={ti.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
            <Ionicons name="close" size={18} color={colors.text.secondary} />
          </ScalePressable>
        </View>

        {loading && (
          <View style={ti.skeletonBody}>
            {/* Hero row */}
            <View style={ti.hero}>
              <VSkeleton width={56} height={56} borderRadius={14} />
              <View style={{ flex: 1, gap: 8 }}>
                <VSkeleton width={80} height={16} borderRadius={6} />
                <VSkeleton width={60} height={22} borderRadius={11} />
              </View>
              <VSkeleton width={52} height={22} borderRadius={11} />
            </View>
            {/* Rationale box */}
            <View style={[ti.rationaleBox, { gap: 8 }]}>
              <VSkeleton width={80} height={10} borderRadius={4} />
              <VSkeleton width="100%" height={13} borderRadius={4} />
              <VSkeleton width="90%" height={13} borderRadius={4} />
              <VSkeleton width="70%" height={13} borderRadius={4} />
            </View>
            {/* Metrics row */}
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {[1,2,3].map(k => (
                <View key={k} style={{ flex: 1, gap: 6 }}>
                  <VSkeleton width="60%" height={10} borderRadius={4} />
                  <VSkeleton width="80%" height={16} borderRadius={4} />
                </View>
              ))}
            </View>
          </View>
        )}

        {errorMsg && (
          <View style={ti.center}>
            <Ionicons name="alert-circle-outline" size={32} color={colors.text.muted} />
            <Text style={ti.hint}>Analysis failed</Text>
            <Text style={[ti.hint, { fontSize: 10, color: colors.text.muted }]} numberOfLines={3}>{errorMsg}</Text>
          </View>
        )}

        {idea && !loading && (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={ti.body}>

            {/* Hero: logo + ticker + direction badge */}
            <View style={ti.hero}>
              {!!primaryTicker && (
                <View style={ti.heroLogoWrap}>
                  <TickerLogo ticker={primaryTicker} size={56} borderRadius={14} />
                  <View style={[ti.heroDirBadge, { backgroundColor: dirColor }]}>
                    <Ionicons name={dirIcon} size={11} color="#fff" />
                  </View>
                </View>
              )}
              <View style={ti.heroText}>
                <Text style={ti.heroTicker}>{primaryTicker || '—'}</Text>
                <View style={[ti.dirPill, { backgroundColor: dirColor + '22', borderColor: dirColor + '55' }]}>
                  <Ionicons name={dirIcon} size={12} color={dirColor} />
                  <Text style={[ti.dirPillText, { color: dirColor }]}>{dir.toUpperCase()}</Text>
                </View>
              </View>
              <View style={[ti.confBadge, { backgroundColor: confColor + '18', borderColor: confColor + '40' }]}>
                <Text style={[ti.confText, { color: confColor }]}>{(idea.confidence ?? 'medium').toUpperCase()}</Text>
              </View>
            </View>

            {/* Rationale */}
            <View style={ti.rationaleBox}>
              <Text style={ti.rationaleLabel}>RATIONALE</Text>
              <Text style={ti.rationaleText}>{idea.reason ?? idea.rationale ?? '—'}</Text>
            </View>

            {/* Metrics */}
            <View style={ti.metricsRow}>
              {idea.entry && (
                <View style={[ti.metric, { borderTopColor: colors.status.green }]}>
                  <Ionicons name="enter-outline" size={14} color={colors.status.green} />
                  <Text style={ti.metricLabel}>ENTRY</Text>
                  <Text style={[ti.metricVal, { color: colors.status.green }]}>{idea.entry}</Text>
                </View>
              )}
              {idea.stop && (
                <View style={[ti.metric, { borderTopColor: colors.status.red }]}>
                  <Ionicons name="ban-outline" size={14} color={colors.status.red} />
                  <Text style={ti.metricLabel}>STOP</Text>
                  <Text style={[ti.metricVal, { color: colors.status.red }]}>{idea.stop}</Text>
                </View>
              )}
              {idea.timeframe && (
                <View style={[ti.metric, { borderTopColor: colors.accent.violet }]}>
                  <Ionicons name="time-outline" size={14} color={colors.accent.violet} />
                  <Text style={ti.metricLabel}>HORIZON</Text>
                  <Text style={[ti.metricVal, { color: colors.accent.violet }]}>{idea.timeframe}</Text>
                </View>
              )}
            </View>

          </ScrollView>
        )}

        <View style={ti.spacer} />
      </View>
    </Modal>
  );
}

const ti = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)' },
  sheet: {
    backgroundColor: colors.bg.card,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    maxHeight: '72%',
    borderTopWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5,
    borderColor: colors.border.default, overflow: 'hidden',
  },
  accentBar: { height: 3 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.sm,
    borderBottomWidth: 0.5, borderBottomColor: colors.border.subtle,
  },
  headerLeft:   { flex: 1, gap: 2 },
  headerLabel: {
    fontSize: 10, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold,
    color: colors.text.muted, letterSpacing: 1.4,
  },
  headerSource: {
    fontSize: fontSize.xs, fontFamily: fontFamily.regular,
    fontWeight: fontWeight.regular, color: colors.text.muted,
  },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.bg.elevated,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  center: { alignItems: 'center', paddingVertical: 48, gap: spacing.md },
  skeletonBody: { paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.lg },
  hint: {
    fontSize: fontSize.sm, fontFamily: fontFamily.regular,
    fontWeight: fontWeight.regular, color: colors.text.secondary,
    textAlign: 'center', paddingHorizontal: spacing.xl,
  },
  body: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.lg, gap: spacing.lg },

  // Hero row
  hero: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  heroLogoWrap: { position: 'relative' },
  heroDirBadge: {
    position: 'absolute', bottom: -4, right: -4,
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.bg.card,
  },
  heroText: { flex: 1, gap: 6 },
  heroTicker: {
    fontSize: fontSize.xxl, fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold, color: colors.text.primary,
  },
  dirPill: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  dirPillText: {
    fontSize: fontSize.xs, fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold, letterSpacing: 0.5,
  },
  confBadge: {
    borderWidth: 1, borderRadius: radius.sm,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    alignSelf: 'flex-start',
  },
  confText: {
    fontSize: 9, fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold, letterSpacing: 0.8,
  },

  // Rationale
  rationaleBox: {
    backgroundColor: colors.bg.elevated, borderRadius: radius.md,
    borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.md, gap: 6,
  },
  rationaleLabel: {
    fontSize: 9, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold,
    color: colors.text.muted, letterSpacing: 1.2,
  },
  rationaleText: {
    fontSize: fontSize.base, fontFamily: fontFamily.regular,
    fontWeight: fontWeight.regular, color: colors.text.primary, lineHeight: 22,
  },

  // Metrics
  metricsRow: { flexDirection: 'row', gap: spacing.sm },
  metric: {
    flex: 1, backgroundColor: colors.bg.elevated, borderRadius: radius.md,
    borderWidth: 0.5, borderColor: colors.border.default,
    borderTopWidth: 2,
    padding: spacing.md, gap: 5, alignItems: 'center',
  },
  metricLabel: {
    fontSize: 9, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold,
    color: colors.text.muted, letterSpacing: 0.8,
  },
  metricVal: {
    fontSize: fontSize.md, fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
  },
  spacer: { height: spacing.xl },
});

// ─── News card ────────────────────────────────────────────────────────────────

function NewsCard({ item, onSourcesPress, onTradeIdeaPress }: { item: Headline; onSourcesPress: () => void; onTradeIdeaPress: () => void }) {
  const hasPrice    = item.tickerPrice > 0;
  const pos         = item.tickerChange >= 0;
  const changeColor = pos ? colors.status.green : colors.status.red;
  const changeStr   = hasPrice ? `${pos ? '+' : ''}${item.tickerChange.toFixed(2)}%` : '—';
  const priceStr    = hasPrice
    ? `$${item.tickerPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—';
  const sourceCount = item.sourceCount ?? 1;

  return (
    <ScalePressable
      style={s.card}
      onPress={() => router.push({ pathname: '/news/[id]', params: { id: item.id } })}
      scaleTo={0.95}
    >
      {/* Top row: time dot + time */}
      <View style={s.cardTopRow}>
        <View style={s.timeDot} />
        <Text style={s.cardTime}>{item.time}</Text>
      </View>

      {/* Headline */}
      <Text style={s.cardHeadline} numberOfLines={3}>{item.headline}</Text>

      {/* Summary */}
      {!!item.summary && (
        <Text style={s.cardSummary} numberOfLines={2}>{'- '}{item.summary}</Text>
      )}

      {/* Stock chip — only when we have a ticker */}
      {!!item.ticker && (
        <View style={s.stockRow}>
          <TickerLogo
            ticker={item.ticker}
            size={36}
            borderRadius={8}
            onPress={() => router.push({ pathname: '/stock/[ticker]', params: { ticker: item.ticker } })}
          />
          <View style={s.stockMid}>
            <Text style={s.stockTicker}>{item.ticker}</Text>
            <Text style={s.stockName} numberOfLines={1}>{item.tickerName}</Text>
          </View>
          <View style={s.stockPrice}>
            <Text style={s.priceText}>{priceStr}</Text>
            <Text style={[s.changeText, { color: hasPrice ? changeColor : colors.text.muted }]}>{changeStr}</Text>
          </View>
        </View>
      )}

      {/* Bottom row: sources badge + trade idea */}
      <View style={s.cardFooter}>
        {sourceCount > 1 ? (
          <ScalePressable style={s.sourcesChip} onPress={onSourcesPress}>
            <Ionicons name="newspaper-outline" size={12} color={colors.accent.violet} />
            <Text style={s.sourcesChipText}>{sourceCount} Sources</Text>
            <Ionicons name="chevron-forward" size={11} color={colors.accent.violet} />
          </ScalePressable>
        ) : <View />}
        <ScalePressable style={s.tradeIdeaBtn} onPress={onTradeIdeaPress}>
          <Ionicons name="flash-outline" size={12} color={colors.status.amber} />
          <Text style={s.tradeIdeaText}>Trade Idea</Text>
        </ScalePressable>
      </View>
    </ScalePressable>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function DateHeader({ label }: { label: string }) {
  return <Text style={s.dateHeader}>{label}</Text>;
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type ListItem =
  | { type: 'header'; label: string }
  | { type: 'news'; item: Headline };

function isToday(ms: number): boolean {
  const d = new Date(ms), n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

type UnifiedArticle = {
  id: string; url: string; headline: string; summary: string;
  ticker: string; datetime: number; source: string; logoUrl: string;
};

function domainOf(url: string): string {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return ''; }
}

// Map Finnhub publisher names → canonical domains for favicon lookups
const PUBLISHER_DOMAIN: Record<string, string> = {
  'yahoo finance':        'finance.yahoo.com',
  'reuters':              'reuters.com',
  'bloomberg':            'bloomberg.com',
  'marketwatch':          'marketwatch.com',
  'cnbc':                 'cnbc.com',
  'the wall street journal': 'wsj.com',
  'seeking alpha':        'seekingalpha.com',
  "barron's":             'barrons.com',
  'business insider':     'businessinsider.com',
  'motley fool':          'fool.com',
  'techcrunch':           'techcrunch.com',
  'fortune':              'fortune.com',
  'forbes':               'forbes.com',
  'investopedia':         'investopedia.com',
  'benzinga':             'benzinga.com',
  'the street':           'thestreet.com',
};

function faviconDomain(source: string, url: string): string {
  const urlDomain = domainOf(url);
  if (urlDomain && urlDomain !== 'finnhub.io') return urlDomain;
  return PUBLISHER_DOMAIN[source.toLowerCase()] ?? urlDomain;
}

export default function HeadlinesScreen() {
  const [articles, setArticles]   = useState<Headline[]>([]);
  const [loading, setLoading]     = useState(true);
  const [sourcesItem, setSourcesItem] = useState<Headline | null>(null);
  const [tradeItem, setTradeItem]     = useState<Headline | null>(null);
  const loadedRef = useRef(false);
  const storeArticles = useNewsStore(st => st.setArticles);

  const loadUSNews = useCallback(async () => {
    if (loadedRef.current) return;
    loadedRef.current = true;
    setLoading(true);
    try {
      const TICKER_RE = /^[A-Z]{1,5}$/;
      const WATCH = ['AAPL','MSFT','NVDA','TSLA','META','GOOGL','AMZN','JPM','AMD','COIN','NFLX','GS','BAC','UBER','PLTR'];

      // Finnhub ticker news + general market news
      const [tickerBatches, generalNews] = await Promise.all([
        Promise.all(WATCH.map(t => getTickerNews(t, 3).catch(() => []))),
        getMarketNews('general').catch(() => []),
      ]);

      const allFinnhub = [...tickerBatches.flat(), ...generalNews];

      const unified: UnifiedArticle[] = allFinnhub.map(a => ({
        id:       String(a.id),
        url:      a.url,
        headline: a.headline,
        summary:  a.summary,
        ticker:   (a.ticker ?? '').split(',').map(t => t.trim()).find(t => TICKER_RE.test(t)) ?? '',
        datetime: a.datetime * 1000,
        source:   a.source || domainOf(a.url),
        logoUrl:  '',
      }));

      const seen = new Set<string>();
      const all = unified
        .filter(a => a.url && a.headline && !a.headline.startsWith('[Removed]'))
        .filter(a => { if (seen.has(a.url)) return false; seen.add(a.url); return true; })
        .sort((a, b) => b.datetime - a.datetime);

      if (!all.length) { setLoading(false); return; }

      const cutoff = Date.now() - 48 * 60 * 60 * 1000;
      const recent = all.filter(a => a.datetime >= cutoff).slice(0, 80);

      const mapped: Headline[] = recent.map(a => ({
        id:           a.id,
        time:         new Date(a.datetime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
        date:         isToday(a.datetime) ? 'today' : 'yesterday',
        country:      'United States',
        headline:     a.headline,
        summary:      a.summary,
        ticker:       a.ticker,
        tickerName:   a.ticker,
        tickerPrice:  0,
        tickerChange: 0,
        url:          a.url,
        source:       a.source,
        logoUrl:      a.logoUrl,
        sourceCount:  1,
        clusterArticles: [],
      }));

      // Fetch prices
      const uniqueTickers = [...new Set(mapped.map(a => a.ticker).filter(t => t.length > 0))].slice(0, 25);
      const quotePairs = await Promise.all(
        uniqueTickers.map(t => getFHQuote(t).then(q => [t, q] as const).catch(() => [t, null] as const))
      );

      const quotes: Record<string, { price: number; changePct: number }> = {};
      for (const [t, q] of quotePairs) {
        if (q && q.price > 0) quotes[t] = { price: q.price, changePct: q.changePct };
      }

      const withPrices = mapped.map(a => ({
        ...a,
        tickerPrice:  quotes[a.ticker]?.price     ?? 0,
        tickerChange: quotes[a.ticker]?.changePct ?? 0,
      }));

      // Group by ticker: keep the most recent article as lead, bundle the rest as sources
      const tickerGroups = new Map<string, typeof withPrices>();
      const noTickerItems: typeof withPrices = [];

      for (const article of withPrices) {
        if (!article.ticker) { noTickerItems.push(article); continue; }
        if (!tickerGroups.has(article.ticker)) tickerGroups.set(article.ticker, []);
        tickerGroups.get(article.ticker)!.push(article);
      }

      const grouped: Headline[] = [];
      for (const members of tickerGroups.values()) {
        const lead = members[0];
        grouped.push({
          ...lead,
          sourceCount: members.length,
          clusterArticles: members.map(m => ({
            url:      m.url ?? '',
            headline: m.headline,
            source:   m.source ?? '',
            domain:   faviconDomain(m.source ?? '', m.url ?? ''),
          })),
        });
      }
      // Append no-ticker articles at the end
      for (const a of noTickerItems) {
        grouped.push({ ...a, sourceCount: 1, clusterArticles: [] });
      }

      const finalArticles = grouped;

      setArticles(finalArticles);
      storeArticles(finalArticles);
    } catch {
      // keep empty state
    } finally {
      setLoading(false);
    }
  }, [storeArticles]);

  useEffect(() => { loadUSNews(); }, [loadUSNews]);

  // ── List data ─────────────────────────────────────────────────────────────

  const listData = useMemo<ListItem[]>(() => {
    const today     = articles.filter(n => n.date === 'today');
    const yesterday = articles.filter(n => n.date === 'yesterday');
    const items: ListItem[] = [];
    if (today.length)     { items.push({ type: 'header', label: 'Today' });     today.forEach(i => items.push({ type: 'news', item: i })); }
    if (yesterday.length) { items.push({ type: 'header', label: 'Yesterday' }); yesterday.forEach(i => items.push({ type: 'news', item: i })); }
    return items;
  }, [articles]);

  return (
    <SafeAreaView style={s.container}>

      {/* Header */}
      <View style={s.header}>
        <ScalePressable hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
          <Ionicons name="menu-outline" size={24} color={colors.text.primary} />
        </ScalePressable>
        <Text style={s.headerTitle}>Top Headlines</Text>
        <View style={s.headerRight}>
          <ScalePressable hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
            <Ionicons name="options-outline" size={22} color={colors.text.secondary} />
          </ScalePressable>
          <ScalePressable hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
            <Ionicons name="search-outline" size={22} color={colors.text.secondary} />
          </ScalePressable>
        </View>
      </View>

      {/* List */}
      {loading ? (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md, gap: spacing.md }}>
          {[1,2,3,4].map(k => (
            <View key={k} style={{ gap: 10, paddingVertical: spacing.sm }}>
              <VSkeleton width={60} height={10} borderRadius={4} />
              <VSkeleton width="100%" height={15} borderRadius={4} />
              <VSkeleton width="75%" height={15} borderRadius={4} />
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 4 }}>
                <VSkeleton width={36} height={36} borderRadius={8} />
                <View style={{ flex: 1, gap: 6 }}>
                  <VSkeleton width={50} height={11} borderRadius={4} />
                  <VSkeleton width={100} height={10} borderRadius={4} />
                </View>
              </View>
            </View>
          ))}
        </View>
      ) : listData.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="newspaper-outline" size={36} color={colors.text.muted} />
          <Text style={s.emptyText}>No headlines yet</Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, i) => item.type === 'header' ? `h-${i}` : item.item.id}
          renderItem={({ item }) =>
            item.type === 'header'
              ? <DateHeader label={item.label} />
              : <NewsCard item={item.item} onSourcesPress={() => setSourcesItem(item.item)} onTradeIdeaPress={() => setTradeItem(item.item)} />
          }
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      )}

      {/* Sources sheet */}
      <SourcesSheet item={sourcesItem} onClose={() => setSourcesItem(null)} />
      {/* Trade idea sheet */}
      <TradeIdeaSheet item={tradeItem} onClose={() => setTradeItem(null)} />

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: colors.border.subtle,
  },
  headerTitle: {
    fontSize: fontSize.xl, fontFamily: fontFamily.semibold,
    fontWeight: fontWeight.semibold, color: colors.text.primary,
  },
  headerRight: { flexDirection: 'row', gap: spacing.md },

  filterWrap:   { position: 'relative' },
  filterScroll: { paddingHorizontal: spacing.xl },
  filterTab:    { paddingHorizontal: 4, paddingVertical: spacing.sm, marginRight: spacing.lg, alignItems: 'center' },
  filterText: {
    fontSize: fontSize.md, fontFamily: fontFamily.regular,
    fontWeight: fontWeight.regular, color: colors.text.muted, paddingBottom: 6,
  },
  filterTextActive: { color: colors.text.primary, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium },
  filterUnderline:  { position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, backgroundColor: colors.accent.violet, borderRadius: 1 },
  filterBorder:     { height: 0.5, backgroundColor: colors.border.subtle },

  list:      { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  separator: { height: spacing.sm },

  dateHeader: {
    fontSize: fontSize.lg, fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold, color: colors.text.primary,
    paddingTop: spacing.xl, paddingBottom: spacing.sm,
  },

  card: {
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 0.5, borderColor: colors.border.default, gap: 8,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeDot:    { width: 6, height: 6, borderRadius: radius.full, backgroundColor: colors.accent.violet + '80' },
  cardTime: {
    fontSize: fontSize.xs, fontFamily: fontFamily.regular,
    fontWeight: fontWeight.regular, color: colors.text.muted,
  },

  cardHeadline: {
    fontSize: fontSize.md, fontFamily: fontFamily.semibold,
    fontWeight: fontWeight.semibold, color: colors.text.primary, lineHeight: 22,
  },
  cardSummary: {
    fontSize: fontSize.sm, fontFamily: fontFamily.regular,
    fontWeight: fontWeight.regular, color: colors.text.secondary, lineHeight: 19,
  },

  stockRow:   { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  stockMid:   { flex: 1 },
  stockTicker: {
    fontSize: fontSize.base, fontFamily: fontFamily.semibold,
    fontWeight: fontWeight.semibold, color: colors.text.primary,
  },
  stockName: {
    fontSize: fontSize.xs, fontFamily: fontFamily.regular,
    fontWeight: fontWeight.regular, color: colors.text.muted,
  },
  stockPrice:  { alignItems: 'flex-end' },
  priceText: {
    fontSize: fontSize.base, fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium, color: colors.text.primary,
  },
  changeText: {
    fontSize: fontSize.xs, fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium,
  },

  cardFooter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  sourcesChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.accent.violet + '18', borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderWidth: 0.5, borderColor: colors.accent.violet + '40',
  },
  sourcesChipText: {
    fontSize: fontSize.xs, fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium, color: colors.accent.violet,
  },

  tradeIdeaBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: colors.status.amber + '18', borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderWidth: 0.5, borderColor: colors.status.amber + '40',
  },
  tradeIdeaText: {
    fontSize: fontSize.xs, fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium, color: colors.status.amber,
  },

  empty:     { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  emptyText: {
    fontSize: fontSize.md, fontFamily: fontFamily.regular,
    fontWeight: fontWeight.regular, color: colors.text.muted,
  },
});

// Sources sheet styles
const sh = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)' },
  sheet: {
    backgroundColor: colors.bg.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    maxHeight: '70%', paddingBottom: spacing.xl,
    borderTopWidth: 0.5, borderLeftWidth: 0.5, borderRightWidth: 0.5, borderColor: colors.border.default,
  },
  sheetHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: colors.border.subtle,
  },
  sheetTitle: {
    fontSize: fontSize.lg, fontFamily: fontFamily.semibold,
    fontWeight: fontWeight.semibold, color: colors.text.primary,
  },
  list: { paddingHorizontal: spacing.xl, paddingTop: spacing.sm },

  row: {
    flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm,
    paddingVertical: spacing.md, borderBottomWidth: 0.5, borderBottomColor: colors.border.subtle,
  },
  rankBadge: {
    width: 22, height: 22, borderRadius: radius.full, backgroundColor: colors.bg.elevated,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  rankText: {
    fontSize: fontSize.xs, fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium, color: colors.text.muted,
  },
  favicon:  { width: 20, height: 20, borderRadius: 4, flexShrink: 0, marginTop: 2 },
  rowMid:   { flex: 1 },
  rowHeadline: {
    fontSize: fontSize.sm, fontFamily: fontFamily.medium,
    fontWeight: fontWeight.medium, color: colors.text.primary, lineHeight: 18,
  },
  rowDomain: {
    fontSize: fontSize.xs, fontFamily: fontFamily.regular,
    fontWeight: fontWeight.regular, color: colors.text.muted, marginTop: 2,
  },
});
