import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import THEME from '../../src/theme';
import { EarningsDay } from '../../src/mock';
import { getFearGreed, getRedditTrending } from '../../src/services/freedata';
import { getMarketNews } from '../../src/services/finnhub';
import { getMorningBrief, MorningBrief } from '../../src/services/claude';
import { TickerLogo, ScalePressable } from '../../src/components/ui';
import VSkeleton from '../../src/components/ui/Skeleton';
import { getRecentInsiderActivity } from '../../src/services/finnhub';
import { getEarningsCalendar, getEconomicCalendar, getQuote } from '../../src/services/fmp';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FGData        { value: number; label: string }
interface SnapTick      { symbol: string; value: number; change: number; isPrice: boolean }
interface CongressSignal{ ticker: string; type: 'Buy' | 'Sell'; amount: string; repName: string }
interface RedditSignal  { ticker: string; rank: number; rankChange: number; mentions: number }
interface InsiderSignal { ticker: string; type: 'Buy' | 'Sell'; price: string; insiderName: string }

const { colors, fontSize, fontWeight, fontFamily, radius, spacing } = THEME;

// ─── Signal accent colours (per data type) ────────────────────────────────────

const SIG_COLOR = {
  green:  colors.status.green,
  red:    colors.status.red,
  amber:  colors.status.amber,
  blue:   colors.status.blue,
  violet: colors.accent.violet,
  orange: '#c06a00',
};

// ─── Gradient index bar (data viz — gradient is intentional here) ─────────────

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
  wrap:  { gap: 6 },
  track: { height: 8, borderRadius: radius.full, overflow: 'hidden' },
  marker: {
    position: 'absolute', top: -1, width: 4, height: 10,
    backgroundColor: '#FFFFFF', borderRadius: radius.full,
    transform: [{ translateX: -2 }],
  },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  labelText: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, color: colors.text.muted },
});

// ─── Market status ─────────────────────────────────────────────────────────────

function etOffsetHours(utc: Date): number {
  const y = utc.getUTCFullYear();
  const mar1  = new Date(Date.UTC(y, 2, 1));
  const dstOn = new Date(Date.UTC(y, 2, 8 + (7 - mar1.getUTCDay()) % 7, 7));
  const nov1   = new Date(Date.UTC(y, 10, 1));
  const dstOff = new Date(Date.UTC(y, 10, 1 + (7 - nov1.getUTCDay()) % 7, 6));
  return utc >= dstOn && utc < dstOff ? -4 : -5;
}

function getMarketStatus(): { status: string; label: string } {
  const now  = new Date();
  const et   = new Date(now.getTime() + etOffsetHours(now) * 3_600_000);
  const day  = et.getUTCDay();
  const mins = et.getUTCHours() * 60 + et.getUTCMinutes();
  if (day === 0 || day === 6)  return { status: 'closed',      label: 'Market Closed' };
  if (mins < 4 * 60)           return { status: 'closed',      label: 'Market Closed' };
  if (mins < 9 * 60 + 30)      return { status: 'pre-market',  label: 'Pre-Market' };
  if (mins < 16 * 60)          return { status: 'open',        label: 'Market Open' };
  if (mins < 20 * 60)          return { status: 'after-hours', label: 'After Hours' };
  return { status: 'closed', label: 'Market Closed' };
}

const STATUS_DOT: Record<string, string> = {
  'open': colors.status.green,
  'pre-market': colors.status.amber,
  'after-hours': colors.status.blue,
  'closed': colors.status.red,
};

const FG_LABEL_COLOR: Record<string, string> = {
  'EXTREME FEAR': colors.status.red,
  FEAR:           colors.status.amber,
  NEUTRAL:        colors.text.muted,
  GREED:          colors.status.green,
  'EXTREME GREED':colors.status.green,
};

const VAL_LABEL_COLOR: Record<string, string> = {
  BARGAIN: colors.status.green,
  FAIR:    colors.status.green,
  HIGH:    colors.status.amber,
  EXTREME: colors.status.red,
};

