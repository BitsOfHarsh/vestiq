import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import THEME from '../src/theme';
import { InsiderTrade } from '../src/mock';
import { getRecentInsiderTrades } from '../src/services/fmp';
import { TickerLogo } from '../src/components/ui';
import ScalePressable from '../src/components/ui/ScalePressable';

const { colors, fontSize, fontWeight, fontFamily, radius, spacing } = THEME;

const TYPE_COLOR = { Buy: colors.status.green, Sell: colors.status.red };

function InsiderCard({ item }: { item: InsiderTrade }) {
  const typeColor = TYPE_COLOR[item.type];

  return (
    <View style={s.card}>
      {/* Left */}
      <View style={s.logoCol}>
        <ScalePressable style={s.arrowBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
          <Ionicons name="open-outline" size={13} color={colors.text.muted} />
        </ScalePressable>
        <TickerLogo ticker={item.ticker} size={52} borderRadius={10} />
        <Text style={s.logoTicker}>{item.ticker}</Text>
      </View>

      {/* Right */}
      <View style={s.detailCol}>
        <Text style={s.insiderLabel}>Insider</Text>
        <Text style={s.insiderName}>{item.insiderName}</Text>
        <Text style={s.insiderTitle}>{item.title}</Text>

        <View style={s.metaGrid}>
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Type</Text>
            <Text style={[s.typeText, { color: typeColor }]}>{item.type}</Text>
          </View>
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Average</Text>
            <Text style={s.metaValue}>{item.average}</Text>
          </View>
          <View style={s.metaCell}>
            <Text style={s.metaLabel}>Value</Text>
            <Text style={s.metaValue}>{item.value}</Text>
          </View>
        </View>

        <View>
          <Text style={s.metaLabel}>Date Range</Text>
          <Text style={s.metaValue}>{item.dateRange}</Text>
        </View>

        <ScalePressable style={s.seeWhyBtn}>
          <Text style={s.seeWhyText}>See why </Text>
          <Ionicons name="chevron-forward" size={13} color={colors.text.secondary} />
        </ScalePressable>
      </View>
    </View>
  );
}

function fmtValue(v: number): string {
  if (v >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`;
  if (v >= 1_000)     return `$${(v / 1_000).toFixed(1)}K`;
  return `$${v.toFixed(0)}`;
}

export default function InsiderScreen() {
  const [trades, setTrades] = useState<InsiderTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    getRecentInsiderTrades(40).then(data => {
      if (data.length > 0) {
        setTrades(data.map((t, i) => ({
          id:          `fmp_${i}`,
          ticker:      t.ticker || '',
          insiderName: t.name,
          title:       t.title,
          type:        t.type,
          average:     `$${t.price.toFixed(2)}`,
          value:       fmtValue(t.value),
          dateRange:   t.date,
        })));
      }
    }).finally(() => setLoading(false));
  }, []);

  const filtered = trades.filter(t =>
    query === '' ||
    t.ticker.toLowerCase().includes(query.toLowerCase()) ||
    t.insiderName.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <ScalePressable onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
        </ScalePressable>
        <Text style={s.headerTitle}>Active Insider Trades</Text>
        <ScalePressable hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
          <Ionicons name="information-circle-outline" size={22} color={colors.text.secondary} />
        </ScalePressable>
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={colors.text.muted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by ticker or insider..."
          placeholderTextColor={colors.text.muted}
          value={query}
          onChangeText={setQuery}
        />
      </View>

      <View style={s.colHeaders}>
        <Text style={s.colHeader}>Ticker</Text>
        <Text style={s.colHeader}>Details</Text>
      </View>

      {loading && trades.length === 0 && (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="small" color={colors.accent.violet} />
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={({ item }) => <InsiderCard item={item} />}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
  },
  backBtn: { width: 38, height: 38, justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.lg, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },

  searchWrap: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    marginHorizontal: spacing.xl, marginBottom: spacing.md,
    backgroundColor: colors.bg.secondary, borderRadius: radius.full,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 0.5, borderColor: colors.border.default, minHeight: 44,
  },
  searchInput: { flex: 1, fontSize: fontSize.md, color: colors.text.primary, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular },

  colHeaders: { flexDirection: 'row', paddingHorizontal: spacing.xl, paddingBottom: spacing.sm },
  colHeader: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.muted, flex: 1 },

  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },

  card: {
    flexDirection: 'row',
    backgroundColor: colors.bg.card, borderRadius: radius.xl,
    borderWidth: 0.5, borderColor: colors.border.default, overflow: 'hidden',
  },

  logoCol: {
    width: 110, backgroundColor: colors.bg.secondary,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: spacing.xl, gap: spacing.sm, position: 'relative',
  },
  arrowBtn: { position: 'absolute', top: spacing.sm, right: spacing.sm },
  logoTicker: { fontSize: fontSize.lg, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },

  detailCol: { flex: 1, padding: spacing.md, gap: spacing.sm },
  insiderLabel: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },
  insiderName: { fontSize: fontSize.md, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  insiderTitle: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.secondary, marginBottom: 2 },

  metaGrid: { flexDirection: 'row', gap: spacing.md },
  metaCell: { gap: 2 },
  metaLabel: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },
  metaValue: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  typeText: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium },

  seeWhyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bg.secondary, borderRadius: radius.md,
    paddingVertical: spacing.sm, minHeight: 36,
    borderWidth: 0.5, borderColor: colors.border.default, marginTop: 2,
  },
  seeWhyText: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.secondary },
  loadingWrap: { alignItems: 'center', paddingVertical: spacing.xl },
});
