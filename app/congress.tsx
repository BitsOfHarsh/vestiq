import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import THEME from '../src/theme';
import { CongressTrade } from '../src/mock';
import { getCongressTrades } from '../src/services/congress';
import { TickerLogo } from '../src/components/ui';
import ScalePressable from '../src/components/ui/ScalePressable';

const { colors, fontSize, fontWeight, fontFamily, radius, spacing } = THEME;

const TYPE_COLOR = { Buy: colors.status.green, Sell: colors.status.red };

function TradeCard({ item }: { item: CongressTrade }) {
  const typeColor = TYPE_COLOR[item.type];
  const repShort = item.representative.length > 12 ? item.representative.slice(0, 11) + '...' : item.representative;

  return (
    <View style={s.card}>
      {/* Left: logo box */}
      <View style={s.logoCol}>
        <ScalePressable style={s.arrowBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
          <Ionicons name="open-outline" size={13} color={colors.text.muted} />
        </ScalePressable>
        <TickerLogo ticker={item.ticker} size={52} borderRadius={10} />
        <Text style={s.logoTicker}>{item.ticker}</Text>
      </View>

      {/* Right: details */}
      <View style={s.detailCol}>
        <View style={s.detailGrid}>
          <View style={s.detailCell}>
            <Text style={s.detailLabel}>Representative</Text>
            <Text style={s.detailValue}>{repShort}</Text>
          </View>
          <View style={[s.detailCell, { alignItems: 'flex-end' }]}>
            <Text style={s.detailLabel}>Date</Text>
            <Text style={s.detailValue}>{item.date}</Text>
          </View>
        </View>
        <View style={s.detailGrid}>
          <View style={s.detailCell}>
            <Text style={s.detailLabel}>Type</Text>
            <Text style={[s.typeText, { color: typeColor }]}>{item.type}</Text>
          </View>
          <View style={[s.detailCell, { alignItems: 'flex-end' }]}>
            <Text style={s.detailLabel}>Amount</Text>
            <Text style={s.amountText}>{item.amount}</Text>
          </View>
        </View>
        <ScalePressable style={s.seeWhyBtn}>
          <Text style={s.seeWhyText}>See why </Text>
          <Ionicons name="chevron-forward" size={13} color={colors.text.secondary} />
        </ScalePressable>
      </View>
    </View>
  );
}

function fmtAmount(low: number, high: number): string {
  const fmt = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : n >= 1_000 ? `$${(n / 1_000).toFixed(0)}K` : `$${n}`;
  return low === high || high === 0 ? fmt(low) : `${fmt(low)} - ${fmt(high)}`;
}

export default function CongressScreen() {
  const [trades, setTrades] = useState<CongressTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');

  useEffect(() => {
    getCongressTrades(undefined, 50).then(data => {
      if (data.length > 0) {
        setTrades(data.map((t, i) => ({
          id:             `ww_${i}`,
          ticker:         t.ticker,
          representative: t.representative,
          title:          `Representative (${t.party === 'D' ? 'D' : t.party === 'R' ? 'R' : t.party})`,
          type:           t.type === 'Purchase' ? 'Buy' : 'Sell',
          amount:         fmtAmount(t.amountLow, t.amountHigh),
          date:           new Date(t.tradeDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        })));
      }
    }).finally(() => setLoading(false));
  }, []);

  const filtered = trades.filter(t =>
    query === '' ||
    t.ticker.toLowerCase().includes(query.toLowerCase()) ||
    t.representative.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <ScalePressable onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
        </ScalePressable>
        <Text style={s.headerTitle}>U.S. Congress Trades</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={s.searchWrap}>
        <Ionicons name="search-outline" size={16} color={colors.text.muted} />
        <TextInput
          style={s.searchInput}
          placeholder="Search by ticker or representative..."
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
          <ActivityIndicator size="small" color={colors.accent.brand} />
        </View>
      )}

      <FlatList
        data={filtered}
        keyExtractor={i => i.id}
        renderItem={({ item }) => <TradeCard item={item} />}
        contentContainerStyle={s.list}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={s.sep} />}
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

  colHeaders: {
    flexDirection: 'row', paddingHorizontal: spacing.xl, paddingBottom: spacing.sm,
  },
  colHeader: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.muted, flex: 1 },

  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  sep: { height: spacing.md },

  card: {
    flexDirection: 'row', gap: spacing.sm,
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

  detailCol: { flex: 1, padding: spacing.md, gap: spacing.md },
  detailGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  detailCell: { gap: 2 },
  detailLabel: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },
  detailValue: { fontSize: fontSize.md, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  typeText: { fontSize: fontSize.md, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium },
  amountText: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary, textAlign: 'right' },

  seeWhyBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: colors.bg.secondary, borderRadius: radius.md,
    paddingVertical: spacing.sm, minHeight: 36,
    borderWidth: 0.5, borderColor: colors.border.default,
  },
  seeWhyText: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.secondary },
  loadingWrap: { alignItems: 'center', paddingVertical: spacing.xl },
});
