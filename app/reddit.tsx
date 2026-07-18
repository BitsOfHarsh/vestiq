import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import THEME from '../src/theme';
import { RedditStock, RedditMover } from '../src/mock';
import { getRedditTrending } from '../src/services/freedata';
import { getSnapshots } from '../src/services/polygon';
import ScalePressable from '../src/components/ui/ScalePressable';

const { colors, fontSize, fontWeight, fontFamily, radius, spacing } = THEME;

// ─── Rank badge ───────────────────────────────────────────────────────────────

const RANK_COLORS: Record<number, string> = { 1: '#B8860B', 2: '#9E9E9E', 3: '#A0522D' };

function RankBadge({ rank }: { rank: number }) {
  const bg = RANK_COLORS[rank];
  return (
    <View style={[rb.wrap, bg ? { backgroundColor: bg } : { backgroundColor: 'transparent' }]}>
      <Text style={[rb.text, !bg && { color: colors.text.muted }]}>{rank}</Text>
    </View>
  );
}

const rb = StyleSheet.create({
  wrap: { width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: fontSize.xs, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: '#FFFFFF' },
});

// ─── Rank change cell ─────────────────────────────────────────────────────────

function RankChange({ value }: { value: number }) {
  if (value === 0) return <Text style={rc.neutral}>—</Text>;
  const pos = value > 0;
  return (
    <View style={rc.row}>
      <Feather name={pos ? 'trending-up' : 'trending-down'} size={11} color={pos ? colors.status.green : colors.status.red} />
      <Text style={[rc.text, { color: pos ? colors.status.green : colors.status.red }]}>
        {pos ? '+' : ''}{value}
      </Text>
    </View>
  );
}

const rc = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 2 },
  text: { fontSize: fontSize.xs, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium },
  neutral: { fontSize: fontSize.xs, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.muted },
});

// ─── Mover card ───────────────────────────────────────────────────────────────

function MoverCard({ mover, selected, onPress }: { mover: RedditMover; selected: boolean; onPress: () => void }) {
  const rcPos = mover.rankChange > 0;
  const pmPos = mover.postMarket >= 0;
  const psPos = mover.prevSession >= 0;

  return (
    <ScalePressable
      style={[mc.card, selected && mc.cardSelected]}
      onPress={onPress}
      scaleTo={0.95}
    >
      <Text style={mc.rank}>{mover.rank}</Text>
      <Text style={mc.ticker}>{mover.ticker}</Text>

      <Text style={mc.label}>Rank Change</Text>
      <View style={[mc.pill, { backgroundColor: rcPos ? colors.status.green + '30' : colors.status.red + '30' }]}>
        <Feather name={rcPos ? 'trending-up' : 'trending-down'} size={11} color={rcPos ? colors.status.green : colors.status.red} />
        <Text style={[mc.pillText, { color: rcPos ? colors.status.green : colors.status.red }]}>
          {rcPos ? '+' : ''}{mover.rankChange}
        </Text>
      </View>

      <Text style={mc.label}>Post-Market</Text>
      <View style={[mc.pill, { backgroundColor: pmPos ? colors.status.green + '30' : colors.status.red + '30' }]}>
        <Feather name={pmPos ? 'trending-up' : 'trending-down'} size={11} color={pmPos ? colors.status.green : colors.status.red} />
        <Text style={[mc.pillText, { color: pmPos ? colors.status.green : colors.status.red }]}>
          {pmPos ? '+' : ''}{mover.postMarket.toFixed(1)}%
        </Text>
      </View>

      <Text style={mc.label}>Prev. Regular{'\n'}Session</Text>
      <View style={[mc.pill, { backgroundColor: psPos ? colors.status.green + '30' : colors.status.red + '30' }]}>
        <Feather name={psPos ? 'trending-up' : 'trending-down'} size={11} color={psPos ? colors.status.green : colors.status.red} />
        <Text style={[mc.pillText, { color: psPos ? colors.status.green : colors.status.red }]}>
          {psPos ? '+' : ''}{mover.prevSession.toFixed(1)}%
        </Text>
      </View>
    </ScalePressable>
  );
}

