import { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, Pressable, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import THEME from '../../src/theme';
import { MOCK_HEADLINES, HeadlineWatchStock, HeadlineDetail } from '../../src/mock';
import { TickerLogo } from '../../src/components/ui';

const { colors, fontSize, fontWeight, radius, spacing } = THEME;

// ─── Market Impact bar ────────────────────────────────────────────────────────

function MarketImpactBar({ value }: { value: number }) {
  const total = 30;
  const filled = Math.round((value / 100) * total);
  return (
    <View style={imp.card}>
      <Text style={imp.label}>MARKET IMPACT</Text>
      <View style={imp.track}>
        {Array.from({ length: total }).map((_, i) => (
          <View
            key={i}
            style={[imp.seg, { backgroundColor: i < filled ? colors.status.amber : colors.bg.secondary }]}
          />
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
  label: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.text.muted, letterSpacing: 0.6 },
  track: { flexDirection: 'row', gap: 2 },
  seg: { flex: 1, height: 8, borderRadius: 1 },
  labelsRow: { flexDirection: 'row', justifyContent: 'space-between' },
  endLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.muted },
});

// ─── Watch stock row ──────────────────────────────────────────────────────────

const SENTIMENT_CONFIG = {
  bullish: { label: 'Bullish', color: colors.status.green, icon: 'trending-up' as const },
  bearish: { label: 'Bearish', color: colors.status.red,   icon: 'trending-down' as const },
  neutral: { label: 'Neutral', color: colors.text.muted,   icon: 'remove' as const },
};

function WatchStockCard({ stock }: { stock: HeadlineWatchStock }) {
  const [expanded, setExpanded] = useState(false);
  const cfg = SENTIMENT_CONFIG[stock.sentiment];
  const pos = stock.change >= 0;
  const changeStr = `${pos ? '+' : ''}${stock.change.toFixed(2)}%`;

  return (
    <View style={ws.card}>
      <TouchableOpacity
        style={ws.row}
        activeOpacity={0.7}
        onPress={() => router.push({ pathname: '/stock/[ticker]', params: { ticker: stock.ticker, name: stock.name, price: String(stock.price) } })}
      >
        <TickerLogo ticker={stock.ticker} size={36} borderRadius={8} />
        <View style={ws.middle}>
          <View style={ws.nameRow}>
            <Text style={ws.ticker}>{stock.ticker}</Text>
            <Text style={ws.dash}> — </Text>
            <Ionicons name={cfg.icon} size={12} color={cfg.color} />
            <Text style={[ws.sentiment, { color: cfg.color }]}> {cfg.label}</Text>
          </View>
          <Text style={ws.name} numberOfLines={1}>{stock.name}</Text>
        </View>
        <View style={ws.priceCol}>
          <Text style={ws.price}>${stock.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
          <Text style={[ws.change, { color: pos ? colors.status.green : colors.status.red }]}>{changeStr}</Text>
        </View>
      </TouchableOpacity>

      {expanded && <Text style={ws.desc}>{stock.description}</Text>}

      <TouchableOpacity
        style={ws.readMoreBtn}
        onPress={() => setExpanded(e => !e)}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        <Text style={ws.readMoreText}>Read More </Text>
        <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={12} color={colors.accent.teal} />
      </TouchableOpacity>
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
  nameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  ticker: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text.primary },
  dash: { fontSize: fontSize.sm, color: colors.text.muted },
  sentiment: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  name: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.secondary, marginTop: 2 },
  priceCol: { alignItems: 'flex-end' },
  price: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text.primary },
  change: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  desc: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.secondary, lineHeight: 20 },
  readMoreBtn: { flexDirection: 'row', alignItems: 'center' },
  readMoreText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.accent.teal },
});

// ─── Full Breakdown sheet ─────────────────────────────────────────────────────

const BREAKDOWN_SECTIONS = [
  { key: 'whatIsHappening', title: 'What is Happening' },
  { key: 'whatDoesMean',    title: 'What Does This Mean' },
  { key: 'whyShouldICare', title: 'Why Should I Care' },
  { key: 'bullCase',        title: 'Bull Case' },
  { key: 'bearCase',        title: 'Bear Case' },
  { key: 'whatToWatch',     title: 'What to Watch' },
] as const;

