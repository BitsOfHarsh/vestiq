import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import THEME from '../../src/theme';
import { EarningsDay, EconomicDay } from '../../src/mock';
import { getFearGreed, getRedditTrending } from '../../src/services/freedata';
import { TickerLogo } from '../../src/components/ui';
import { getCongressTrades } from '../../src/services/whalewisdom';
import { getRecentInsiderTrades, getEarningsCalendar, getEconomicCalendar, getQuote } from '../../src/services/fmp';

// ─── Dashboard data shapes ────────────────────────────────────────────────────

interface FGData    { value: number; label: string }
interface SnapTick  { symbol: string; value: number; change: number; isPrice: boolean }
interface CongressSignal { ticker: string; type: 'Buy' | 'Sell'; amount: string; repName: string }
interface RedditSignal   { ticker: string; rank: number; rankChange: number; mentions: number }
interface InsiderSignal  { ticker: string; type: 'Buy' | 'Sell'; price: string; insiderName: string }

const { colors, fontSize, fontWeight, radius, spacing, shadow } = THEME;

// ─── Gradient palette ─────────────────────────────────────────────────────────

const G = {
  card:     ['#1B1B26', '#111118'] as const,
  cardDeep: ['#131320', '#0C0C14'] as const,
  teal:     ['#0D9488', '#0F766E'] as const,
  green:    ['#10B981', '#059669'] as const,
  red:      ['#EF4444', '#DC2626'] as const,
  amber:    ['#F59E0B', '#D97706'] as const,
  blue:     ['#3B82F6', '#1D4ED8'] as const,
  orange:   ['#F97316', '#EA580C'] as const,
  purple:   ['#8B5CF6', '#6D28D9'] as const,
  grey:     ['#57534E', '#44403C'] as const,
  fearGreed:  ['#EF4444', '#F97316', '#EAB308', '#84CC16', '#10B981'] as const,
  valuation:  ['#10B981', '#84CC16', '#EAB308', '#F97316', '#EF4444'] as const,
};

// ─── Gradient Index bar ───────────────────────────────────────────────────────

function IndexBar({ value, gradColors, leftLabel, rightLabel }: {
  value: number;
  gradColors: readonly [string, string, ...string[]];
  leftLabel: string;
  rightLabel: string;
}) {
  const pct = Math.max(3, Math.min(97, value));
  return (
    <View style={bar.wrap}>
      <LinearGradient
        colors={gradColors}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={bar.track}
      >
        {/* white marker diamond */}
        <View style={[bar.marker, { left: `${pct}%` as `${number}%` }]} />
      </LinearGradient>
      <View style={bar.labels}>
        <Text style={bar.labelText}>{leftLabel}</Text>
        <Text style={bar.labelText}>{rightLabel}</Text>
      </View>
    </View>
  );
}

const bar = StyleSheet.create({
  wrap:  { gap: 7 },
  track: { height: 10, borderRadius: 6, position: 'relative', overflow: 'hidden' },
  marker: {
    position: 'absolute', top: -2, width: 5, height: 14,
    backgroundColor: '#FFFFFF', borderRadius: 3,
    transform: [{ translateX: -2.5 }],
    shadowColor: '#FFF', shadowOpacity: 0.6, shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
  },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  labelText: { fontSize: 10, fontWeight: fontWeight.regular, color: colors.text.muted },
});

// ─── Ticker badge: real logo, gradient accent as fallback ─────────────────────

function GradBadge({ ticker, size = 32 }: {
  ticker: string;
  grad?: readonly [string, string];
  size?: number;
}) {
  return <TickerLogo ticker={ticker} size={size} borderRadius={Math.round(size * 0.3)} />;
}

const gb = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center' },
  text: { fontWeight: fontWeight.bold, color: '#FFFFFF', letterSpacing: 0.3 },
});

// ─── Market status — manual UTC+DST calc (toLocaleString timezone is unreliable in RN) ──

function etOffsetHours(utc: Date): number {
  const y = utc.getUTCFullYear();
  // DST start: second Sunday of March at 07:00 UTC (= 2:00 AM EST → EDT)
  const mar1  = new Date(Date.UTC(y, 2, 1));
  const dstOn = new Date(Date.UTC(y, 2, 8 + (7 - mar1.getUTCDay()) % 7, 7));
  // DST end: first Sunday of November at 06:00 UTC (= 2:00 AM EDT → EST)
  const nov1   = new Date(Date.UTC(y, 10, 1));
  const dstOff = new Date(Date.UTC(y, 10, 1 + (7 - nov1.getUTCDay()) % 7, 6));
  return utc >= dstOn && utc < dstOff ? -4 : -5;
}