const mc = StyleSheet.create({
  card: {
    width: 130, backgroundColor: colors.bg.card,
    borderRadius: radius.lg, borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.md, gap: spacing.sm, alignItems: 'center',
  },
  cardSelected: { borderColor: colors.accent.brand, borderWidth: 1.5 },
  rank: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },
  ticker: { fontSize: fontSize.xl, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  label: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted, textAlign: 'center' },
  pill: { borderRadius: radius.md, paddingHorizontal: spacing.sm, paddingVertical: 5, flexDirection: 'row', alignItems: 'center', gap: 3, width: '100%', justifyContent: 'center' },
  pillText: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function RedditScreen() {
  const [showAllRanks, setShowAllRanks] = useState(false);
  const [selectedMover, setSelectedMover] = useState(0);
  const [redditStocks, setRedditStocks] = useState<RedditStock[]>([]);
  const [movers, setMovers] = useState<RedditMover[]>([]);

  useEffect(() => {
    getRedditTrending(1).then(async data => {
      if (!data.length) return;

      const stocks: RedditStock[] = data.map(r => ({
        rank:       r.rank,
        ticker:     r.ticker,
        rankChange: r.rankChange,
        mentions:   r.mentions,
      }));
      setRedditStocks(stocks);

      const topMovers = [...data].sort((a, b) => Math.abs(b.rankChange) - Math.abs(a.rankChange)).slice(0, 3);
      const snapshots = await getSnapshots(topMovers.map(m => m.ticker));

      const newMovers: RedditMover[] = topMovers.map(m => ({
        rank:        m.rank,
        ticker:      m.ticker,
        name:        m.ticker,
        rankChange:  m.rankChange,
        postMarket:  0,
        prevSession: snapshots[m.ticker]?.changePct ?? 0,
      }));
      setMovers(newMovers);
    }).catch(() => { /* keep mock */ });
  }, []);

  const visibleStocks = showAllRanks ? redditStocks : redditStocks.slice(0, 10);
  const leftCol  = visibleStocks.filter((_, i) => i % 2 === 0);
  const rightCol = visibleStocks.filter((_, i) => i % 2 !== 0);

  const activeMover = movers[selectedMover] ?? movers[0];

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <ScalePressable onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
          <Feather name="chevron-left" size={22} color={colors.text.primary} />
        </ScalePressable>
        <Text style={s.headerTitle}>Reddit Trending</Text>
        <ScalePressable hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
          <Feather name="filter" size={20} color={colors.text.secondary} />
        </ScalePressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll}>

        {/* Trending Stocks table */}
        <View style={s.section}>
          <View style={s.sectionTitleRow}>
            <Feather name="trending-up" size={16} color={colors.text.primary} />
            <Text style={s.sectionTitle}>Reddit Trending Stocks</Text>
          </View>

          <View style={s.rankTable}>
            {/* Column headers */}
            <View style={s.rankColHeaders}>
              <Text style={[s.rankColHeader, { width: 36 }]}>Rank</Text>
              <Text style={[s.rankColHeader, { flex: 1 }]}>Ticker</Text>
              <Text style={[s.rankColHeader, { width: 70 }]}>Rank{'\n'}change</Text>
            </View>
            <View style={s.rankColHeaders}>
              <Text style={[s.rankColHeader, { width: 36 }]}>Rank</Text>
              <Text style={[s.rankColHeader, { flex: 1 }]}>Ticker</Text>
              <Text style={[s.rankColHeader, { width: 70 }]}>Rank{'\n'}change</Text>
            </View>
          </View>

          <View style={s.rankDivider} />

          {/* Rows */}
          {leftCol.map((left, i) => {
            const right = rightCol[i];
            return (
              <View key={left.rank} style={s.rankRow}>
                {/* Left cell */}
                <View style={s.rankCell}>
                  <RankBadge rank={left.rank} />
                  <Text style={s.rankTicker}>{left.ticker}</Text>
                  <RankChange value={left.rankChange} />
                </View>
                {right && (
                  <View style={s.rankCell}>
                    <RankBadge rank={right.rank} />
                    <Text style={s.rankTicker}>{right.ticker}</Text>
                    <RankChange value={right.rankChange} />
                  </View>
                )}
              </View>
            );
          })}

          <ScalePressable style={s.showMoreBtn} onPress={() => setShowAllRanks(v => !v)}>
            <Feather name={showAllRanks ? 'chevron-up' : 'chevron-down'} size={18} color={colors.text.muted} />
          </ScalePressable>
        </View>

        {/* Notable Top Rank Change */}
        <View style={s.section}>
          <View style={s.sectionTitleRow}>
            <Feather name="star" size={16} color={colors.text.primary} />
            <View>
              <Text style={s.sectionTitle}>Notable Top Rank Change Analysis</Text>
              <Text style={s.sectionSub}>Live analysis of biggest Reddit trending changes</Text>
            </View>
          </View>

          <View style={s.metaRow}>
            <Text style={s.metaText}>Updated about 1 hour ago</Text>
            <View style={s.sourcesRow}>
              <View style={s.sourceAvatars}>
                {[colors.status.red, colors.status.blue, colors.status.green].map((c, i) => (
                  <View key={i} style={[s.sourceAvatar, { backgroundColor: c, marginLeft: i > 0 ? -6 : 0 }]} />
                ))}
              </View>
              <Text style={s.sourcesText}>294 Sources</Text>
            </View>
          </View>

          {/* Mover cards */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.moverScroll}>
            {movers.map((m, i) => (
              <MoverCard key={m.ticker} mover={m} selected={selectedMover === i} onPress={() => setSelectedMover(i)} />
            ))}
          </ScrollView>

          {/* Analysis below */}
          {activeMover ? (
            <>
              <Text style={s.analysisTitle}>{activeMover.name} ({activeMover.ticker}) Analysis</Text>
              <ScalePressable
                style={s.overviewBtn}
                onPress={() => router.push({ pathname: '/stock/[ticker]', params: { ticker: activeMover.ticker, name: activeMover.name } })}
              >
                <Text style={s.overviewBtnText}>{activeMover.ticker} Overview </Text>
                <Feather name="chevron-right" size={14} color={colors.text.secondary} />
              </ScalePressable>
            </>
          ) : (
            <Text style={{ color: colors.text.muted, fontSize: fontSize.sm, marginTop: spacing.sm }}>
              Loading trending data…
            </Text>
          )}
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
  headerTitle: { fontSize: fontSize.lg, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },

  scroll: { padding: spacing.xl, gap: spacing.xl },

  section: {
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.md, gap: spacing.md,
  },

  sectionTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.lg, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  sectionSub: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.secondary, marginTop: 2 },

  rankTable: { flexDirection: 'row', gap: 0 },
  rankColHeaders: { flex: 1, flexDirection: 'row', gap: 4 },
  rankColHeader: { fontSize: 9, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.muted, letterSpacing: 0.4 },
  rankDivider: { height: 0.5, backgroundColor: colors.border.default },

  rankRow: { flexDirection: 'row' },
  rankCell: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm },
  rankTicker: { flex: 1, fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },

  showMoreBtn: { alignItems: 'center', paddingVertical: 2 },

  metaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  metaText: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },
  sourcesRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  sourceAvatars: { flexDirection: 'row', alignItems: 'center' },
  sourceAvatar: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: colors.bg.card },
  sourcesText: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },

  moverScroll: { gap: spacing.sm, paddingVertical: 2 },

  analysisTitle: { fontSize: fontSize.xl, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary, marginTop: spacing.sm },
  overviewBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bg.secondary, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default,
    paddingVertical: spacing.md, minHeight: 48,
  },
  overviewBtnText: { fontSize: fontSize.md, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.secondary },
});
