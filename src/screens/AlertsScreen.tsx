import { useState, useMemo } from 'react';
import {
  View, Text, StyleSheet, SafeAreaView, ScrollView,
  Switch,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useAppStore } from '../store';
import { Holding, WatchlistItem, PriceAlert } from '../services/types';
import {
  calculateAlertLevels, calculateDipScore,
  priceDistance, formatCurrency, formatPercent,
} from '../utils/calculations';
import THEME from '../theme';
import ScalePressable from '../components/ui/ScalePressable';

const { colors, fontSize, fontWeight, radius, spacing } = THEME;

// ─── Constants ────────────────────────────────────────────────────────────────

const LEVEL_CONFIG = {
  stop:  { label: 'STOP',  tint: colors.status.red,   dim: colors.status.redDim },
  entry: { label: 'ENTRY', tint: colors.status.green, dim: colors.status.greenDim },
  t1:    { label: 'T1',    tint: colors.status.amber, dim: colors.status.amberDim },
  t2:    { label: 'T2',    tint: colors.status.blue,  dim: colors.status.blueDim },
} as const;

const URGENCY_COLOR = {
  close: colors.status.red,
  near:  colors.status.amber,
  far:   colors.text.muted,
} as const;

type FilterKey = 'All' | 'Buy dips' | 'Portfolio' | 'Watchlist';
const FILTERS: FilterKey[] = ['All', 'Buy dips', 'Portfolio', 'Watchlist'];

// ─── Conversion helpers ───────────────────────────────────────────────────────

function holdingToWatchlistItem(h: Holding): WatchlistItem {
  return {
    ticker:        h.ticker,
    name:          h.name,
    price:         h.currentPrice,
    high52:        h.currentPrice * 1.20,
    low52:         h.currentPrice * 0.72,
    analystTarget: h.analystTarget,
    fwdPE:         25,
    buyPct:        80,
    support:       h.support,
    resist:        h.currentPrice * 1.08,
    atr:           h.atr,
    sector:        h.sector,
  };
}

// ─── Level card ───────────────────────────────────────────────────────────────

function LevelCard({
  alert, currentPrice, active, onToggle,
}: {
  alert: PriceAlert;
  currentPrice: number;
  active: boolean;
  onToggle: () => void;
}) {
  const cfg = LEVEL_CONFIG[alert.type];
  const dist = priceDistance(currentPrice, alert.price);
  const urgencyColor = URGENCY_COLOR[dist.urgency];

  return (
    <View style={[s.levelCard, { backgroundColor: cfg.dim, borderColor: cfg.tint + '30' }]}>
      <View style={s.levelCardTop}>
        <Text style={[s.levelTypeLabel, { color: cfg.tint }]}>{cfg.label}</Text>
        <Switch
          value={active}
          onValueChange={onToggle}
          trackColor={{ false: colors.bg.secondary, true: cfg.tint + '60' }}
          thumbColor={active ? cfg.tint : colors.text.muted}
          style={s.levelSwitch}
        />
      </View>
      <Text style={[s.levelPrice, { color: cfg.tint }]}>{formatCurrency(alert.price)}</Text>
      <Text style={s.levelNote}>{alert.note}</Text>
      <Text style={[s.levelDist, { color: urgencyColor }]}>
        {dist.label}
        {dist.urgency === 'close' ? ' — very close' : dist.urgency === 'near' ? ' — near' : ''}
      </Text>
    </View>
  );
}

// ─── R/R bar ─────────────────────────────────────────────────────────────────

function RRBar({ rr }: { rr: number }) {
  const clampedRr = Math.min(rr, 10);
  const fillPct = Math.max(0, Math.min(100, (clampedRr / 10) * 100));
  const rrColor = rr >= 3 ? colors.status.green : rr >= 2 ? colors.status.amber : colors.status.red;
  const rrLabel = rr >= 3 ? 'Good' : rr >= 2 ? 'Acceptable' : 'Below 2x';

  return (
    <View style={s.rrRow}>
      <Text style={s.rrLabel}>Risk/Reward</Text>
      <View style={s.rrTrack}>
        <View style={[s.rrFill, { width: `${fillPct}%`, backgroundColor: rrColor }]} />
      </View>
      <Text style={[s.rrValue, { color: rrColor }]}>{rr.toFixed(1)}x</Text>
      <Text style={[s.rrBadge, { color: rrColor }]}>{rrLabel}</Text>
    </View>
  );
}