function FullBreakdownSheet({
  visible,
  onClose,
  breakdown,
}: {
  visible: boolean;
  onClose: () => void;
  breakdown: HeadlineDetail['fullBreakdown'];
}) {
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={fbs.overlay} onPress={onClose}>
        <Pressable style={fbs.sheet} onPress={() => {}}>
          <View style={fbs.header}>
            <Text style={fbs.title}>Full Breakdown</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <View style={fbs.closeBtn}>
                <Ionicons name="close" size={18} color={colors.text.primary} />
              </View>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {BREAKDOWN_SECTIONS.map((section, i) => {
              const isOpen = expanded === section.key;
              const text = breakdown[section.key];
              return (
                <View key={section.key}>
                  <TouchableOpacity
                    style={fbs.sectionBtn}
                    onPress={() => setExpanded(isOpen ? null : section.key)}
                    activeOpacity={0.7}
                  >
                    <View style={fbs.sectionBody}>
                      <Text style={fbs.sectionTitle}>{section.title}</Text>
                      <Text style={fbs.sectionPreview} numberOfLines={isOpen ? undefined : 2}>{text}</Text>
                    </View>
                    <Ionicons
                      name={isOpen ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color={colors.text.muted}
                      style={{ marginTop: 4 }}
                    />
                  </TouchableOpacity>
                  {i < BREAKDOWN_SECTIONS.length - 1 && <View style={fbs.divider} />}
                </View>
              );
            })}
            <View style={{ height: spacing.xl }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const fbs = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: colors.bg.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl,
    borderTopWidth: 0.5, borderColor: colors.border.default,
    paddingTop: spacing.xl, paddingHorizontal: spacing.xl,
    maxHeight: '85%',
  },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: spacing.xl },
  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.medium, color: colors.text.primary },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: colors.bg.secondary, alignItems: 'center', justifyContent: 'center',
  },
  sectionBtn: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing.md, gap: spacing.sm },
  sectionBody: { flex: 1 },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: colors.text.primary, marginBottom: 4 },
  sectionPreview: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.secondary, lineHeight: 20 },
  divider: { height: 0.5, backgroundColor: colors.border.default },
});

// ─── Main detail screen ───────────────────────────────────────────────────────

