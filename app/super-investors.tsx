import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import THEME from '../src/theme';
import {
  MOCK_POPULAR_INVESTORS, MOCK_CONVICTION_PLAYS, MOCK_TOP_PERFORMERS,
  ConvictionPlay, PopularInvestor, TopPerformer,
} from '../src/mock';
import { TickerLogo } from '../src/components/ui';

const { colors, fontSize, fontWeight, radius, spacing } = THEME;

type ConvictionTab = 'new' | 'added' | 'reduced' | 'exited';
const CONVICTION_TABS: { key: ConvictionTab; label: string }[] = [
  { key: 'new',     label: 'New' },
  { key: 'added',   label: 'Added' },
  { key: 'reduced', label: 'Reduced' },
  { key: 'exited',  label: 'Exited' },
];

// ─── Popular investor card ────────────────────────────────────────────────────

function PopularCard({ item }: { item: PopularInvestor }) {
  return (
    <View style={pc.card}>
      <Text style={pc.name}>{item.name}</Text>
      <Text style={pc.desc} numberOfLines={1}>{item.description}</Text>
      <View style={pc.metrics}>
        <View>
          <Text style={pc.metricValue}>{item.metric1Value}</Text>
          <Text style={pc.metricLabel}>{item.metric1Label}</Text>
        </View>
        {item.metric2Value && (
          <View>
            <Text style={pc.metricValue}>{item.metric2Value}</Text>
            <Text style={pc.metricLabel}>{item.metric2Label}</Text>
          </View>
        )}
      </View>
      {item.badge && (
        <View style={[pc.badge, { backgroundColor: (item.badgeColor ?? colors.status.amber) + '25' }]}>
          <Text style={[pc.badgeText, { color: item.badgeColor ?? colors.status.amber }]}>{item.badge}</Text>
        </View>
      )}
    </View>
  );
}

const pc = StyleSheet.create({
  card: {
    width: 160, backgroundColor: colors.bg.card, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.md, gap: spacing.sm,
  },
  name: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text.primary },
  desc: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.muted },
  metrics: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.xs },
  metricValue: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: colors.status.green },
  metricLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.muted },
  badge: { alignSelf: 'flex-start', paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  badgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
});

// ─── Rank badge ───────────────────────────────────────────────────────────────

const RANK_BG: Record<number, string> = { 1: '#B8860B', 2: '#9E9E9E', 3: '#A0522D' };

function RankBadge({ rank }: { rank: number }) {
  const bg = RANK_BG[rank] ?? colors.bg.secondary;
  return (
    <View style={[rnk.wrap, { backgroundColor: bg }]}>
      <Text style={rnk.text}>{rank}</Text>
    </View>
  );
}

const rnk = StyleSheet.create({
  wrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  text: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: '#FFFFFF' },
});

// ─── Conviction play card ─────────────────────────────────────────────────────

function ConvictionCard({ play }: { play: ConvictionPlay }) {
  return (
    <View style={cv.card}>
      <View style={cv.topRow}>
        <RankBadge rank={play.rank} />
        <TickerLogo ticker={play.ticker} size={32} borderRadius={8} />
        <View style={cv.nameBlock}>
          <Text style={cv.ticker}>{play.ticker}</Text>
          <Text style={cv.name}>{play.name}</Text>
        </View>
      </View>
      <Text style={cv.action}>{play.investorsCount} investors {play.action}</Text>
      <Text style={cv.funds} numberOfLines={2}>{play.funds.join(' · ')}</Text>
    </View>
  );
}

const cv = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.secondary, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.md, gap: spacing.sm,
  },
  topRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nameBlock: { flex: 1 },
  ticker: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text.primary },
  name: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.muted },
  action: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.status.green },
  funds: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.secondary, lineHeight: 18 },
});

// ─── Top performer row ────────────────────────────────────────────────────────

function PerformerRow({ item }: { item: TopPerformer }) {
  const returnStr = item.returnPct >= 1000
    ? `+${item.returnPct.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`
    : `+${item.returnPct.toFixed(1)}%`;

  return (
    <View style={tp.row}>
      <RankBadge rank={item.rank} />
      <View style={tp.body}>
        <Text style={tp.name} numberOfLines={1}>{item.name}</Text>
        <Text style={tp.sub}>{item.manager} · {item.aum} AUM</Text>
      </View>
      <Text style={tp.returnText}>{returnStr}</Text>
    </View>
  );
}

