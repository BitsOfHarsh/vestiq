import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Image,
  TextInput, Modal, Pressable, KeyboardAvoidingView, Platform, Linking,
} from 'react-native';
import ScalePressable from '../../src/components/ui/ScalePressable';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import THEME from '../../src/theme';
import { TickerLogo } from '../../src/components/ui';
import { useNewsStore } from '../../src/store/newsStore';
import { getNewsAnalysis, NewsAnalysis, NewsWatchStock } from '../../src/services/claude';
import { getBatchQuotes } from '../../src/services/fmp';
import { getFHQuote } from '../../src/services/finnhub';

const { colors, fontSize, fontWeight, fontFamily, radius, spacing } = THEME;

// ─── Favicon via Google s2 service ───────────────────────────────────────────

function SourceFavicon({ domain, logoUrl, size = 20 }: { domain: string; logoUrl?: string; size?: number }) {
  const [failed, setFailed] = useState(false);
  const uri = !failed && (logoUrl || (domain ? `https://www.google.com/s2/favicons?domain=${domain}&sz=${size * 2}` : ''));
  if (!uri) {
    return (
      <View style={[fav.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
        <Text style={[fav.fallbackText, { fontSize: size * 0.45 }]}>{domain?.[0]?.toUpperCase() ?? '?'}</Text>
      </View>
    );
  }
  return (
    <Image
      source={{ uri }}
      style={{ width: size, height: size, borderRadius: logoUrl ? radius.sm : size * 0.25 }}
      onError={() => setFailed(true)}
      resizeMode="contain"
    />
  );
}

const fav = StyleSheet.create({
  fallback: { backgroundColor: colors.bg.secondary, alignItems: 'center', justifyContent: 'center' },
  fallbackText: { color: colors.text.muted, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium },
});

// ─── Market Impact bar ────────────────────────────────────────────────────────

function MarketImpactBar({ value }: { value: number }) {
  const total = 30;
  const filled = Math.round((value / 100) * total);
  return (
    <View style={imp.card}>
      <Text style={imp.label}>MARKET IMPACT</Text>
      <View style={imp.track}>
        {Array.from({ length: total }).map((_, i) => (
          <View key={i} style={[imp.seg, { backgroundColor: i < filled ? colors.status.amber : colors.bg.secondary }]} />
        ))}
      </View>
      <View style={imp.labelsRow}>
        <Text style={imp.endLabel}>Low</Text>
        <Text style={imp.endLabel}>High</Text>
      </View>
    </View>
  );
}

const imp = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.md, gap: spacing.sm,
  },
  label: { fontSize: fontSize.xs, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.muted, letterSpacing: 0.6 },
  track: { flexDirection: 'row', gap: 2 },
  seg: { flex: 1, height: 8, borderRadius: 1 },
  labelsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  endLabel: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },
});

// ─── Watch stock card ─────────────────────────────────────────────────────────

const SENTIMENT_CONFIG = {
  bullish: { label: 'Bullish', color: colors.status.green, icon: 'trending-up' as const },
  bearish: { label: 'Bearish', color: colors.status.red,   icon: 'trending-down' as const },
  neutral: { label: 'Neutral', color: colors.text.muted,   icon: 'minus' as const },
};