export default function NewsDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [breakdownVisible, setBreakdownVisible] = useState(false);
  const [askText, setAskText] = useState('');

  const item = MOCK_HEADLINES.find(h => h.id === id);

  if (!item) {
    return (
      <SafeAreaView style={d.container}>
        <TouchableOpacity style={d.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: colors.text.muted }}>Article not found</Text>
        </View>
      </SafeAreaView>
    );
  }

  const detail = item.detail;
  const pos = item.tickerChange >= 0;
  const changeStr = `${pos ? '+' : ''}${item.tickerChange.toFixed(2)}%`;

  return (
    <SafeAreaView style={d.container} edges={['top']}>
      {/* Header */}
      <View style={d.header}>
        <TouchableOpacity onPress={() => router.back()} style={d.headerIconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={d.headerTitle}>BAREBONE</Text>
        <View style={d.headerRight}>
          <TouchableOpacity style={d.headerIconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="copy-outline" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity style={d.headerIconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="share-outline" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
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

          {detail ? (
            <>
              {/* Meta row */}
              <View style={d.metaRow}>
                <Text style={d.metaText}>Published {detail.publishedAgo}</Text>
                <View style={d.sourcesRow}>
                  <View style={d.sourceAvatars}>
                    {[colors.accent.teal, colors.status.blue, colors.status.amber].map((c, i) => (
                      <View key={i} style={[d.sourceAvatar, { backgroundColor: c, marginLeft: i > 0 ? -6 : 0 }]} />
                    ))}
                  </View>
                  <Text style={d.sourcesText}>{detail.sourcesCount} Sources</Text>
                </View>
              </View>

              {/* Key bullets */}
              <View style={d.bullets}>
                {detail.bullets.map((b, i) => (
                  <View key={i} style={d.bulletRow}>
                    <Text style={d.bulletDot}>•</Text>
                    <Text style={d.bulletText}>{b}</Text>
                  </View>
                ))}
              </View>

              {/* Market Impact */}
              <MarketImpactBar value={detail.marketImpact} />

              {/* What It Means For You */}
              <Text style={d.sectionTitle}>What It Means for You</Text>
              <View style={d.wifouList}>
                {detail.whatItMeansForYou.map((item, i) => (
                  <View key={i} style={d.wifouRow}>
                    <Text style={d.bulletDot}>•</Text>
                    <Text style={d.wifouText}>
                      <Text style={d.wifouBold}>{item.bold}</Text>
                      <Text>{item.text}</Text>
                    </Text>
                  </View>
                ))}
              </View>

              <TouchableOpacity
                style={d.readMoreBtn}
                onPress={() => setBreakdownVisible(true)}
                activeOpacity={0.7}
              >
                <Text style={d.readMoreText}>Read More </Text>
                <Ionicons name="chevron-forward" size={14} color={colors.text.secondary} />
              </TouchableOpacity>

              {/* What to Watch */}
              <Text style={d.sectionTitle}>What to Watch</Text>
              <View style={d.watchList}>
                {detail.watchStocks.map(stock => (
                  <WatchStockCard key={stock.ticker} stock={stock} />
                ))}
              </View>
            </>
          ) : (
            /* Simple view for headlines without detail */
            <>
              <Text style={d.simpleSummary}>{item.summary}</Text>
              <View style={d.simpleStock}>
                <TickerLogo ticker={item.ticker} size={36} borderRadius={8} />
                <View style={{ flex: 1 }}>
                  <Text style={d.simpleTicker}>{item.ticker}</Text>
                  <Text style={d.simpleName}>{item.tickerName}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={d.simplePrice}>${item.tickerPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                  <Text style={[d.simpleChange, { color: pos ? colors.status.green : colors.status.red }]}>{changeStr}</Text>
                </View>
              </View>
            </>
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
            <TouchableOpacity style={d.askActionBtn}>
              <Ionicons name="layers-outline" size={14} color={colors.text.secondary} />
              <Text style={d.askActionText}>Skills</Text>
            </TouchableOpacity>
            <TouchableOpacity style={d.askActionBtn}>
              <Ionicons name="flash-outline" size={14} color={colors.text.secondary} />
              <Text style={d.askActionText}>Blitz</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={d.askSendBtn}
              onPress={() => { if (askText.trim()) router.push('/(tabs)/research'); }}
            >
              <Ionicons name="arrow-up" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {detail && (
        <FullBreakdownSheet
          visible={breakdownVisible}
          onClose={() => setBreakdownVisible(false)}
          breakdown={detail.fullBreakdown}
        />
      )}
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
  headerTitle: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text.primary, letterSpacing: 1 },
  headerIconBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerRight: { flexDirection: 'row' },

  scroll: { padding: spacing.xl, gap: spacing.lg },

  headline: { fontSize: fontSize.xxl, fontWeight: fontWeight.medium, color: colors.text.primary, lineHeight: 34 },

  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaText: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.muted },
  sourcesRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sourceAvatars: { flexDirection: 'row', alignItems: 'center' },
  sourceAvatar: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.bg.primary },
  sourcesText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text.primary },

  bullets: { gap: 10 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bulletDot: { fontSize: fontSize.md, color: colors.text.muted, lineHeight: 22, flexShrink: 0 },
  bulletText: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.text.primary, lineHeight: 22 },

  sectionTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.medium, color: colors.text.primary },

  wifouList: { gap: 12 },
  wifouRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  wifouText: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.text.primary, lineHeight: 22 },
  wifouBold: { fontWeight: fontWeight.medium, color: colors.text.primary },

  readMoreBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default,
    paddingVertical: spacing.md, paddingHorizontal: spacing.xl,
    justifyContent: 'center', minHeight: 48,
  },
  readMoreText: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text.secondary },

  watchList: { gap: spacing.sm },

  // Simple (no detail) fallback
  simpleSummary: { fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.text.secondary, lineHeight: 22 },
  simpleStock: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.md,
  },
  simpleTicker: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text.primary },
  simpleName: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.muted },
  simplePrice: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text.primary },
  simpleChange: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },

  // Ask bar
  askBar: {
    borderTopWidth: 0.5, borderTopColor: colors.border.default,
    backgroundColor: colors.bg.primary,
    paddingHorizontal: spacing.xl, paddingTop: spacing.sm, gap: spacing.sm,
  },
  askInputWrap: {
    borderWidth: 1, borderColor: colors.accent.teal, borderRadius: radius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm, minHeight: 44,
    justifyContent: 'center',
  },
  askInput: { fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.text.primary },
  askActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  askActionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.bg.card, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: 7,
    borderWidth: 0.5, borderColor: colors.border.default, minHeight: 36,
  },
  askActionText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text.secondary },
  askSendBtn: {
    marginLeft: 'auto' as const, width: 36, height: 36, borderRadius: 18,
    backgroundColor: colors.accent.teal, alignItems: 'center', justifyContent: 'center',
  },
});