const tp = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bg.secondary, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.md, minHeight: 56,
  },
  body: { flex: 1 },
  name: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text.primary },
  sub: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.muted, marginTop: 2 },
  returnText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.status.green },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function SuperInvestorsScreen() {
  const [query, setQuery] = useState('');
  const [convTab, setConvTab] = useState<ConvictionTab>('new');
  const plays = MOCK_CONVICTION_PLAYS[convTab];

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Super Investors</Text>
        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="information-circle-outline" size={22} color={colors.text.secondary} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Search */}
        <View style={s.searchWrap}>
          <Ionicons name="search-outline" size={16} color={colors.text.muted} />
          <TextInput
            style={s.searchInput}
            placeholder="Search super investors..."
            placeholderTextColor={colors.text.muted}
            value={query}
            onChangeText={setQuery}
          />
        </View>

        {/* Popular Investors */}
        <View style={s.sectionTitleRow}>
          <Ionicons name="people-outline" size={16} color={colors.text.primary} />
          <Text style={s.sectionTitle}>Popular Investors</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.hScroll}>
          {MOCK_POPULAR_INVESTORS.map(inv => <PopularCard key={inv.id} item={inv} />)}
        </ScrollView>

        {/* Top 3 Conviction Plays */}
        <View style={s.sectionHeaderRow}>
          <View style={s.sectionTitleRow}>
            <Ionicons name="ribbon-outline" size={16} color={colors.text.primary} />
            <Text style={s.sectionTitle}>Top 3 Conviction Plays</Text>
          </View>
          <View style={s.quarterBadge}>
            <Text style={s.quarterText}>2026 Q1</Text>
            <Ionicons name="filter-outline" size={12} color={colors.text.muted} />
          </View>
        </View>

        {/* Conviction tabs */}
        <View style={s.tabRow}>
          {CONVICTION_TABS.map(t => (
            <TouchableOpacity
              key={t.key}
              style={[s.tabBtn, convTab === t.key && s.tabBtnActive]}
              onPress={() => setConvTab(t.key)}
              activeOpacity={0.7}
            >
              <Text style={[s.tabText, convTab === t.key && s.tabTextActive]}>{t.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={s.convList}>
          {plays.map(p => <ConvictionCard key={p.ticker} play={p} />)}
        </View>

        {/* Top Performing */}
        <View style={s.sectionHeaderRow}>
          <View style={s.sectionTitleRow}>
            <Ionicons name="trophy-outline" size={16} color={colors.text.primary} />
            <Text style={s.sectionTitle}>Top Performing Investors</Text>
          </View>
          <View style={s.quarterBadge}>
            <Text style={s.quarterText}>YTD</Text>
            <Ionicons name="filter-outline" size={12} color={colors.text.muted} />
          </View>
        </View>
        <View style={s.convList}>
          {MOCK_TOP_PERFORMERS.map(p => <PerformerRow key={p.rank} item={p} />)}
        </View>

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: colors.border.default,
  },
  backBtn: { width: 38, height: 38, justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: colors.text.primary },

  scroll: { padding: spacing.xl, gap: spacing.lg },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    backgroundColor: colors.bg.secondary, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 0.5, borderColor: colors.border.default, minHeight: 44,
  },
  searchInput: { flex: 1, fontSize: fontSize.md, color: colors.text.primary, fontWeight: fontWeight.regular },

  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: colors.text.primary },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  hScroll: { gap: spacing.sm, paddingVertical: 2 },

  quarterBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.bg.card, borderRadius: radius.md,
    paddingHorizontal: spacing.sm, paddingVertical: 5,
    borderWidth: 0.5, borderColor: colors.border.default,
  },
  quarterText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.text.secondary },

  tabRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  tabBtn: {
    paddingHorizontal: spacing.md, paddingVertical: 7,
    borderRadius: radius.full, borderWidth: 0.5, borderColor: colors.border.default,
    minHeight: 34,
  },
  tabBtnActive: { backgroundColor: colors.accent.teal, borderColor: colors.accent.teal },
  tabText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text.secondary },
  tabTextActive: { color: '#FFFFFF' },

  convList: { gap: spacing.sm },
});