function WatchStockCard({
  stock, price, changePct, tickerName,
}: {
  stock: NewsWatchStock;
  price: number;
  changePct: number;
  tickerName: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const cfg = SENTIMENT_CONFIG[stock.sentiment];
  const pos = changePct >= 0;

  return (
    <View style={ws.card}>
      <ScalePressable
        style={ws.row}
        onPress={() => router.push({ pathname: '/stock/[ticker]', params: { ticker: stock.ticker, name: tickerName } })}
      >
        <TickerLogo ticker={stock.ticker} size={36} borderRadius={8} />
        <View style={ws.middle}>
          <View style={ws.nameRow}>
            <Text style={ws.ticker}>{stock.ticker}</Text>
            <Feather name={cfg.icon} size={12} color={cfg.color} />
            <Text style={[ws.sentiment, { color: cfg.color }]}>{cfg.label}</Text>
          </View>
          <Text style={ws.name} numberOfLines={1}>{tickerName || stock.ticker}</Text>
        </View>
        {price > 0 && (
          <View style={ws.priceCol}>
            <Text style={ws.price}>${price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
            <Text style={[ws.change, { color: pos ? colors.status.green : colors.status.red }]}>
              {pos ? '+' : ''}{changePct.toFixed(2)}%
            </Text>
          </View>
        )}
      </ScalePressable>

      {expanded && <Text style={ws.desc}>{stock.reason}</Text>}

      <ScalePressable
        style={ws.readMoreBtn}
        onPress={() => setExpanded(e => !e)}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        scaleTo={0.95}
      >
        <Text style={ws.readMoreText}>Read More </Text>
        <Feather name={expanded ? 'chevron-up' : 'chevron-down'} size={12} color={colors.accent.brand} />
      </ScalePressable>
    </View>
  );
}

const ws = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.md, gap: spacing.sm,
  },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  middle: { flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 5 },
  ticker: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  dash: { fontSize: fontSize.sm, color: colors.text.muted },
  sentiment: { fontSize: fontSize.xs, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium },
  name: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.secondary, marginTop: 2 },
  priceCol: { alignItems: 'flex-end' },
  price: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  change: { fontSize: fontSize.xs, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium },
  desc: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.secondary, lineHeight: 20 },
  readMoreBtn: { flexDirection: 'row', alignItems: 'center' },
  readMoreText: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.accent.brand },
});

// ─── Sources modal ────────────────────────────────────────────────────────────

function SourcesModal({ visible, onClose, url, source, logoUrl }: {
  visible: boolean;
  onClose: () => void;
  url?: string;
  source?: string;
  logoUrl?: string;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={src.overlay} onPress={onClose}>
        <Pressable style={src.sheet} onPress={() => {}}>
          <View style={src.header}>
            <Text style={src.title}>Sources</Text>
            <ScalePressable onPress={onClose} style={src.closeBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
              <Feather name="x" size={18} color={colors.text.primary} />
            </ScalePressable>
          </View>

          {url ? (
            <ScalePressable
              style={src.sourceRow}
              onPress={() => { Linking.openURL(url).catch(() => {}); }}
            >
              <View style={src.numBadge}>
                <Text style={src.numText}>1</Text>
              </View>
              <View style={src.sourceBody}>
                <Text style={src.sourceTitle} numberOfLines={2}>
                  {url.split('/').filter(Boolean).slice(2).join('/').slice(0, 80)}
                </Text>
                <View style={src.sourceMeta}>
                  <SourceFavicon domain={source ?? ''} logoUrl={logoUrl} size={14} />
                  <Text style={src.sourceDomain}>{source}</Text>
                </View>
              </View>
              <Feather name="external-link" size={16} color={colors.text.muted} />
            </ScalePressable>
          ) : (
            <Text style={src.empty}>No source URL available</Text>
          )}

          <View style={{ height: spacing.xl }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const src = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    borderTopWidth: 0.5, borderColor: colors.border.default,
    paddingTop: spacing.xl, paddingHorizontal: spacing.xl,
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  title: { fontSize: fontSize.xl, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.bg.secondary, alignItems: 'center', justifyContent: 'center',
  },
  sourceRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    paddingVertical: spacing.md,
    borderTopWidth: 0.5, borderTopColor: colors.border.default,
  },
  numBadge: {
    width: 28, height: 28, borderRadius: radius.sm,
    backgroundColor: colors.bg.secondary, alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  numText: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  sourceBody: { flex: 1, gap: 4 },
  sourceTitle: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary, lineHeight: 20 },
  sourceMeta: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sourceDomain: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },
  empty: { fontSize: fontSize.md, color: colors.text.muted, paddingVertical: spacing.xl, textAlign: 'center' },
});

// ─── Skeleton placeholder ─────────────────────────────────────────────────────