function getMarketStatus(): { status: string; label: string } {
  const now   = new Date();
  const et    = new Date(now.getTime() + etOffsetHours(now) * 3_600_000);
  const day   = et.getUTCDay();
  const mins  = et.getUTCHours() * 60 + et.getUTCMinutes();
  if (day === 0 || day === 6)  return { status: 'closed',      label: 'Market Closed' };
  if (mins < 4 * 60)           return { status: 'closed',      label: 'Market Closed' };
  if (mins < 9 * 60 + 30)      return { status: 'pre-market',  label: 'Pre-Market' };
  if (mins < 16 * 60)          return { status: 'open',        label: 'Market Open' };
  if (mins < 20 * 60)          return { status: 'after-hours', label: 'After Hours' };
  return { status: 'closed', label: 'Market Closed' };
}

// ─── Market Snapshot card ─────────────────────────────────────────────────────

const STATUS_DOT: Record<string, string> = {
  'open': colors.status.green,
  'pre-market': colors.status.amber,
  'after-hours': colors.status.blue,
  'closed': colors.status.red,
};

const FG_LABEL_COLOR: Record<string, string> = {
  FEAR: colors.status.amber, 'EXTREME FEAR': colors.status.red,
  NEUTRAL: colors.text.muted, GREED: '#84CC16', 'EXTREME GREED': colors.status.green,
};