const SENTIMENT_COLOR = {
  positive: colors.status.green,
  neutral:  colors.text.muted,
  negative: colors.status.red,
};

const FG_GRAD = ['#e23b4a', '#b09000', '#b09000', '#428619', '#428619'] as const;
const VAL_GRAD = ['#428619', '#428619', '#b09000', '#b06500', '#e23b4a'] as const;

// ─── Market Snapshot card ─────────────────────────────────────────────────────

function MarketSnapshotCard({ fearGreed, tickers, fetchedAt, brief }: {
  fearGreed?: FGData;
  tickers?: SnapTick[];
  fetchedAt?: Date;
  brief?: MorningBrief | null;
}) {
  const { status, label: statusLabel } = getMarketStatus();
  const dotColor   = STATUS_DOT[status] ?? colors.text.muted;
  const updatedStr = fetchedAt
    ? `Updated ${fetchedAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}`
    : 'Fetching…';

  return (
    <View style={s.snapCard}>
      {/* Cobalt violet top accent — 3px solid */}
      <View style={s.snapAccent} />

      {/* Header */}
      <View style={s.snapHeaderRow}>
        <Text style={s.sectionLabel}>MARKET SNAPSHOT</Text>
        <View style={s.statusPill}>
          <View style={[s.statusDot, { backgroundColor: dotColor }]} />
          <Text style={s.statusLabel}>{statusLabel}</Text>
        </View>
      </View>

      <Text style={s.snapUpdated}>{updatedStr}</Text>

      {/* AI brief */}
      {brief === undefined ? (
        <View style={s.briefLoading}>
          <VSkeleton width="85%" height={17} borderRadius={5} />
          <VSkeleton width="100%" height={13} borderRadius={4} />
          <VSkeleton width="70%" height={13} borderRadius={4} />
        </View>
      ) : brief ? (
        <View style={s.briefBlock}>
          <Text style={s.snapHeadline}>{brief.headline}</Text>
          <Text style={s.snapDesc}>{brief.description}</Text>
        </View>
      ) : (
        <View style={s.briefLocked}>
          <Ionicons name="sparkles-outline" size={14} color={colors.accent.violet} />
          <Text style={s.briefLockedText}>
            Market brief unavailable — tap to retry
          </Text>
        </View>
      )}

      {/* Fear & Greed */}
      {fearGreed ? (
        <>
          <View style={s.divider} />
          <View style={s.indexSection}>
            <View style={s.indexRow}>
              <Text style={s.indexLabel}>FEAR & GREED</Text>
              <View style={s.indexScoreRow}>
                <Text style={s.indexScore}>{fearGreed.value}</Text>
                <View style={[s.indexRatingPill, {
                  backgroundColor: (FG_LABEL_COLOR[fearGreed.label.toUpperCase()] ?? colors.status.amber) + '20',
                }]}>
                  <Text style={[s.indexRating, {
                    color: FG_LABEL_COLOR[fearGreed.label.toUpperCase()] ?? colors.status.amber,
                  }]}>{fearGreed.label}</Text>
                </View>
              </View>
            </View>
            <IndexBar value={fearGreed.value} gradColors={FG_GRAD} leftLabel="Fear" rightLabel="Greed" />
          </View>
        </>
      ) : null}

      {/* Valuation index */}
      {brief?.valuationLabel ? (
        <View style={s.indexSection}>
          <View style={s.indexRow}>
            <Text style={s.indexLabel}>VALUATION INDEX</Text>
            <View style={[s.indexRatingPill, {
              backgroundColor: (VAL_LABEL_COLOR[brief.valuationLabel.toUpperCase()] ?? colors.status.amber) + '20',
            }]}>
              <Text style={[s.indexRating, {
                color: VAL_LABEL_COLOR[brief.valuationLabel.toUpperCase()] ?? colors.status.amber,
              }]}>{brief.valuationLabel}</Text>
            </View>
          </View>
          <IndexBar value={brief.valuationValue} gradColors={VAL_GRAD} leftLabel="Bargain" rightLabel="Extreme" />
        </View>
      ) : null}

      {/* Ticker strip */}
      {tickers && tickers.length > 0 && (
        <>
          <View style={s.divider} />
          <View style={s.tickerRow}>
            {tickers.map((t) => {
              const pos    = t.change >= 0;
              const cColor = pos ? colors.status.green : colors.status.red;
              return (
                <View key={t.symbol} style={s.tickerCard}>
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
                </View>
              );
            })}
          </View>
        </>
      )}

      {/* Market summary bullets */}
      {brief?.bullets?.length ? (
        <>
          <View style={s.divider} />
          <Text style={[s.sectionLabel, { marginBottom: 2 }]}>MARKET SUMMARY</Text>
          <View style={s.summaryList}>
            {brief.bullets.map((b, i) => (
              <View key={i} style={s.summaryRow}>
                <View style={[s.summaryAccent, {
                  backgroundColor: SENTIMENT_COLOR[b.sentiment] ?? colors.text.muted,
                }]} />
                <Text style={s.summaryText}>{b.text}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </View>
  );
}

// ─── Early Signals 2×2 ───────────────────────────────────────────────────────

interface SignalCell {
  title: string; sub: string;
  ticker: string; line1: string; line1Color: string; line2: string;
  route: string;
  accentColor: string;
}

function EarlySignalCell({ cell }: { cell: SignalCell }) {
  return (
    <ScalePressable
      style={es.cell}
      onPress={() => router.push(cell.route as never)}
    >
      {/* Top accent bar — solid colour */}
      <View style={[es.accentBar, { backgroundColor: cell.accentColor }]} />

      <View style={es.cellHeader}>
        <View style={es.cellHeaderText}>
          <Text style={es.cellTitle}>{cell.title}</Text>
          <Text style={es.cellSub}>{cell.sub}</Text>
        </View>
        <Ionicons name="open-outline" size={11} color={colors.text.muted} />
      </View>

      <Text style={[es.cellTicker, { color: cell.accentColor }]}>{cell.ticker}</Text>
      <Text style={[es.cellLine1, { color: cell.line1Color }]}>{cell.line1}</Text>
      <Text style={es.cellLine2} numberOfLines={1}>{cell.line2}</Text>
    </ScalePressable>
  );
}

type CellState = SignalCell | 'loading' | 'empty' | 'soon';

function EarlySignalsCard({
  congress: congProp, reddit: reddProp, insider: insProp,
}: { congress?: CongressSignal | null; reddit?: RedditSignal | null; insider?: InsiderSignal | null }) {
  const insiderColor = insProp?.type === 'Sell' ? SIG_COLOR.red : SIG_COLOR.green;

  const cells: CellState[] = [
    reddProp === undefined ? 'loading' : reddProp === null ? 'empty' : {
      title: 'Reddit', sub: 'Trending',
      ticker: reddProp.ticker,
      line1: `${reddProp.rankChange >= 0 ? '+' : ''}${reddProp.rankChange} to #${reddProp.rank}`,
      line1Color: reddProp.rankChange >= 0 ? colors.status.green : colors.status.red,
      line2: `${reddProp.mentions} mentions today`,
      route: '/reddit', accentColor: SIG_COLOR.orange,
    },
    insProp === undefined ? 'loading' : insProp === null ? 'empty' : {
      title: 'Insider', sub: 'Most recent',
      ticker: insProp.ticker,
      line1: `${insProp.type.toUpperCase()}  ${insProp.price}`,
      line1Color: insiderColor,
      line2: `${insProp.insiderName.split(' ').slice(-1)[0]} ${insProp.insiderName.split(' ')[0].slice(0, 1)}.`,
      route: '/insider', accentColor: insiderColor,
    },
  ];

  const LABELS = ['Reddit', 'Insider'];
  const ROUTES = ['/reddit', '/insider'];

  return (
    <View style={es.card}>
      <View style={es.labelRow}>
        <View style={[es.labelAccent, { backgroundColor: colors.accent.violet }]} />
        <Text style={es.label}>POTENTIAL EARLY SIGNALS</Text>
      </View>
      <View style={es.grid}>
        {cells.map((c, i) =>
          typeof c === 'object' ? (
            <EarlySignalCell key={LABELS[i]} cell={c} />
          ) : (
            <ScalePressable
              key={i}
              style={[es.cell, { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl }]}
              onPress={() => router.push(ROUTES[i] as never)}
            >
              {/* Coming-soon violet accent */}
              <View style={[es.accentBar, { backgroundColor: colors.accent.violet + '60' }]} />
              {c === 'loading' ? (
                <ActivityIndicator size="small" color={colors.text.muted} />
              ) : (
                <Ionicons
                  name={c === 'soon' ? 'time-outline' : 'alert-circle-outline'}
                  size={18} color={colors.text.muted}
                />
              )}
              <Text style={es.cellEmptyLabel}>{LABELS[i]}</Text>
              <Text style={es.cellEmptyHint}>
                {c === 'loading' ? 'Loading…' : c === 'soon' ? 'Coming soon' : 'No signal'}
              </Text>
            </ScalePressable>
          )
        )}
      </View>
    </View>
  );
}

// ─── Upcoming Events ──────────────────────────────────────────────────────────

function EarningsDayRow({ day }: { day: EarningsDay }) {
  const all = [...day.preMarket, ...day.postMarket];
  const beatCompany = all.find(c => c.beatPct !== undefined);
  return (
    <View style={s.earningsDay}>
      <Text style={s.earningsDayLabel}>{day.date}</Text>
      <View style={s.earningsLogos}>
        {all.map(c => (
          <TickerLogo
            key={c.ticker} ticker={c.ticker} size={28} borderRadius={radius.sm}
            onPress={() => router.push({ pathname: '/stock/[ticker]', params: { ticker: c.ticker } })}
          />
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

function UpcomingEventsCard({
  earnings: earnProp, notable: notableProp,
}: { earnings?: EarningsDay[] | null; notable?: string[] | null }) {
  const earningsHint = earnProp === undefined ? 'Loading…' : !earnProp?.length ? 'No upcoming earnings' : null;
  const notableHint  = notableProp === undefined ? 'Loading…' : !notableProp?.length ? 'No notable events' : null;

  return (
    <View style={s.eventsCard}>
      <Text style={s.sectionLabel}>UPCOMING EVENTS</Text>

      <View style={s.earningsEconomicRow}>
        {/* Earnings */}
        <ScalePressable
          style={s.earningsCol}
          scaleTo={0.98}
          onPress={() => router.push({ pathname: '/events', params: { tab: 'earnings' } })}
        >
          <View style={s.eventsSectionHeader}>
            <View style={[s.sectionAccentBar, { backgroundColor: colors.status.amber }]} />
            <Text style={s.eventsSectionLabel}>EARNINGS</Text>
            <Ionicons name="chevron-forward" size={11} color={colors.text.muted} />
          </View>
          {earningsHint
            ? <Text style={s.emptyHint}>{earningsHint}</Text>
            : (earnProp ?? []).map(day => <EarningsDayRow key={day.date} day={day} />)
          }
        </ScalePressable>

        <View style={s.vertDivider} />

        {/* Notable */}
        <View style={s.economicCol}>
          <View style={s.eventsSectionHeader}>
            <View style={[s.sectionAccentBar, { backgroundColor: colors.accent.violet }]} />
            <Text style={s.eventsSectionLabel}>NOTABLE</Text>
          </View>
          {notableHint
            ? <Text style={s.emptyHint}>{notableHint}</Text>
            : (notableProp ?? []).map((item, i) => (
                <View key={i} style={s.notableRow}>
                  <View style={s.notableDot} />
                  <Text style={s.notableText} numberOfLines={2}>{item}</Text>
                </View>
              ))
          }
        </View>
      </View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

function fmtAmt(low: number, high: number): string {
  const fmt = (n: number) => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${(n / 1_000).toFixed(0)}K`;
  return high > 0 && high !== low ? `${fmt(low)} - ${fmt(high)}` : fmt(low || 0);
}

export default function DashboardScreen() {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const [fgData,      setFgData]      = useState<FGData | undefined>();
  const [snapTicks,   setSnapTicks]   = useState<SnapTick[] | undefined>();
  const [snapFetchAt, setSnapFetchAt] = useState<Date | undefined>();
  const [brief,       setBrief]       = useState<MorningBrief | null | undefined>();
  const [cong,        setCong]        = useState<CongressSignal | null | undefined>();
  const [redd,        setRedd]        = useState<RedditSignal | null | undefined>();
  const [ins,         setIns]         = useState<InsiderSignal | null | undefined>();
  const [earnings,    setEarnings]    = useState<EarningsDay[] | null | undefined>();
  const [notable,     setNotable]     = useState<string[] | null | undefined>();

  useEffect(() => {
    // Fear & Greed
    getFearGreed().then(fg => setFgData({ value: fg.value, label: fg.label })).catch(() => {});

    // Market indices
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

    // Morning brief via Claude
    ;(async () => {
      try {
        const dateStr = new Date().toISOString().slice(0, 10);
        const [fg, spy, vix, btc, tnx, dxy, news] = await Promise.all([
          getFearGreed().catch(() => null),
          getQuote('SPY').catch(() => null),
          getQuote('^VIX').catch(() => null),
          getQuote('BTCUSD').catch(() => null),
          getQuote('^TNX').catch(() => null),
          getQuote('DX-Y.NYB').catch(() => null),
          getMarketNews('general').catch(() => [] as Awaited<ReturnType<typeof getMarketNews>>),
        ]);
        if (!fg) { setBrief(null); return; }
        const headlines = (news ?? []).slice(0, 12).map(n => n.headline);
        const result = await getMorningBrief(
          dateStr,
          { value: fg.value, label: fg.label },
          {
            spy: spy?.price ?? 0, spyChg: spy?.changePct ?? 0,
            vix: vix?.price ?? 0, vixChg: vix?.changePct ?? 0,
            btc: btc?.price ?? 0, btcChg: btc?.changePct ?? 0,
            tnx: tnx?.price,
            dxy: dxy?.price,
          },
          headlines,
          getMarketStatus().status as 'pre-market' | 'open' | 'closed' | 'after-hours',
        );
        setBrief(result);
      } catch {
        setBrief(null);
      }
    })();

    // Congress — watcher sites down
    setCong(null);

    // Reddit trending
    getRedditTrending(1).then(data => {
      if (data.length) {
        const top = [...data].sort((a, b) => Math.abs(b.rankChange) - Math.abs(a.rankChange))[0];
        setRedd({ ticker: top.ticker, rank: top.rank, rankChange: top.rankChange, mentions: top.mentions });
      } else {
        setRedd(null);
      }
    }).catch(() => setRedd(null));

    // Insider trades via Finnhub
    getRecentInsiderActivity().then(t => {
      if (t) {
        setIns({ ticker: t.ticker, type: t.type, price: `$${(t.value / Math.max(1, t.shares)).toFixed(2)}`, insiderName: t.name });
      } else {
        setIns(null);
      }
    }).catch(() => setIns(null));

    // Earnings calendar
    getEarningsCalendar(14).then(cal => {
      if (!cal.length) { setEarnings(null); return; }
      const grouped: Record<string, EarningsDay> = {};
      for (const e of cal) {
        if (!grouped[e.date]) grouped[e.date] = {
          date: new Date(e.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          preMarket: [], postMarket: [],
        };
        const company = { ticker: e.ticker, name: e.ticker };
        if (e.time === 'bmo') grouped[e.date].preMarket.push(company);
        else                  grouped[e.date].postMarket.push(company);
      }
      const days = Object.entries(grouped)
        .filter(([, d]) => d.preMarket.length + d.postMarket.length > 0)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, d]) => d);
      setEarnings(days.length ? days : null);
    }).catch(() => setEarnings(null));

    // Notable events — high-impact US economic calendar only
    getEconomicCalendar(14).then(cal => {
      const highEco = cal.filter(e => e.impact === 'High' && (e.country === 'US' || e.country === 'United States'));
      const items = highEco.slice(0, 4).map(e => {
        const d = new Date(e.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
        return `${e.event} – ${d}`;
      });
      setNotable(items.length ? items : null);
    }).catch(() => setNotable(null));
  }, []);

  return (
    <SafeAreaView style={s.container}>

      {/* ── Header ────────────────────────────────────────────────────── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Dashboard</Text>
          <Text style={s.headerDate}>{today}</Text>
        </View>
        <View style={s.headerRight}>
          <ScalePressable style={s.iconBtn} scaleTo={0.88} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="search-outline" size={20} color={colors.text.secondary} />
          </ScalePressable>
          <ScalePressable style={s.iconBtn} scaleTo={0.88} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Ionicons name="notifications-outline" size={20} color={colors.text.secondary} />
          </ScalePressable>
        </View>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <MarketSnapshotCard fearGreed={fgData} tickers={snapTicks} fetchedAt={snapFetchAt} brief={brief} />
        <EarlySignalsCard congress={cong} reddit={redd} insider={ins} />
        <UpcomingEventsCard earnings={earnings} notable={notable} />
        <View style={{ height: spacing.xl }} />
      </ScrollView>

    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },

  // ── Header ──────────────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingTop: spacing.md, paddingBottom: spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: colors.border.subtle,
  },
  headerTitle: {
    fontSize: fontSize.xl, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  headerDate: {
    fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular,
    color: colors.text.muted, marginTop: 2,
  },
  headerRight: { flexDirection: 'row', gap: spacing.xs },
  iconBtn: {
    width: 40, height: 40, alignItems: 'center', justifyContent: 'center',
    borderRadius: radius.full, backgroundColor: colors.bg.card,
  },

  scroll: { padding: spacing.xl, gap: spacing.lg },

  divider: { height: 0.5, backgroundColor: colors.border.subtle },

  sectionLabel: {
    fontSize: 11, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium,
    color: colors.text.muted, letterSpacing: 1, textTransform: 'uppercase',
  },

  // ── Market Snapshot ─────────────────────────────────────────────────────────
  snapCard: {
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.lg, gap: spacing.md, overflow: 'hidden',
  },
  snapAccent: {
    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
    backgroundColor: colors.accent.violet, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg,
  },
  snapHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 2 },
  snapUpdated: {
    fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular,
    color: colors.text.muted,
  },

  // AI brief
  briefBlock: { gap: 6 },
  briefLoading: { gap: 8, paddingVertical: 4 },
  briefLoadingText: {
    fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular,
    color: colors.text.muted,
  },
  briefLocked: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.accent.violetDim, borderRadius: radius.md,
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
    borderWidth: 0.5, borderColor: colors.accent.violet + '30',
  },
  briefLockedText: {
    flex: 1, fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular,
    color: colors.text.muted,
  },
  briefLockedAccent: { color: colors.accent.violet },
  snapHeadline: {
    fontSize: fontSize.lg, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold,
    color: colors.text.primary, lineHeight: 26,
  },
  snapDesc: {
    fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular,
    color: colors.text.secondary, lineHeight: 20,
  },

  // Status pill
  statusPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    backgroundColor: colors.bg.elevated, paddingHorizontal: spacing.sm, paddingVertical: 4,
    borderRadius: radius.full, borderWidth: 0.5, borderColor: colors.border.default,
  },
  statusDot:   { width: 6, height: 6, borderRadius: 3 },
  statusLabel: {
    fontSize: fontSize.xs, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium,
    color: colors.text.secondary,
  },

  // Index bars
  indexSection: { gap: spacing.sm },
  indexRow:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  indexLabel: {
    fontSize: 11, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium,
    color: colors.text.muted, letterSpacing: 0.8,
  },
  indexScoreRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  indexScore: {
    fontSize: fontSize.lg, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  indexRatingPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.full },
  indexRating: {
    fontSize: fontSize.xs, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold,
  },

  // Ticker strip
  tickerRow: { flexDirection: 'row', gap: spacing.sm },
  tickerCard: {
    flex: 1, alignItems: 'center', gap: 4,
    backgroundColor: colors.bg.elevated,
    padding: spacing.sm, borderRadius: radius.md,
    borderWidth: 0.5, borderColor: colors.border.subtle,
  },
  tickerSymbol: {
    fontSize: 11, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium,
    color: colors.text.muted, letterSpacing: 0.6,
  },
  tickerValue: {
    fontSize: fontSize.md, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold,
    color: colors.text.primary,
  },
  tickerChangePill: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    paddingHorizontal: 5, paddingVertical: 2, borderRadius: radius.full,
  },
  tickerChange: { fontSize: 10, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold },

  // Summary bullets
  summaryList: { gap: 8 },
  summaryRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  summaryAccent: { width: 3, height: 14, borderRadius: radius.full, flexShrink: 0, marginTop: 2 },
  summaryText: {
    flex: 1, fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular,
    color: colors.text.secondary, lineHeight: 19,
  },

  // Upcoming Events
  eventsCard: {
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.lg, gap: spacing.md, overflow: 'hidden',
  },
  eventsSectionHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionAccentBar: { width: 3, height: 13, borderRadius: radius.full },
  eventsSectionLabel: {
    fontSize: 11, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold,
    color: colors.text.secondary, letterSpacing: 0.8, textTransform: 'uppercase', flex: 1,
  },

  notableRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  notableDot: {
    width: 5, height: 5, borderRadius: radius.full,
    backgroundColor: colors.accent.violet, marginTop: 6, flexShrink: 0,
  },
  notableText: {
    flex: 1, fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular,
    color: colors.text.secondary, lineHeight: 19,
  },

  earningsEconomicRow: { flexDirection: 'row', gap: spacing.md },
  earningsCol: { flex: 1, gap: spacing.sm },
  economicCol: { flex: 1, gap: spacing.sm },
  vertDivider: { width: 0.5, backgroundColor: colors.border.subtle },

  earningsDay:      { gap: 4 },
  earningsDayLabel: {
    fontSize: fontSize.xs, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium,
    color: colors.text.secondary,
  },
  earningsLogos: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' },
  beatBadge: {
    backgroundColor: colors.status.green + '20', borderRadius: radius.full,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  beatText: {
    fontSize: 9, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold,
    color: colors.status.green,
  },
  emptyHint: {
    fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular,
    color: colors.text.muted, marginTop: spacing.sm,
  },
});

// ─── Early Signals styles ─────────────────────────────────────────────────────

const es = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.secondary, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.lg, gap: spacing.md, overflow: 'hidden',
  },
  labelRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  labelAccent: { width: 3, height: 13, borderRadius: radius.full },
  label: {
    fontSize: 11, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium,
    color: colors.text.muted, letterSpacing: 1,
  },

  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  cell: {
    flex: 1,
    backgroundColor: colors.bg.card,
    borderRadius: radius.md,
    borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.md, gap: 5, overflow: 'hidden',
  },
  accentBar: { height: 2, borderRadius: radius.full, marginBottom: 4 },
  cellHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cellHeaderText: { flex: 1 },
  cellTitle: {
    fontSize: fontSize.sm, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  cellSub: {
    fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular,
    color: colors.text.muted, marginTop: 1,
  },
  cellTicker: {
    fontSize: fontSize.xxl, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold,
    letterSpacing: -0.5, marginTop: 2,
  },
  cellLine1: {
    fontSize: fontSize.sm, fontFamily: fontFamily.semibold, fontWeight: fontWeight.semibold,
  },
  cellLine2: {
    fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular,
    color: colors.text.muted,
  },
  cellEmptyLabel: {
    fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium,
    color: colors.text.muted, marginTop: 6,
  },
  cellEmptyHint: {
    fontSize: 10, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular,
    color: colors.text.muted + 'aa', marginTop: 2,
  },
});
