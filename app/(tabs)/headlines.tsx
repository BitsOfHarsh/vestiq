import { useState, useMemo, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { MockHeadline } from '../../src/mock';
import { CONTENT } from '../../src/content';
import THEME from '../../src/theme';
import { getBusinessHeadlines, getStockNewsSearch } from '../../src/services/newsapi';
import { getSnapshots } from '../../src/services/polygon';
import { TickerLogo } from '../../src/components/ui';

const { colors, fontSize, fontWeight, radius, spacing } = THEME;

// ─── News card ────────────────────────────────────────────────────────────────

function NewsCard({ item }: { item: MockHeadline }) {
  const hasPrice   = item.tickerPrice > 0;
  const pos        = item.tickerChange >= 0;
  const changeColor = pos ? colors.status.green : colors.status.red;
  const changeStr  = hasPrice ? `${pos ? '+' : ''}${item.tickerChange.toFixed(2)}%` : '—';
  const priceStr   = hasPrice
    ? `$${item.tickerPrice.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    : '—';
  const hasDetail  = !!item.detail;

  return (
    <TouchableOpacity
      style={s.card}
      onPress={() => router.push({ pathname: '/news/[id]', params: { id: item.id } })}
      activeOpacity={0.75}
    >
      {/* Top row: time dot + time + chevron */}
      <View style={s.cardTopRow}>
        <View style={s.timeDot} />
        <Text style={s.cardTime}>{item.time}</Text>
        <View style={{ flex: 1 }} />
        {hasDetail && <Ionicons name="chevron-forward" size={14} color={colors.text.muted} />}
      </View>

      {/* Headline */}
      <Text style={s.cardHeadline} numberOfLines={3}>{item.headline}</Text>

      {/* Summary */}
      <Text style={s.cardSummary} numberOfLines={2}>
        {'- '}{item.summary}
      </Text>

      {/* Stock chip */}
      <View style={s.stockRow}>
        <TickerLogo ticker={item.ticker} size={36} borderRadius={8} />
        <View style={s.stockMid}>
          <Text style={s.stockTicker}>{item.ticker}</Text>
          <Text style={s.stockName} numberOfLines={1}>{item.tickerName}</Text>
        </View>
        <View style={s.stockPrice}>
          <Text style={s.priceText}>{priceStr}</Text>
          <Text style={[s.changeText, { color: hasPrice ? changeColor : colors.text.muted }]}>{changeStr}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function DateHeader({ label }: { label: string }) {
  return <Text style={s.dateHeader}>{label}</Text>;
}

// ─── Main screen ──────────────────────────────────────────────────────────────

type ListItem =
  | { type: 'header'; label: string }
  | { type: 'news'; item: MockHeadline };

function isToday(ms: number): boolean {
  const d = new Date(ms);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

export default function HeadlinesScreen() {
  const [country, setCountry] = useState('United States');
  const [articles, setArticles] = useState<MockHeadline[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNews = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch top US business headlines + stock-specific search in parallel
      const [business, stocks] = await Promise.all([
        getBusinessHeadlines(50),
        getStockNewsSearch(50),
      ]);

      // Merge, deduplicate by URL, sort newest first
      const seen = new Set<string>();
      const merged = [...business, ...stocks]
        .filter(a => { if (seen.has(a.url)) return false; seen.add(a.url); return true; })
        .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

      if (!merged.length) return;

      const mapped: MockHeadline[] = merged.slice(0, 60).map(a => {
        const ms = new Date(a.publishedAt).getTime();
        return {
          id:           a.id,
          time:         new Date(ms).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }),
          date:         isToday(ms) ? 'today' : 'yesterday',
          country:      'United States',
          headline:     a.title,
          summary:      a.description,
          // Use matched ticker, or fall back to source name for display
          ticker:       a.ticker ?? a.source,
          tickerName:   a.ticker ?? a.source,
          tickerPrice:  0,
          tickerChange: 0,
        };
      });

      // Only batch-fetch prices for real tickers (not source-name fallbacks)
      const uniqueTickers = [...new Set(
        merged.filter(a => a.ticker !== null).map(a => a.ticker as string)
      )];
      const snapshots = uniqueTickers.length ? await getSnapshots(uniqueTickers) : {};

      setArticles(mapped.map(a => ({
        ...a,
        tickerPrice:  snapshots[a.ticker]?.price     ?? 0,
        tickerChange: snapshots[a.ticker]?.changePct ?? 0,
      })));
    } catch {
      // keep empty state so user sees failure, not stale mock
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadNews(); }, [loadNews]);

  const listData = useMemo<ListItem[]>(() => {
    const filtered = articles.filter(n => n.country === country);
    const today     = filtered.filter(n => n.date === 'today');
    const yesterday = filtered.filter(n => n.date === 'yesterday');
    const items: ListItem[] = [];
    if (today.length)     { items.push({ type: 'header', label: 'Today' });     today.forEach(i => items.push({ type: 'news', item: i })); }
    if (yesterday.length) { items.push({ type: 'header', label: 'Yesterday' }); yesterday.forEach(i => items.push({ type: 'news', item: i })); }
    return items;
  }, [articles, country]);

  return (
    <SafeAreaView style={s.container}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="menu-outline" size={24} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Top Headlines</Text>
        <View style={s.headerRight}>
          <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="options-outline" size={22} color={colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="search-outline" size={22} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Country filter tabs */}
      <View style={s.filterWrap}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={s.filterScroll}
        >
          {CONTENT.headlines.countries.map((c) => {
            const active = c === country;
            return (
              <TouchableOpacity
                key={c}
                style={s.filterTab}
                onPress={() => setCountry(c)}
                activeOpacity={0.7}
              >
                <Text style={[s.filterText, active && s.filterTextActive]}>{c}</Text>
                {active && <View style={s.filterUnderline} />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        <View style={s.filterBorder} />
      </View>

      {/* List */}
      {loading ? (
        <View style={s.empty}>
          <ActivityIndicator size="large" color={colors.accent.teal} />
        </View>
      ) : listData.length === 0 ? (
        <View style={s.empty}>
          <Ionicons name="newspaper-outline" size={36} color={colors.text.muted} />
          <Text style={s.emptyText}>No headlines for {country} yet</Text>
        </View>
      ) : (
        <FlatList
          data={listData}
          keyExtractor={(item, i) => item.type === 'header' ? `h-${i}` : item.item.id}
          renderItem={({ item }) =>
            item.type === 'header'
              ? <DateHeader label={item.label} />
              : <NewsCard item={item.item} />
          }
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={s.separator} />}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: colors.border.default,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: colors.text.primary },
  headerRight: { flexDirection: 'row', gap: spacing.md },

  filterWrap: { position: 'relative' },
  filterScroll: { paddingHorizontal: spacing.xl },
  filterTab: { paddingHorizontal: 4, paddingVertical: spacing.sm, marginRight: spacing.lg, alignItems: 'center' },
  filterText: { fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.text.muted, paddingBottom: 6 },
  filterTextActive: { color: colors.text.primary, fontWeight: fontWeight.medium },
  filterUnderline: {
    position: 'absolute', bottom: 0, left: 0, right: 0, height: 2,
    backgroundColor: colors.accent.teal, borderRadius: 1,
  },
  filterBorder: { height: 0.5, backgroundColor: colors.border.default },

  list: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  separator: { height: spacing.md },

  dateHeader: {
    fontSize: fontSize.xxl, fontWeight: fontWeight.medium, color: colors.text.primary,
    paddingTop: spacing.xl, paddingBottom: spacing.sm,
  },

  card: {
    backgroundColor: colors.bg.card, borderRadius: radius.xl,
    padding: spacing.md, borderWidth: 0.5, borderColor: colors.border.default, gap: 8,
  },

  cardTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  timeDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.status.blue },
  cardTime: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.muted },

  cardHeadline: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: colors.text.primary, lineHeight: 23 },
  cardSummary: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.secondary, lineHeight: 19 },

  stockRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: 2 },
  stockMid: { flex: 1 },
  stockTicker: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text.primary },
  stockName: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.muted },
  stockPrice: { alignItems: 'flex-end' },
  priceText: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text.primary },
  changeText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium },

  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  emptyText: { fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.text.muted },
});