function MarketSnapshotCard({ fearGreed, tickers, fetchedAt }: { fearGreed?: FGData; tickers?: SnapTick[]; fetchedAt?: Date }) {
  const { status, label: statusLabel } = getMarketStatus();
  const dotColor  = STATUS_DOT[status] ?? colors.text.muted;
  const updatedStr = fetchedAt
    ? `Updated ${fetchedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`
    : 'Fetching market data…';

  return (
    <LinearGradient colors={G.card} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={s.snapCard}>
      <LinearGradient colors={[colors.accent.teal, 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
        style={s.snapAccent}
      />

      <View style={s.snapHeaderRow}>
        <Text style={s.sectionLabel}>MARKET SNAPSHOT</Text>
        <View style={s.statusPill}>
          <View style={[s.statusDot, { backgroundColor: dotColor }]} />
          <Text style={s.statusLabel}>{statusLabel}</Text>
        </View>
      </View>

      <Text style={s.snapUpdated}>{updatedStr}</Text>

      {fearGreed ? (
        <>
          <View style={s.divider} />
          <View style={s.indexSection}>
            <View style={s.indexRow}>
              <Text style={s.indexLabel}>FEAR & GREED</Text>
              <View style={s.indexScoreRow}>
                <Text style={s.indexScore}>{fearGreed.value}</Text>
                <View style={[s.indexRatingPill, { backgroundColor: (FG_LABEL_COLOR[fearGreed.label.toUpperCase()] ?? colors.status.amber) + '20' }]}>
                  <Text style={[s.indexRating, { color: FG_LABEL_COLOR[fearGreed.label.toUpperCase()] ?? colors.status.amber }]}>{fearGreed.label}</Text>
                </View>
              </View>
            </View>
            <IndexBar value={fearGreed.value} gradColors={G.fearGreed} leftLabel="Fear" rightLabel="Greed" />
          </View>
        </>
      ) : (
        <View style={s.divider} />
      )}

      {tickers && tickers.length > 0 && (
        <>
          <View style={s.divider} />
          <View style={s.tickerRow}>
            {tickers.map((t) => {
              const pos = t.change >= 0;
              const cColor = pos ? colors.status.green : colors.status.red;
              return (
                <LinearGradient
                  key={t.symbol}
                  colors={['#22222E', '#181820']}
                  start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
                  style={s.tickerCard}
                >
                  <Text style={s.tickerSymbol}>{t.symbol}</Text>
                  <Text style={s.tickerValue}>
                    {t.value > 0
                      ? (t.isPrice
                          ? t.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : t.value.toFixed(2))
                      : '—'}
                  </Text>
                  <View style={[s.tickerChangePill, { backgroundColor: cColor + '18' }]}>
                    <Ionicons name={pos ? 'trending-up' : 'trending-down'} size={9} color={cColor} />
                    <Text style={[s.tickerChange, { color: cColor }]}>
                      {t.value > 0 ? `${pos ? '+' : ''}${t.change.toFixed(2)}%` : '—'}
                    </Text>
                  </View>
                </LinearGradient>
              );
            })}
          </View>
        </>
      )}

      {!fearGreed && !tickers && (
        <View style={{ alignItems: 'center', paddingVertical: spacing.lg }}>
          <ActivityIndicator size="small" color={colors.accent.teal} />
          <Text style={{ color: colors.text.muted, fontSize: fontSize.xs, marginTop: spacing.sm }}>Loading market data…</Text>
        </View>
      )}
    </LinearGradient>
  );
}

// ─── Morning Brief ────────────────────────────────────────────────────────────

function MorningBriefCard() {
  return (
    <LinearGradient colors={G.card} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={s.card}>
      <View style={s.cardHeaderRow}>
        <Text style={s.sectionLabel}>TODAY'S STRATEGY</Text>
        <TouchableOpacity style={s.refreshBtn} onPress={() => router.push('/(tabs)/research')} activeOpacity={0.7}>
          <Ionicons name="chatbubble-outline" size={13} color={colors.accent.teal} />
          <Text style={s.refreshText}>Ask Claude</Text>
        </TouchableOpacity>
      </View>
      <View style={{ alignItems: 'center', paddingVertical: spacing.xl, gap: spacing.sm }}>
        <Ionicons name="sparkles-outline" size={28} color={colors.accent.teal} />
        <Text style={{ fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text.primary }}>AI Strategy coming soon</Text>
        <Text style={{ fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.muted, textAlign: 'center', lineHeight: 20 }}>
          Tap "Ask Claude" in Research to get personalised trade ideas now
        </Text>
      </View>
    </LinearGradient>
  );
}

// ─── Early Signals 2×2 ───────────────────────────────────────────────────────

interface SignalCell {
  title: string; sub: string;
  ticker: string; line1: string; line1Color: string; line2: string;
  route: string;
  grad: readonly [string, string];
}

function EarlySignalCell({ cell }: { cell: SignalCell }) {
  return (
    <TouchableOpacity
      style={es.cell}
      onPress={() => router.push(cell.route as never)}
      activeOpacity={0.7}
    >
      {/* Colored gradient overlay from top */}
      <LinearGradient
        colors={[cell.grad[0] + '28', 'transparent']}
        start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />
      {/* Top accent line */}
      <LinearGradient colors={cell.grad as [string, string]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={es.accentLine} />

      <View style={es.cellHeader}>
        <View>
          <Text style={es.cellTitle}>{cell.title}</Text>
          <Text style={es.cellSub}>{cell.sub}</Text>
        </View>
        <Ionicons name="open-outline" size={12} color={colors.text.muted} />
      </View>

      {/* Big ticker */}
      <Text style={[es.cellTicker, { color: cell.grad[0] }]}>{cell.ticker}</Text>

      <Text style={[es.cellLine1, { color: cell.line1Color }]}>{cell.line1}</Text>
      <Text style={es.cellLine2} numberOfLines={1}>{cell.line2}</Text>
    </TouchableOpacity>
  );
}

type CellState = SignalCell | 'loading' | 'empty' | 'soon';

function EarlySignalsCard({
  congress: congProp, reddit: reddProp, insider: insProp,
}: { congress?: CongressSignal | null; reddit?: RedditSignal | null; insider?: InsiderSignal | null }) {
  const insiderGrad = insProp?.type === 'Sell' ? G.red : G.green;

  const cells: CellState[] = [
    congProp === undefined ? 'loading' : congProp === null ? 'empty' : {
      title: 'Congress', sub: 'Most recent', ticker: congProp.ticker,
      line1: `${congProp.type.toUpperCase()}  ${congProp.amount.split(' - ')[1] ?? congProp.amount}`,
      line1Color: congProp.type === 'Sell' ? colors.status.red : colors.status.green,
      line2: `${congProp.repName.split(' ')[0]} ${congProp.repName.split(' ')[1]?.slice(0, 1) ?? ''}.`,
      route: '/congress', grad: G.blue,
    },
    reddProp === undefined ? 'loading' : reddProp === null ? 'empty' : {
      title: 'Reddit', sub: 'Trending', ticker: reddProp.ticker,
      line1: `${reddProp.rankChange >= 0 ? '+' : ''}${reddProp.rankChange} to #${reddProp.rank}`,
      line1Color: reddProp.rankChange >= 0 ? colors.status.green : colors.status.red,
      line2: `${reddProp.mentions} mentions today`,
      route: '/reddit', grad: G.orange,
    },
    insProp === undefined ? 'loading' : insProp === null ? 'empty' : {
      title: 'Insider', sub: 'Most recent', ticker: insProp.ticker,
      line1: `${insProp.type.toUpperCase()}  ${insProp.price}`,
      line1Color: insProp.type === 'Sell' ? colors.status.red : colors.status.green,
      line2: `${insProp.insiderName.split(' ').slice(-1)[0]} ${insProp.insiderName.split(' ')[0].slice(0, 1)}.`,
      route: '/insider', grad: insiderGrad,
    },
    'soon' as const,
  ];

  const LABELS  = ['Congress', 'Reddit', 'Insider', 'Super Investors'];
  const ROUTES  = ['/congress', '/reddit', '/insider', '/super-investors'];

  return (
    <LinearGradient colors={G.cardDeep} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={es.card}>
      <View style={es.labelRow}>
        <LinearGradient colors={G.teal} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={es.labelAccent} />
        <Text style={es.label}>POTENTIAL EARLY SIGNALS</Text>
      </View>
      <View style={es.grid}>
        {cells.map((c, i) =>
          typeof c === 'object' ? (
            <EarlySignalCell key={LABELS[i]} cell={c} />
          ) : (
            <TouchableOpacity
              key={i}
              style={[es.cell, { alignItems: 'center', justifyContent: 'center' }]}
              onPress={() => router.push(ROUTES[i] as never)}
              activeOpacity={0.7}
            >
              {c === 'loading' ? (
                <ActivityIndicator size="small" color={colors.text.muted} />
              ) : (
                <Ionicons name={c === 'soon' ? 'time-outline' : 'alert-circle-outline'} size={20} color={colors.text.muted} />
              )}
              <Text style={{ color: colors.text.muted, fontSize: fontSize.xs, marginTop: 6, fontWeight: fontWeight.medium }}>
                {LABELS[i]}
              </Text>
              <Text style={{ color: colors.text.muted, fontSize: 9, marginTop: 2 }}>
                {c === 'loading' ? 'Loading…' : c === 'soon' ? 'Coming soon' : 'No signal'}
              </Text>
            </TouchableOpacity>
          )
        )}
      </View>
    </LinearGradient>
  );
}

// ─── Upcoming Events card ─────────────────────────────────────────────────────

function EarningsDayRow({ day }: { day: EarningsDay }) {
  const all = [...day.preMarket, ...day.postMarket];
  const beatCompany = all.find(c => c.beatPct !== undefined);
  return (
    <View style={s.earningsDay}>
      <Text style={s.earningsDayLabel}>{day.date}</Text>
      <View style={s.earningsLogos}>
        {all.map(c => (
          <TickerLogo key={c.ticker} ticker={c.ticker} size={28} borderRadius={6} />
        ))}
        {beatCompany && (
          <View style={s.beatBadge}>
            <Text style={s.beatText}>{beatCompany.beatPct}% Beat</Text>
          </View>
        )}
      </View>
    </View>
  );
}

function UpcomingEventsCard({ earnings: earnProp, economic: ecoProp }: { earnings?: EarningsDay[] | null; economic?: EconomicDay[] | null }) {
  const earningsHint = earnProp === undefined ? 'Loading…' : !earnProp?.length ? 'No upcoming earnings' : null;
  const economicHint = ecoProp  === undefined ? 'Loading…' : !ecoProp?.length  ? 'No upcoming events'  : null;

  return (
    <LinearGradient colors={G.card} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={[s.card, { gap: spacing.md }]}>
      <Text style={s.sectionLabel}>UPCOMING EVENTS</Text>

      {/* Earnings + Economic */}
      <View style={s.earningsEconomicRow}>
        <TouchableOpacity
          style={s.earningsCol}
          onPress={() => router.push({ pathname: '/events', params: { tab: 'earnings' } })}
          activeOpacity={0.7}
        >
          <View style={s.eventsSectionHeader}>
            <LinearGradient colors={G.amber} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={s.sectionAccentBar} />
            <Text style={s.eventsSectionLabel}>EARNINGS</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.text.muted} />
          </View>
          {earningsHint
            ? <Text style={s.emptyHint}>{earningsHint}</Text>
            : (earnProp ?? []).slice(0, 3).map(day => <EarningsDayRow key={day.date} day={day} />)
          }
        </TouchableOpacity>

        <View style={s.vertDivider} />

        <TouchableOpacity
          style={s.economicCol}
          onPress={() => router.push({ pathname: '/events', params: { tab: 'economic' } })}
          activeOpacity={0.7}
        >
          <View style={s.eventsSectionHeader}>
            <LinearGradient colors={G.blue} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={s.sectionAccentBar} />
            <Text style={s.eventsSectionLabel}>ECONOMIC</Text>
            <Ionicons name="chevron-forward" size={12} color={colors.text.muted} />
          </View>
          {economicHint
            ? <Text style={s.emptyHint}>{economicHint}</Text>
            : (ecoProp ?? []).map(day => (
                <View key={day.date} style={s.economicDay}>
                  <View style={s.economicDot} />
                  <View>
                    <Text style={s.economicDayLabel}>{day.date}</Text>
                    {day.events.map(ev => (
                      <Text key={ev} style={s.economicEvent} numberOfLines={1}>{ev}</Text>
                    ))}
                  </View>
                </View>
              ))
          }
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

function fmtAmt(low: number, high: number): string {
  const fmt = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${(n / 1_000).toFixed(0)}K`;
  return high > 0 && high !== low ? `${fmt(low)} - ${fmt(high)}` : fmt(low || 0);
}

export default function DashboardScreen() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const [fgData,      setFgData]      = useState<FGData | undefined>();
  const [snapTicks,   setSnapTicks]   = useState<SnapTick[] | undefined>();
  const [snapFetchAt, setSnapFetchAt] = useState<Date | undefined>();
  // undefined = loading, null = loaded with no signal, value = has signal
  const [cong,      setCong]      = useState<CongressSignal | null | undefined>();
  const [redd,      setRedd]      = useState<RedditSignal | null | undefined>();
  const [ins,       setIns]       = useState<InsiderSignal | null | undefined>();
  const [earnings,  setEarnings]  = useState<EarningsDay[] | null | undefined>();
  const [economic,  setEconomic]  = useState<EconomicDay[] | null | undefined>();

  useEffect(() => {
    // Fear & Greed
    getFearGreed().then(fg => setFgData({ value: fg.value, label: fg.label })).catch(() => {});

    // Market indices — all from FMP stable (VIX uses ^VIX symbol)
    Promise.all([
      getQuote('SPY').catch(() => null),
      getQuote('^VIX').catch(() => null),
      getQuote('BTCUSD').catch(() => null),
    ]).then(([spy, vix, btc]) => {
      const ticks = [
        { symbol: 'VIX',     value: vix?.price ?? 0,  change: vix?.changePct ?? 0,  isPrice: false },
        { symbol: 'S&P 500', value: spy?.price ?? 0,  change: spy?.changePct ?? 0,  isPrice: true  },
        { symbol: 'Bitcoin', value: btc?.price ?? 0,  change: btc?.changePct ?? 0,  isPrice: true  },
      ];
      if (ticks.some(t => t.value > 0)) setSnapTicks(ticks);
      setSnapFetchAt(new Date());
    }).catch(() => { setSnapFetchAt(new Date()); });

    // Congress trades
    getCongressTrades(undefined, 5).then(trades => {
      if (trades[0]) {
        const t = trades[0];
        setCong({ ticker: t.ticker, type: t.type === 'Purchase' ? 'Buy' : 'Sell', amount: fmtAmt(t.amountLow, t.amountHigh), repName: t.representative });
      } else {
        setCong(null);
      }
    }).catch(() => setCong(null));

    // Reddit trending
    getRedditTrending(1).then(data => {
      if (data.length) {
        const top = [...data].sort((a, b) => Math.abs(b.rankChange) - Math.abs(a.rankChange))[0];
        setRedd({ ticker: top.ticker, rank: top.rank, rankChange: top.rankChange, mentions: top.mentions });
      } else {
        setRedd(null);
      }
    }).catch(() => setRedd(null));

    // Recent insider trades
    getRecentInsiderTrades(5).then(trades => {
      if (trades[0]) {
        const t = trades[0];
        setIns({ ticker: t.ticker, type: t.type, price: `$${t.price.toFixed(2)}`, insiderName: t.name });
      } else {
        setIns(null);
      }
    }).catch(() => setIns(null));

    // Earnings calendar
    getEarningsCalendar(14).then(cal => {
      if (!cal.length) { setEarnings(null); return; }
      const grouped: Record<string, EarningsDay> = {};
      for (const e of cal) {
        if (!grouped[e.date]) grouped[e.date] = { date: new Date(e.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), preMarket: [], postMarket: [] };
        const company = { ticker: e.ticker, name: e.ticker };
        if (e.time === 'bmo') grouped[e.date].preMarket.push(company);
        else                  grouped[e.date].postMarket.push(company);
      }
      const days = Object.values(grouped).filter(d => d.preMarket.length + d.postMarket.length > 0).slice(0, 5);
      setEarnings(days.length ? days : null);
    }).catch(() => setEarnings(null));

    // Economic calendar (US, medium+high impact)
    getEconomicCalendar(14).then(cal => {
      if (!cal.length) { setEconomic(null); return; }
      const grouped: Record<string, string[]> = {};
      for (const e of cal) {
        if (e.country !== 'US' && e.country !== 'United States') continue;
        if (e.impact === 'Low') continue;
        if (!grouped[e.date]) grouped[e.date] = [];
        grouped[e.date].push(e.event);
      }
      const days: EconomicDay[] = Object.entries(grouped).slice(0, 3).map(([date, events]) => ({
        date: new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        events,
      }));
      setEconomic(days.length ? days : null);
    }).catch(() => setEconomic(null));
  }, []);

  return (
    <SafeAreaView style={s.container}>

      {/* Header */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Dashboard</Text>
          <Text style={s.headerDate}>{today}</Text>
        </View>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="search-outline" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
          <TouchableOpacity style={s.iconBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="notifications-outline" size={20} color={colors.text.secondary} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <MarketSnapshotCard fearGreed={fgData} tickers={snapTicks} fetchedAt={snapFetchAt} />
        <MorningBriefCard />
        <EarlySignalsCard congress={cong} reddit={redd} insider={ins} />
        <UpcomingEventsCard earnings={earnings} economic={economic} />
        <View style={{ height: spacing.xl }} />
      </ScrollView>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: colors.border.default,
  },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.semibold, color: colors.text.primary },
  headerDate:  { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.muted, marginTop: 2 },
  headerRight: { flexDirection: 'row', gap: spacing.sm },
  iconBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },

  scroll: { padding: spacing.xl, gap: spacing.lg },

  // Generic card (LinearGradient as container)
  card: {
    borderRadius: radius.xl, borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.md, gap: spacing.sm, overflow: 'hidden',
    ...THEME.shadow.card,
  },
  cardHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  divider: { height: 0.5, backgroundColor: colors.border.default },

  sectionLabel: {
    fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text.muted,
    letterSpacing: 0.8, textTransform: 'uppercase',
  },

  // Market Snapshot
  snapCard: {
    borderRadius: radius.xl, borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.md, gap: spacing.md, overflow: 'hidden',
    ...THEME.shadow.card,
  },
  snapAccent: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  snapHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 },
  snapUpdated: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.muted },
  snapHeadline: { fontSize: fontSize.xl, fontWeight: fontWeight.semibold, color: colors.text.primary, lineHeight: 28 },
  snapDesc: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.secondary, lineHeight: 20 },

  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.full, borderWidth: 0.5, borderColor: colors.border.default,
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.text.secondary },

  // Index
  indexSection: { gap: spacing.sm },
  indexRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  indexLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text.muted, letterSpacing: 0.6 },
  indexScoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  indexScore: { fontSize: fontSize.lg, fontWeight: fontWeight.bold, color: colors.text.primary },
  indexRatingPill: { paddingHorizontal: spacing.sm, paddingVertical: 3, borderRadius: radius.sm },
  indexRating: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold },

  // Ticker cards
  tickerRow: { flexDirection: 'row', gap: spacing.sm },
  tickerCard: {
    flex: 1, alignItems: 'center', gap: 4,
    padding: spacing.sm, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default,
    ...THEME.shadow.sm,
  },
  tickerSymbol: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text.muted, letterSpacing: 0.5 },
  tickerValue:  { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text.primary },
  tickerChangePill: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 5, paddingVertical: 2, borderRadius: radius.sm },
  tickerChange: { fontSize: 10, fontWeight: fontWeight.semibold },

  // Summary
  summaryList: { gap: 8 },
  summaryRow:  { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  summaryAccent: { width: 3, height: 14, borderRadius: 2, flexShrink: 0 },
  summaryText: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.secondary },

  // Morning Brief
  refreshBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  refreshText: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.accent.teal },
  actionRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.sm,
    paddingVertical: spacing.sm, minHeight: 52,
  },
  actionStrip: { width: 3, height: 36, borderRadius: 2, flexShrink: 0 },
  actionBody: { flex: 1 },
  actionTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  actionTicker: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.text.primary },
  actionPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.xs },
  actionPillText: { fontSize: fontSize.xs, fontWeight: fontWeight.bold, color: '#FFFFFF', letterSpacing: 0.5 },
  actionReason: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.secondary, marginTop: 2 },

  // Upcoming Events
  eventsSection: { gap: spacing.sm },
  eventsSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionAccentBar: { width: 3, height: 14, borderRadius: 2 },
  eventsSectionLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text.secondary, letterSpacing: 0.6 },

  notableList: { gap: 6 },
  notableRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  notableDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent.teal, marginTop: 5, flexShrink: 0 },
  notableText: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.secondary },

  earningsEconomicRow: { flexDirection: 'row', gap: spacing.md },
  earningsCol: { flex: 1, gap: spacing.sm },
  economicCol: { flex: 1, gap: spacing.sm },
  vertDivider: { width: 0.5, backgroundColor: colors.border.default },

  earningsDay:      { gap: 4 },
  earningsDayLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text.secondary },
  earningsLogos:    { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' },
  earningsBadge: {
    width: 30, height: 30, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center',
  },
  earningsBadgeText: { fontSize: 8, fontWeight: fontWeight.bold, color: '#FFFFFF' },
  beatBadge: {
    backgroundColor: colors.status.green + '20', borderRadius: radius.sm,
    paddingHorizontal: 5, paddingVertical: 2,
  },
  beatText: { fontSize: 9, fontWeight: fontWeight.semibold, color: colors.status.green },

  economicDay:      { flexDirection: 'row', alignItems: 'flex-start', gap: 6 },
  economicDot:      { width: 5, height: 5, borderRadius: 3, backgroundColor: colors.text.muted, marginTop: 5, flexShrink: 0 },
  economicDayLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text.secondary },
  economicEvent:    { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.muted, marginTop: 1 },
  emptyHint:        { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.muted, marginTop: spacing.sm },
});

// ─── Early Signals styles ─────────────────────────────────────────────────────

const es = StyleSheet.create({
  card: {
    borderRadius: radius.xl, borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.md, gap: spacing.md, overflow: 'hidden',
    ...THEME.shadow.card,
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  labelAccent: { width: 3, height: 14, borderRadius: 2 },
  label: { fontSize: fontSize.xs, fontWeight: fontWeight.semibold, color: colors.text.muted, letterSpacing: 0.8 },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: {
    width: '47.5%', backgroundColor: '#17171F',
    borderRadius: radius.lg, borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.md, gap: 6, overflow: 'hidden',
    ...THEME.shadow.sm,
  },
  accentLine: { height: 2, borderRadius: 1, marginBottom: 2 },
  cellHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cellTitle:  { fontSize: fontSize.sm, fontWeight: fontWeight.semibold, color: colors.text.primary },
  cellSub:    { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.muted, marginTop: 1 },
  cellTicker: { fontSize: fontSize.xxl, fontWeight: fontWeight.bold, marginTop: 2, letterSpacing: -0.5 },
  cellLine1:  { fontSize: fontSize.sm, fontWeight: fontWeight.semibold },
  cellLine2:  { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.muted },
});