// ─── Stock block ──────────────────────────────────────────────────────────────

function StockBlock({
  item, source, currentPrice, change,
  allAlerts, onToggle, onToggleAll,
}: {
  item: WatchlistItem;
  source: 'portfolio' | 'watchlist';
  currentPrice: number;
  change: number;
  allAlerts: PriceAlert[];
  onToggle: (id: string) => void;
  onToggleAll: (ticker: string) => void;
}) {
  const levels     = calculateAlertLevels(item);
  const dip        = calculateDipScore(item);
  const changePos  = change >= 0;
  const activeList = allAlerts.filter((a) => a.ticker === item.ticker && a.active);
  const activeIds  = new Set(allAlerts.filter((a) => a.active).map((a) => a.id));

  const entry = levels.find((l) => l.type === 'entry');
  const stop  = levels.find((l) => l.type === 'stop');
  const rr    = entry && stop && entry.price > stop.price
    ? (item.analystTarget - entry.price) / (entry.price - stop.price)
    : dip.rr;

  return (
    <View style={s.stockBlock}>
      {/* Stock header */}
      <View style={s.stockHeader}>
        <View style={s.tickerBadge}>
          <Text style={s.tickerBadgeText}>{item.ticker.slice(0, 2)}</Text>
        </View>
        <View style={s.stockMeta}>
          <Text style={s.stockTicker}>{item.ticker}</Text>
          <View style={[s.sourceTag, { backgroundColor: (source === 'portfolio' ? colors.status.blue : colors.accent.brand) + '20' }]}>
            <Text style={[s.sourceTagText, { color: source === 'portfolio' ? colors.status.blue : colors.accent.brand }]}>
              {source === 'portfolio' ? 'Holdings' : 'Watchlist'}
            </Text>
          </View>
        </View>
        <View style={s.stockPriceCol}>
          <Text style={s.stockPrice}>{formatCurrency(currentPrice)}</Text>
          <Text style={[s.stockChange, { color: changePos ? colors.status.green : colors.status.red }]}>
            {changePos ? '+' : ''}{change.toFixed(2)}%
          </Text>
        </View>
      </View>

      {/* 2×2 level grid */}
      <View style={s.levelGrid}>
        {levels.map((alert) => (
          <LevelCard
            key={alert.id}
            alert={alert}
            currentPrice={currentPrice}
            active={activeIds.has(alert.id)}
            onToggle={() => onToggle(alert.id)}
          />
        ))}
      </View>

      {/* R/R bar */}
      <RRBar rr={rr} />

      {/* Summary strip */}
      <View style={s.summaryStrip}>
        <Text style={s.summaryText}>
          <Text style={{ color: colors.accent.brandBright }}>{activeList.length}</Text>
          {' of 4 alerts active on '}
          <Text style={{ color: colors.text.primary }}>{item.ticker}</Text>
        </Text>
        {activeList.length < 4 && (
          <ScalePressable onPress={() => onToggleAll(item.ticker)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={s.turnOnAll}>Turn on all</Text>
          </ScalePressable>
        )}
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AlertsScreen() {
  const holdings        = useAppStore((s) => s.holdings);
  const watchlistItems  = useAppStore((s) => s.items);
  const alerts          = useAppStore((s) => s.alerts);
  const toggleAlert     = useAppStore((s) => s.toggleAlert);
  const toggleAllAlerts = useAppStore((s) => s.toggleAllAlerts);
  const activateAllForStock = useAppStore((s) => s.activateAllForStock);

  const [filter, setFilter] = useState<FilterKey>('All');

  // Ensure every holding/watchlist item has its 4 computed alerts in the store.
  // On first load, ids like "AAPL_entry" won't exist yet — we seed them.
  useMemo(() => {
    const existingIds = new Set(alerts.map((a) => a.id));
    [...holdings.map(holdingToWatchlistItem), ...watchlistItems].forEach((item) => {
      const levels = calculateAlertLevels(item);
      const missing = levels.filter((l) => !existingIds.has(l.id));
      if (missing.length > 0) {
        activateAllForStock(item.ticker, missing.map((l) => ({ ...l, active: l.type === 'entry' })));
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Build unified list of stocks to display
  const portfolioItems = holdings.map((h) => ({
    item: holdingToWatchlistItem(h),
    source: 'portfolio' as const,
    currentPrice: h.currentPrice,
    change: ((h.currentPrice - h.avgCost) / h.avgCost) * 100,
  }));

  const watchItems = watchlistItems.map((w) => ({
    item: w,
    source: 'watchlist' as const,
    currentPrice: w.price,
    change: 0,
  }));

  const allStocks = [...portfolioItems, ...watchItems];

  const filtered = useMemo(() => {
    switch (filter) {
      case 'Portfolio':  return allStocks.filter((s) => s.source === 'portfolio');
      case 'Watchlist':  return allStocks.filter((s) => s.source === 'watchlist');
      case 'Buy dips': {
        return allStocks.filter(({ item }) => {
          const dip = calculateDipScore(item);
          return dip.verdict === 'buy';
        });
      }
      default: return allStocks;
    }
  // rebuild only when holdings/watchlist change, not on every alerts toggle
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter, holdings, watchlistItems]);

  // Stats
  const activeAlerts = alerts.filter((a) => a.active);
  const nearEntry = alerts.filter((a) => {
    const stock = allStocks.find((s) => s.item.ticker === a.ticker);
    if (!stock || a.type !== 'entry') return false;
    return priceDistance(stock.currentPrice, a.price).urgency !== 'far';
  });
  const nearStop = alerts.filter((a) => {
    const stock = allStocks.find((s) => s.item.ticker === a.ticker);
    if (!stock || a.type !== 'stop') return false;
    return priceDistance(stock.currentPrice, a.price).urgency !== 'far';
  });

  const masterActive = alerts.length > 0 && alerts.every((a) => a.active);

  const handleToggleAll = (ticker: string) => {
    const levels = (() => {
      const stock = allStocks.find((s) => s.item.ticker === ticker);
      if (!stock) return [];
      return calculateAlertLevels(stock.item);
    })();
    activateAllForStock(ticker, levels.map((l) => ({ ...l, active: true })));
  };

  return (
    <SafeAreaView style={s.container}>
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <ScalePressable onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
          <Ionicons name="arrow-back" size={22} color={colors.text.primary} />
        </ScalePressable>
        <View style={s.headerText}>
          <Text style={s.headerTitle}>Price alerts</Text>
          <Text style={s.headerSub}>Auto-calculated · tap to activate</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Stats row ──────────────────────────────────────────────────── */}
        <View style={s.statsRow}>
          {[
            { label: `${activeAlerts.length} active`,    color: colors.status.green },
            { label: `${nearEntry.length} near entry`,   color: colors.status.amber },
            { label: `${nearStop.length} near stop`,     color: colors.status.red },
            { label: '0 triggered',                       color: colors.text.muted },
          ].map(({ label, color }) => (
            <View key={label} style={[s.statChip, { borderColor: color + '40' }]}>
              <Text style={[s.statChipText, { color }]}>{label}</Text>
            </View>
          ))}
        </View>

        {/* ── Filter row ─────────────────────────────────────────────────── */}
        <View style={s.filterRow}>
          {FILTERS.map((f) => (
            <ScalePressable
              key={f}
              style={[s.filterChip, filter === f && s.filterChipActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[s.filterText, filter === f && s.filterTextActive]}>{f}</Text>
            </ScalePressable>
          ))}
        </View>

        {/* ── Master toggle ─────────────────────────────────────────────── */}
        <View style={s.masterRow}>
          <Text style={s.masterLabel}>Activate all alerts</Text>
          <Switch
            value={masterActive}
            onValueChange={(v) => toggleAllAlerts(v)}
            trackColor={{ false: colors.bg.secondary, true: colors.accent.brand + '60' }}
            thumbColor={masterActive ? colors.accent.brand : colors.text.muted}
          />
        </View>

        {/* ── Stock blocks ───────────────────────────────────────────────── */}
        {filtered.length === 0 ? (
          <View style={s.emptyBlock}>
            <Ionicons name="notifications-off-outline" size={36} color={colors.text.muted} />
            <Text style={s.emptyText}>
              {filter === 'All'
                ? 'Add holdings or watchlist items to see alerts'
                : `No ${filter.toLowerCase()} items with alerts`}
            </Text>
          </View>
        ) : (
          filtered.map(({ item, source, currentPrice, change }) => (
            <StockBlock
              key={`${source}_${item.ticker}`}
              item={item}
              source={source}
              currentPrice={currentPrice}
              change={change}
              allAlerts={alerts}
              onToggle={toggleAlert}
              onToggleAll={handleToggleAll}
            />
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.md, gap: spacing.lg, paddingBottom: spacing.xxxl },

  // Header
  header: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.md },
  backBtn: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  headerText: { flex: 1 },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: colors.text.primary },
  headerSub: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.muted },

  // Stats row
  statsRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  statChip: {
    paddingHorizontal: spacing.sm, paddingVertical: 5,
    borderRadius: radius.full, borderWidth: 0.5,
    backgroundColor: colors.bg.card,
  },
  statChipText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },

  // Filter row
  filterRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
  filterChip: {
    paddingHorizontal: spacing.md, paddingVertical: 6,
    borderRadius: radius.full, borderWidth: 0.5,
    borderColor: colors.border.default, backgroundColor: colors.bg.card,
  },
  filterChipActive: { backgroundColor: colors.accent.brandDim, borderColor: colors.accent.brand },
  filterText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text.muted },
  filterTextActive: { color: colors.accent.brand },

  // Master toggle
  masterRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 0.5, borderColor: colors.border.default, minHeight: 52,
  },
  masterLabel: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text.primary },

  // Stock block
  stockBlock: {
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default,
    overflow: 'hidden',
  },
  stockHeader: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    padding: spacing.md, borderBottomWidth: 0.5, borderBottomColor: colors.border.subtle,
  },
  tickerBadge: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: colors.accent.brandDim, alignItems: 'center', justifyContent: 'center',
  },
  tickerBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.accent.brandBright },
  stockMeta: { flex: 1, gap: 3 },
  stockTicker: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text.primary },
  sourceTag: { alignSelf: 'flex-start', paddingHorizontal: 7, paddingVertical: 2, borderRadius: radius.sm },
  sourceTagText: { fontSize: 9, fontWeight: fontWeight.medium },
  stockPriceCol: { alignItems: 'flex-end' },
  stockPrice: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text.primary },
  stockChange: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },

  // Level grid
  levelGrid: { flexDirection: 'row', flexWrap: 'wrap', padding: spacing.sm, gap: spacing.sm },
  levelCard: {
    width: '47%', borderRadius: radius.md, padding: spacing.sm,
    borderWidth: 0.5, gap: 3,
  },
  levelCardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  levelTypeLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, letterSpacing: 0.5 },
  levelSwitch: { transform: [{ scaleX: 0.75 }, { scaleY: 0.75 }] },
  levelPrice: { fontSize: fontSize.lg, fontWeight: fontWeight.medium },
  levelNote: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.secondary },
  levelDist: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },

  // R/R bar
  rrRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderTopWidth: 0.5, borderTopColor: colors.border.subtle,
  },
  rrLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.muted, width: 72 },
  rrTrack: { flex: 1, height: 4, backgroundColor: colors.bg.secondary, borderRadius: 2 },
  rrFill: { height: 4, borderRadius: 2 },
  rrValue: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, minWidth: 32, textAlign: 'right' },
  rrBadge: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, minWidth: 64 },

  // Summary strip
  summaryStrip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderTopWidth: 0.5, borderTopColor: colors.border.subtle,
    backgroundColor: colors.bg.secondary,
  },
  summaryText: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.secondary },
  turnOnAll: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.accent.brand },

  // Empty
  emptyBlock: { alignItems: 'center', gap: spacing.md, paddingVertical: spacing.xxxl },
  emptyText: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.muted, textAlign: 'center' },
});