function SkeletonBlock({ height = 16, widthPct = 100, style = {} }: { height?: number; widthPct?: number; style?: object }) {
  return <View style={[{ height, borderRadius: radius.sm, backgroundColor: colors.bg.secondary, opacity: 0.6, width: `${widthPct}%` as `${number}%` }, style]} />;
}

// ─── Main detail screen ───────────────────────────────────────────────────────

export default function NewsDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [sourcesVisible, setSourcesVisible] = useState(false);
  const [askText, setAskText] = useState('');
  const [analysis, setAnalysis] = useState<NewsAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [watchPrices, setWatchPrices] = useState<Record<string, { price: number; changePct: number; name: string }>>({});

  const getById = useNewsStore(s => s.getById);
  const item = getById(id);

  useEffect(() => {
    if (!item) return;
    setAnalysisLoading(true);
    getNewsAnalysis(item.headline, item.summary, item.ticker)
      .then(async (result) => {
        if (!result) return;
        setAnalysis(result);
        // Fetch prices for watch stocks
        const tickers = result.watchStocks.map(s => s.ticker).filter(Boolean);
        if (tickers.length) {
          const fmpQuotes = await getBatchQuotes(tickers).catch((): Record<string, import('../../src/services/fmp').FMPQuote> => ({}));
          const merged: Record<string, { price: number; changePct: number; name: string }> = {};
          // Fill from FMP first, then fall back to Finnhub for any with no price
          await Promise.all(tickers.map(async (t) => {
            const fmp = fmpQuotes[t];
            if (fmp && fmp.price > 0) {
              merged[t] = { price: fmp.price, changePct: fmp.changePct, name: fmp.ticker ?? t };
            } else {
              const fh = await getFHQuote(t).catch(() => null);
              merged[t] = { price: fh?.price ?? 0, changePct: fh?.changePct ?? 0, name: t };
            }
          }));
          setWatchPrices(merged);
        }
      })
      .finally(() => setAnalysisLoading(false));
  }, [item?.id]);

  if (!item) {
    return (
      <SafeAreaView style={d.container}>
        <ScalePressable style={d.backBtn} onPress={() => router.back()} scaleTo={0.88}>
          <Feather name="chevron-left" size={22} color={colors.text.primary} />
        </ScalePressable>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.text.muted }}>Article not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const pos = item.tickerChange >= 0;
  const changeStr = `${pos ? '+' : ''}${item.tickerChange.toFixed(2)}%`;

  const bullets      = analysis?.bullets ?? [];
  const marketImpact = analysis?.marketImpact ?? 0;
  const whatItMeans  = analysis?.whatItMeansForYou ?? [];
  const watchStocks  = analysis?.watchStocks ?? [];
  const digDeeper    = analysis?.digDeeper ?? [];
  const publishedAgo = (() => {
    const diff = Date.now() / 1000 - (parseInt(id, 10) || Date.now() / 1000);
    if (diff < 3600) return `${Math.round(diff / 60)} mins ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
    return 'yesterday';
  })();

  const hasContent = bullets.length > 0 || analysisLoading;
  const sourceDomain = item.source ?? '';

  return (
    <SafeAreaView style={d.container} edges={['top']}>
      {/* Header */}
      <View style={d.header}>
        <ScalePressable onPress={() => router.back()} style={d.headerIconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
          <Feather name="chevron-left" size={22} color={colors.text.primary} />
        </ScalePressable>
        <Text style={d.headerTitle}>VESTIQ</Text>
        <View style={d.headerRight}>
          <ScalePressable style={d.headerIconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
            <Feather name="copy" size={20} color={colors.text.secondary} />
          </ScalePressable>
          <ScalePressable
            style={d.headerIconBtn}
            onPress={() => item.url && Linking.openURL(item.url).catch(() => {})}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            scaleTo={0.88}
          >
            <Feather name="share-2" size={20} color={colors.text.secondary} />
          </ScalePressable>
        </View>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={d.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Headline */}
          <Text style={d.headline}>{item.headline}</Text>

          {/* Meta row */}
          <View style={d.metaRow}>
            <Text style={d.metaText}>Published {publishedAgo}</Text>
          </View>

          {/* ── Loading skeleton ── */}
          {analysisLoading && (
            <View style={d.skeletonWrap}>
              <SkeletonBlock height={14} />
              <SkeletonBlock height={14} widthPct={85} />
              <SkeletonBlock height={14} widthPct={70} />
            </View>
          )}

          {/* ── Bullets ── */}
          {bullets.length > 0 && (
            <View style={d.bullets}>
              {bullets.map((b, i) => (
                <View key={i} style={d.bulletRow}>
                  <Text style={d.bulletDot}>•</Text>
                  <Text style={d.bulletText}>{b}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Fallback: summary when no analysis yet */}
          {!hasContent && (
            <Text style={d.simpleSummary}>{item.summary}</Text>
          )}

          {/* ── Market Impact ── */}
          {(marketImpact > 0 || analysisLoading) && (
            analysisLoading
              ? <SkeletonBlock height={64} />
              : <MarketImpactBar value={marketImpact} />
          )}

          {/* ── What It Means For You ── */}
          {whatItMeans.length > 0 && (
            <>
              <Text style={d.sectionTitle}>What It Means for You</Text>
              <View style={d.wifouList}>
                {whatItMeans.map((it, i) => (
                  <View key={i} style={d.wifouRow}>
                    <Text style={d.bulletDot}>•</Text>
                    <Text style={d.wifouText}>
                      <Text style={d.wifouBold}>{it.bold}</Text>
                      <Text>{it.text}</Text>
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {/* ── What to Watch ── */}
          {watchStocks.length > 0 && (
            <>
              <Text style={d.sectionTitle}>What to Watch</Text>
              <View style={d.watchList}>
                {watchStocks.map(stock => (
                  <WatchStockCard
                    key={stock.ticker}
                    stock={stock}
                    price={watchPrices[stock.ticker]?.price ?? 0}
                    changePct={watchPrices[stock.ticker]?.changePct ?? 0}
                    tickerName={watchPrices[stock.ticker]?.name ?? stock.ticker}
                  />
                ))}
              </View>
            </>
          )}

          {/* Fallback: single stock when no watch stocks */}
          {watchStocks.length === 0 && !analysisLoading && item.ticker && (
            <>
              <Text style={d.sectionTitle}>What to Watch</Text>
              <ScalePressable
                style={d.simpleStock}
                onPress={() => router.push({ pathname: '/stock/[ticker]', params: { ticker: item.ticker } })}
              >
                <TickerLogo ticker={item.ticker} size={36} borderRadius={8} />
                <View style={{ flex: 1 }}>
                  <Text style={d.simpleTicker}>{item.ticker}</Text>
                  <Text style={d.simpleName}>{item.tickerName}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={d.simplePrice}>${item.tickerPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                  <Text style={[d.simpleChange, { color: pos ? colors.status.green : colors.status.red }]}>{changeStr}</Text>
                </View>
              </ScalePressable>
            </>
          )}

          {/* ── Dig Deeper ── */}
          {digDeeper.length > 0 && (
            <>
              <Text style={d.sectionTitle}>Dig Deeper</Text>
              <View style={d.digList}>
                {digDeeper.map((q, i) => (
                  <ScalePressable
                    key={i}
                    style={d.digCard}
                    onPress={() => setAskText(q)}
                  >
                    <Feather name="star" size={14} color={colors.accent.brand} />
                    <Text style={d.digText}>{q}</Text>
                    <Feather name="chevron-right" size={14} color={colors.text.muted} />
                  </ScalePressable>
                ))}
              </View>
            </>
          )}

          {/* Read Full Article */}
          {!!item.url && (
            <ScalePressable style={d.readMoreBtn} onPress={() => Linking.openURL(item.url!).catch(() => {})} scaleTo={0.98}>
              <Text style={d.readMoreText}>Read Full Article </Text>
              <Feather name="chevron-right" size={14} color={colors.text.secondary} />
            </ScalePressable>
          )}

          <View style={{ height: 120 }} />
        </ScrollView>

        {/* Ask bar */}
        <View style={[d.askBar, { paddingBottom: Math.max(insets.bottom, spacing.md) }]}>
          <View style={d.askInputWrap}>
            <TextInput
              style={d.askInput}
              placeholder="Ask about this news..."
              placeholderTextColor={colors.text.muted}
              value={askText}
              onChangeText={setAskText}
              returnKeyType="send"
            />
          </View>
          <View style={d.askActions}>
            <ScalePressable style={d.askActionBtn}>
              <Feather name="layers" size={14} color={colors.text.secondary} />
              <Text style={d.askActionText}>Skills</Text>
            </ScalePressable>
            <ScalePressable style={d.askActionBtn}>
              <Feather name="zap" size={14} color={colors.text.secondary} />
              <Text style={d.askActionText}>Blitz</Text>
            </ScalePressable>
            <ScalePressable
              style={d.askSendBtn}
              onPress={() => { if (askText.trim()) router.push('/(tabs)/research'); }}
              scaleTo={0.88}
            >
              <Feather name="arrow-up" size={16} color="#FFFFFF" />
            </ScalePressable>
          </View>
        </View>
      </KeyboardAvoidingView>

      <SourcesModal
        visible={sourcesVisible}
        onClose={() => setSourcesVisible(false)}
        url={item.url}
        source={sourceDomain}
        logoUrl={item.logoUrl}
      />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const d = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  backBtn: { padding: spacing.xl },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    borderBottomWidth: 0.5, borderBottomColor: colors.border.default,
  },
  headerTitle: { fontSize: fontSize.md, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary, letterSpacing: 1 },
  headerIconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerRight: { flexDirection: 'row' },

  scroll: { padding: spacing.xl, gap: spacing.lg },

  headline: { fontSize: fontSize.xxl, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary, lineHeight: 34 },

  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaText: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },
  sourcesRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  sourceAvatar: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.accent.brand },
  sourcesText: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },

  skeletonWrap: { gap: 8 },

  bullets: { gap: 10 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bulletDot: { fontSize: fontSize.md, color: colors.text.muted, lineHeight: 22, flexShrink: 0 },
  bulletText: { flex: 1, fontSize: fontSize.md, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.primary, lineHeight: 22 },

  sectionTitle: { fontSize: fontSize.xl, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary, marginTop: 4 },

  wifouList: { gap: 12 },
  wifouRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  wifouText: { flex: 1, fontSize: fontSize.md, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.primary, lineHeight: 22 },
  wifouBold: { fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },

  watchList: { gap: spacing.sm },

  digList: { gap: spacing.sm },
  digCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default,
    paddingHorizontal: spacing.md, paddingVertical: spacing.md, minHeight: 48,
  },
  digText: { flex: 1, fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary, lineHeight: 20 },

  readMoreBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
    justifyContent: 'center', minHeight: 48,
  },
  readMoreText: { fontSize: fontSize.md, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.secondary },

  simpleSummary: { fontSize: fontSize.md, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.secondary, lineHeight: 22 },
  simpleStock: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.md,
  },
  simpleTicker: { fontSize: fontSize.md, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  simpleName: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },
  simplePrice: { fontSize: fontSize.md, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  simpleChange: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium },

  askBar: {
    borderTopWidth: 0.5, borderTopColor: colors.border.default,
    backgroundColor: colors.bg.primary,
    paddingHorizontal: spacing.xl, paddingTop: spacing.sm, gap: spacing.sm,
  },
  askInputWrap: {
    borderWidth: 1, borderColor: colors.accent.brand, borderRadius: radius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 44,
    justifyContent: 'center',
  },
  askInput: { fontSize: fontSize.md, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.primary },
  askActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  askActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.bg.card, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: 7,
    borderWidth: 0.5, borderColor: colors.border.default, minHeight: 36,
  },
  askActionText: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.secondary },
  askSendBtn: {
    marginLeft: 'auto' as const, width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.accent.brand, alignItems: 'center', justifyContent: 'center',
  },
});
