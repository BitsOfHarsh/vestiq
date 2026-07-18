import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, Modal, Pressable, Dimensions,
  Linking, GestureResponderEvent,
} from 'react-native';
import ScalePressable from '../../src/components/ui/ScalePressable';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import THEME from '../../src/theme';
import {
  StockOverview, IncomePeriod, EarningsQuarter,
  InsiderTxn, AnalystVerdict,
} from '../../src/mock';
import { getChartBars, OHLCVBar, getQuarterlyFinancials, getAnnualFinancials } from '../../src/services/polygon';
import { getYahooQuote } from '../../src/services/market';
import { getProfile, getEarningsEstimate, getPriceTargets, getInsiderTrades } from '../../src/services/fmp';
import { getAnalystRecs, getTickerNews, getFinnhubEarnings } from '../../src/services/finnhub';
import { getCompanyAbout } from '../../src/services/claude';
import { TickerLogo } from '../../src/components/ui';
import { getCongressTrades } from '../../src/services/congress';
import { getHolders } from '../../src/services/whalewisdom';
import VSkeleton from '../../src/components/ui/Skeleton';

const { colors, fontSize, fontWeight, fontFamily, radius, spacing } = THEME;
// On web the app is constrained to a 390px phone frame (see app/_layout.tsx),
// but Dimensions.get('window') reports the full browser width — clamp to the frame.
const SCREEN_W = Math.min(Dimensions.get('window').width, 390);
// chart width = screen - horizontal padding (xl*2) - y-axis (44) - gap (sm)
const CHART_W = SCREEN_W - spacing.xl * 2 - 44 - spacing.sm;
const CHART_H = 160;

const RANGES = ['5D', '1M', '3M', '6M', '1Y', '5Y'];
type Tab = 'Profile' | 'Earnings' | 'News';
const TABS: Tab[] = ['Profile', 'Earnings', 'News'];

// ─── Price line-area chart (pure View, no SVG dependency) ────────────────────

function PriceChart({ data, up }: { data: number[]; up: boolean }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; value: number } | null>(null);

  if (data.length < 2) return <View style={[cht.priceWrap, { height: CHART_H }]} />;
  const min   = Math.min(...data);
  const max   = Math.max(...data);
  const range = max - min || 1;
  const color = up ? colors.status.green : colors.status.red;

  const pts = data.map((v, i) => ({
    x: (i / (data.length - 1)) * CHART_W,
    y: 4 + (1 - (v - min) / range) * (CHART_H - 8),
  }));

  const ticks = [max, max - range / 3, max - (2 * range) / 3, min].map(v => v.toFixed(1));

  const handleTouch = (e: GestureResponderEvent) => {
    const touchX = e.nativeEvent.locationX;
    const idx    = Math.round((touchX / CHART_W) * (data.length - 1));
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    setTooltip({ x: pts[clamped].x, y: pts[clamped].y, value: data[clamped] });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const idx = Math.round((mouseX / CHART_W) * (data.length - 1));
    const clamped = Math.max(0, Math.min(data.length - 1, idx));
    setTooltip({ x: pts[clamped].x, y: pts[clamped].y, value: data[clamped] });
  };

  const tooltipLeft = tooltip
    ? Math.min(Math.max(tooltip.x - 34, 0), CHART_W - 68)
    : 0;
  const tooltipTop = tooltip
    ? Math.max(tooltip.y - 34, 0)
    : 0;

  return (
    <View style={cht.priceWrap}>
      <View style={cht.pricePlot}>
        {/* Y-axis labels */}
        <View style={cht.yAxis}>
          {ticks.map((t, i) => <Text key={i} style={cht.yLabel}>{t}</Text>)}
        </View>

        {/* Chart canvas */}
        <View
          style={{ width: CHART_W, height: CHART_H }}
          onTouchStart={handleTouch}
          onTouchMove={handleTouch}
          onTouchEnd={() => setTooltip(null)}
          {...({
            onMouseMove: handleMouseMove,
            onMouseLeave: () => setTooltip(null),
          } as object)}
        >
          {/* Area fill */}
          {pts.map((pt, i) => (
            <View
              key={`f${i}`}
              style={{
                position: 'absolute',
                left: pt.x - 1,
                top: pt.y,
                width: i < pts.length - 1 ? pts[i + 1].x - pt.x + 1 : 1,
                height: CHART_H - pt.y,
                backgroundColor: color + '18',
              }}
            />
          ))}

          {/* Line segments */}
          {pts.slice(1).map((pt, i) => {
            const prev = pts[i];
            const dx   = pt.x - prev.x;
            const dy   = pt.y - prev.y;
            const len  = Math.sqrt(dx * dx + dy * dy);
            const deg  = Math.atan2(dy, dx) * (180 / Math.PI);
            return (
              <View
                key={`l${i}`}
                style={{
                  position: 'absolute',
                  left:  prev.x + dx / 2 - len / 2,
                  top:   prev.y + dy / 2 - 1,
                  width: len,
                  height: 2,
                  backgroundColor: color,
                  transform: [{ rotate: `${deg}deg` }],
                }}
              />
            );
          })}

          {/* Tooltip */}
          {tooltip && (
            <>
              {/* Vertical crosshair */}
              <View style={{ position: 'absolute', left: tooltip.x, top: 0, width: 1, height: CHART_H, backgroundColor: color + '50' }} />
              {/* Price dot */}
              <View style={{
                position: 'absolute',
                left: tooltip.x - 5, top: tooltip.y - 5,
                width: 10, height: 10, borderRadius: 5,
                backgroundColor: color,
                borderWidth: 2, borderColor: colors.bg.primary,
              }} />
              {/* Label bubble */}
              <View style={{
                position: 'absolute',
                left: tooltipLeft, top: tooltipTop,
                backgroundColor: color, borderRadius: 6,
                paddingHorizontal: 8, paddingVertical: 4,
              }}>
                <Text style={{ color: '#fff', fontSize: 11, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium }}>
                  ${tooltip.value.toFixed(2)}
                </Text>
              </View>
            </>
          )}
        </View>
      </View>
    </View>
  );
}

// ─── Volume bars ──────────────────────────────────────────────────────────────

function VolumeChart({ data }: { data: { value: number; up: boolean }[] }) {
  const max = Math.max(...data.map(d => d.value)) || 1;
  const ticks = [max, max * 0.5, 0].map(v =>
    v >= 1 ? `${v.toFixed(1)}M` : v > 0 ? `${(v * 1000).toFixed(0)}K` : '0'
  );
  return (
    <View style={cht.volWrap}>
      <Text style={cht.volTitle}>Volume</Text>
      <View style={cht.volPlot}>
        <View style={cht.yAxis}>
          {ticks.map((t, i) => <Text key={i} style={cht.yLabel}>{t}</Text>)}
        </View>
        <View style={cht.bars}>
          {data.map((d, i) => (
            <View key={i} style={[cht.bar, { height: `${Math.max(4, (d.value / max) * 100)}%`, backgroundColor: d.up ? colors.status.green + '99' : colors.status.red + '99' }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

const cht = StyleSheet.create({
  priceWrap: { gap: spacing.sm },
  pricePlot: { flexDirection: 'row', height: CHART_H, gap: spacing.sm, alignItems: 'center' },
  yAxis: { width: 44, height: CHART_H, justifyContent: 'space-between', paddingVertical: 2 },
  yLabel: { fontSize: 10, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },
  volWrap: { gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.06)' },
  volTitle: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.muted, letterSpacing: 0.5 },
  volPlot: { flexDirection: 'row', height: 80, gap: spacing.sm },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 1 },
  bar: { flex: 1, borderRadius: 1 },
});

// ─── Income statement chart ────────────────────────────────────────────────────

function fmtShort(n: number): string {
  if (Math.abs(n) >= 1e12) return `${(n / 1e12).toFixed(1)}T`;
  if (Math.abs(n) >= 1e9)  return `${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6)  return `${(n / 1e6).toFixed(1)}M`;
  return `${(n / 1e3).toFixed(0)}K`;
}

function IncomeChart({ data }: { data: IncomePeriod[] }) {
  const maxRev = Math.max(...data.map(d => d.revenue)) || 1;
  const BAR_H  = 120;
  return (
    <View style={inc.wrap}>
      <View style={inc.legend}>
        <LegendDot color={colors.status.blue} label="Revenue" />
        <LegendDot color="#A855F7" label="Net Income" />
        <LegendDot color={colors.status.amber} label="Net Margin %" />
      </View>
      <View style={inc.plot}>
        {data.map((d) => {
          const revH = Math.max(4, (d.revenue / maxRev) * BAR_H);
          const netH = Math.max(d.netIncome > 0 ? 4 : 0, (Math.max(0, d.netIncome) / maxRev) * BAR_H);
          const marginPct = Math.round(d.margin);
          return (
            <View key={d.period} style={inc.col}>
              {/* Margin % label */}
              <Text style={inc.marginLabel}>{marginPct}%</Text>
              {/* Bars */}
              <View style={[inc.barsRow, { height: BAR_H }]}>
                <View style={[inc.bar, { height: revH, backgroundColor: colors.status.blue + 'CC' }]} />
                <View style={[inc.bar, { height: netH, backgroundColor: '#A855F7CC' }]} />
              </View>
              {/* Period label */}
              <Text style={inc.period}>{d.period}</Text>
              {/* Revenue value */}
              <Text style={inc.revLabel}>{fmtShort(d.revenue)}</Text>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <View style={inc.legendItem}>
      <View style={[inc.legendDot, { backgroundColor: color }]} />
      <Text style={inc.legendText}>{label}</Text>
    </View>
  );
}

const inc = StyleSheet.create({
  wrap: { gap: spacing.md },
  legend: { flexDirection: 'row', gap: spacing.md, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.secondary },
  plot: { flexDirection: 'row', alignItems: 'flex-end', gap: 2 },
  col: { flex: 1, alignItems: 'center', gap: 3 },
  marginLabel: { fontSize: 9, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.status.amber },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 3 },
  bar: { flex: 1, borderTopLeftRadius: 3, borderTopRightRadius: 3 },
  period: { fontSize: 9, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },
  revLabel: { fontSize: 9, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.secondary },
});

// ─── Price target slider ──────────────────────────────────────────────────────

function PriceTargetBar({ low, median, high, current }: { low: number; median: number; high: number; current: number }) {
  const pct = (v: number) => Math.max(0, Math.min(100, ((v - low) / (high - low)) * 100));
  return (
    <View style={pt.wrap}>
      <Text style={pt.current}>Current: <Text style={pt.currentVal}>{current.toFixed(2)}</Text></Text>
      <View style={pt.track}>
        {/* discrete segments low→high (flat, no gradient) */}
        {['#3F3F46', '#15803D', '#16A34A', '#22C55E', '#4ADE80'].map((c, i) => (
          <View key={i} style={[pt.seg, { backgroundColor: c }]} />
        ))}
        <View style={[pt.currentMarker, { left: `${pct(current)}%` }]} />
        <View style={[pt.medianMarker, { left: `${pct(median)}%` }]} />
      </View>
      <View style={pt.labels}>
        <View>
          <Text style={pt.endLabel}>Low</Text>
          <Text style={pt.endVal}>{low.toFixed(2)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={pt.endLabel}>High</Text>
          <Text style={pt.endVal}>{high.toFixed(2)}</Text>
        </View>
      </View>
      <Text style={pt.median}>◆ Median: <Text style={pt.medianVal}>{median.toFixed(2)}</Text></Text>
    </View>
  );
}

const pt = StyleSheet.create({
  wrap: { gap: spacing.sm },
  current: { fontSize: fontSize.md, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.secondary },
  currentVal: { fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  track: { flexDirection: 'row', height: 14, borderRadius: 7, overflow: 'visible', position: 'relative' },
  seg: { flex: 1 },
  currentMarker: {
    position: 'absolute', top: -3, marginLeft: -10, width: 20, height: 20, borderRadius: 10,
    backgroundColor: colors.status.green, borderWidth: 3, borderColor: colors.bg.primary,
  },
  medianMarker: {
    position: 'absolute', top: 1, marginLeft: -6, width: 12, height: 12,
    backgroundColor: '#FFFFFF', transform: [{ rotate: '45deg' }],
  },
  labels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.sm },
  endLabel: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.secondary },
  endVal: { fontSize: fontSize.lg, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  median: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.secondary, textAlign: 'center', marginTop: spacing.xs },
  medianVal: { fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
});

// ─── Analyst rating bar (flat gauge) ──────────────────────────────────────────

const RATING_SEGMENTS = [
  { label: 'Strong Sell', color: '#EF4444' },
  { label: 'Sell', color: '#F97316' },
  { label: 'Hold', color: '#EAB308' },
  { label: 'Buy', color: '#84CC16' },
  { label: 'Strong Buy', color: '#10B981' },
];

const VERDICT_COLOR: Record<AnalystVerdict, string> = {
  'Strong Sell': '#EF4444', 'Sell': '#F97316', 'Hold': '#EAB308', 'Buy': '#22C55E', 'Strong Buy': '#10B981',
};

function AnalystRating({ verdict, score }: { verdict: AnalystVerdict; score: number }) {
  return (
    <View style={ar.wrap}>
      <View style={ar.track}>
        {RATING_SEGMENTS.map((seg, i) => (
          <View key={seg.label} style={[
            ar.seg, { backgroundColor: seg.color },
            i === 0 && { borderTopLeftRadius: 4, borderBottomLeftRadius: 4 },
            i === RATING_SEGMENTS.length - 1 && { borderTopRightRadius: 4, borderBottomRightRadius: 4 },
          ]} />
        ))}
        <View style={[ar.marker, { left: `${Math.max(2, Math.min(98, score))}%` }]} />
      </View>
      <View style={ar.labels}>
        <Text style={ar.endLabel}>Strong Sell</Text>
        <Text style={ar.endLabel}>Strong Buy</Text>
      </View>
      <Text style={[ar.verdict, { color: VERDICT_COLOR[verdict] }]}>{verdict}</Text>
    </View>
  );
}

const ar = StyleSheet.create({
  wrap: { gap: 6 },
  track: { flexDirection: 'row', height: 12, position: 'relative' },
  seg: { flex: 1, marginHorizontal: 1 },
  marker: { position: 'absolute', top: -4, marginLeft: -2, width: 4, height: 20, borderRadius: 2, backgroundColor: '#FFFFFF' },
  labels: { flexDirection: 'row', justifyContent: 'space-between' },
  endLabel: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },
  verdict: { fontSize: fontSize.xl, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, textAlign: 'center', marginTop: spacing.xs },
});

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHead({ icon, title, right }: { icon: keyof typeof Ionicons.glyphMap; title: string; right?: React.ReactNode }) {
  return (
    <View style={d.sectionHead}>
      <View style={d.sectionHeadLeft}>
        <Ionicons name={icon} size={16} color={colors.text.primary} />
        <Text style={d.sectionTitle}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

function ViewMore({ onPress }: { onPress?: () => void }) {
  return (
    <ScalePressable style={d.viewMore} onPress={onPress}>
      <Text style={d.viewMoreText}>View more </Text>
      <Ionicons name="chevron-forward" size={13} color={colors.text.secondary} />
    </ScalePressable>
  );
}

// ─── Profile tab ──────────────────────────────────────────────────────────────

function ProfileTab({ s, onOpenSheet }: { s: StockOverview; onOpenSheet: () => void }) {
  const [incomeMode, setIncomeMode] = useState<'Annual' | 'Quarterly'>('Annual');
  const incomeData = incomeMode === 'Annual' ? s.income : s.incomeQuarterly;
  return (
    <View style={d.tabBody}>
      {/* Key Stats */}
      <SectionHead icon="stats-chart" title="Key Stats" />
      <View style={d.statList}>
        {s.keyStats.map((stat, i) => (
          <View key={stat.label} style={[d.statRow, i < s.keyStats.length - 1 && d.statRowBorder]}>
            <Text style={d.statLabel}>{stat.label}</Text>
            <Text style={d.statValue}>{stat.value}</Text>
          </View>
        ))}
      </View>
      <ViewMore onPress={onOpenSheet} />

      {/* Income statement */}
      <SectionHead icon="document-text-outline" title="Income Statement" />
      <View style={d.toggleRow}>
        {(['Annual', 'Quarterly'] as const).map(m => (
          <ScalePressable key={m} style={[d.toggleBtn, incomeMode === m && d.toggleBtnActive]} onPress={() => setIncomeMode(m)}>
            <Text style={[d.toggleText, incomeMode === m && d.toggleTextActive]}>{m}</Text>
          </ScalePressable>
        ))}
      </View>
      {incomeData.length > 0 && <IncomeChart data={incomeData} />}
      <ViewMore onPress={onOpenSheet} />

      {/* Price target */}
      <SectionHead icon="locate-outline" title="Price Target" />
      <PriceTargetBar {...s.priceTarget} />
      <ViewMore onPress={onOpenSheet} />

      {/* Analyst ratings */}
      <SectionHead icon="people-outline" title="Analyst Ratings" />
      <AnalystRating verdict={s.analystRating.verdict} score={s.analystRating.score} />
      <ViewMore onPress={onOpenSheet} />

      {/* About */}
      <SectionHead icon="business-outline" title="About" />
      <Text style={d.aboutName}>{s.name}</Text>
      {(s.sector || s.industry) && (
        <Text style={d.aboutSector}>
          {[s.sector, s.industry].filter(Boolean).join(' • ')}
        </Text>
      )}
      {s.about === null ? (
        <View style={{ gap: 8, marginTop: 4 }}>
          <VSkeleton width="100%" height={13} borderRadius={4} />
          <VSkeleton width="90%" height={13} borderRadius={4} />
          <VSkeleton width="65%" height={13} borderRadius={4} />
        </View>
      ) : !!s.about && (
        <Text style={d.aboutBody} numberOfLines={4}>{s.about}</Text>
      )}
      <ViewMore onPress={onOpenSheet} />
    </View>
  );
}

// ─── Earnings tab ─────────────────────────────────────────────────────────────

const RESULT_COLOR  = { Beat: colors.status.green, Miss: colors.status.red };
const RESULT_ICON   = { Beat: 'checkmark-circle' as const, Miss: 'close-circle' as const };
const GUIDANCE_COLOR = { Above: colors.status.green, Inline: colors.status.amber, Below: colors.status.red };
const GUIDANCE_ICON  = { Above: 'trending-up' as const, Inline: 'remove' as const, Below: 'trending-down' as const };

function EarningsMetricRow({ label, result, est, actual }: {
  label: string; result: 'Beat' | 'Miss'; est: string; actual: string;
}) {
  const color = RESULT_COLOR[result];
  const beat  = result === 'Beat';
  return (
    <View style={[ec.row, { borderLeftColor: color }]}>
      <View style={ec.rowLeft}>
        <Text style={ec.rowLabel}>{label}</Text>
        <View style={ec.rowValues}>
          <View style={ec.valueBlock}>
            <Text style={ec.valueSmall}>ACTUAL</Text>
            <Text style={[ec.valueBig, { color }]}>{actual}</Text>
          </View>
          <View style={ec.valueDivider} />
          <View style={ec.valueBlock}>
            <Text style={ec.valueSmall}>EST</Text>
            <Text style={ec.valueMid}>{est}</Text>
          </View>
        </View>
      </View>
      <View style={[ec.badge, { backgroundColor: color + '20', borderColor: color + '50' }]}>
        <Ionicons name={RESULT_ICON[result]} size={13} color={color} />
        <Text style={[ec.badgeText, { color }]}>{beat ? 'BEAT' : 'MISS'}</Text>
      </View>
    </View>
  );
}

function GuidanceRow({ guidance }: { guidance: 'Above' | 'Inline' | 'Below' }) {
  const color = GUIDANCE_COLOR[guidance];
  return (
    <View style={[ec.row, { borderLeftColor: color }]}>
      <View style={ec.rowLeft}>
        <Text style={ec.rowLabel}>Guidance</Text>
        <View style={ec.rowValues}>
          <Ionicons name={GUIDANCE_ICON[guidance]} size={18} color={color} />
          <Text style={[ec.guidanceText, { color }]}>{guidance === 'Above' ? 'Raised' : guidance === 'Below' ? 'Lowered' : 'In-line'}</Text>
        </View>
      </View>
      <View style={[ec.badge, { backgroundColor: color + '20', borderColor: color + '50' }]}>
        <Text style={[ec.badgeText, { color }]}>{guidance.toUpperCase()}</Text>
      </View>
    </View>
  );
}

function EarningsBars({ history }: { history: EarningsQuarter[] }) {
  const max = Math.max(...history.map(h => Math.max(h.actualEps, h.estEps))) || 1;
  const BAR_H = 100;
  return (
    <View style={inc.wrap}>
      <View style={inc.legend}>
        <LegendDot color={colors.status.green} label="Actual EPS" />
        <LegendDot color={colors.text.muted} label="Est. EPS" />
      </View>
      <View style={inc.plot}>
        {history.map((h) => {
          const upcoming = h.actualEps === 0;
          const beat = h.actualEps >= h.estEps;
          return (
            <View key={h.period} style={inc.col}>
              <View style={[inc.barsRow, { height: BAR_H }]}>
                <View style={[inc.bar, {
                  height: Math.max(4, (h.estEps / max) * BAR_H),
                  backgroundColor: colors.text.muted + '60',
                }]} />
                {!upcoming && (
                  <View style={[inc.bar, {
                    height: Math.max(4, (h.actualEps / max) * BAR_H),
                    backgroundColor: beat ? colors.status.green + 'CC' : colors.status.red + 'CC',
                  }]} />
                )}
              </View>
              <Text style={inc.period}>{h.period}</Text>
              {!upcoming
                ? <View style={[d.beatPill, { backgroundColor: (beat ? colors.status.green : colors.status.red) + '25' }]}>
                    <Text style={[d.beatPillText, { color: beat ? colors.status.green : colors.status.red }]}>
                      {beat ? '+' : ''}{h.beatPct.toFixed(1)}%
                    </Text>
                  </View>
                : <Text style={d.upcomingLabel}>Soon</Text>}
            </View>
          );
        })}
      </View>
    </View>
  );
}

function EarningsTab({ s }: { s: StockOverview }) {
  const [mode, setMode] = useState<'Past' | 'Upcoming'>('Past');
  return (
    <View style={d.tabBody}>
      <View style={d.toggleRow}>
        {(['Past', 'Upcoming'] as const).map(m => (
          <ScalePressable key={m} style={[d.bigToggle, mode === m && d.bigToggleActive]} onPress={() => setMode(m)}>
            <Ionicons name={m === 'Past' ? 'time-outline' : 'calendar-outline'} size={15} color={mode === m ? colors.accent.violetBright : colors.text.muted} />
            <Text style={[d.bigToggleText, mode === m && d.bigToggleTextActive]}>{m}</Text>
          </ScalePressable>
        ))}
      </View>

      {mode === 'Past' ? (
        <>
          <Text style={d.earnPeriod}>{s.earningsPast.period}</Text>
          <View style={ec.stack}>
            <EarningsMetricRow label="Revenue" result={s.earningsPast.revenue.result} est={s.earningsPast.revenue.est} actual={s.earningsPast.revenue.actual} />
            <EarningsMetricRow label="EPS" result={s.earningsPast.eps.result} est={s.earningsPast.eps.est} actual={s.earningsPast.eps.actual} />
            <GuidanceRow guidance={s.earningsPast.guidance} />
          </View>

          <SectionHead icon="document-text-outline" title="Earnings Summary" />
          <View style={d.summaryBox}>
            {s.earningsPast.summary.map((line, i) => (
              <View key={i} style={d.summaryRow}>
                <Text style={d.bullet}>•</Text>
                <Text style={d.summaryText}>{line}</Text>
              </View>
            ))}
            <ScalePressable style={d.transcriptBtn}>
              <Text style={d.transcriptText}>See full transcript </Text>
              <Ionicons name="chevron-forward" size={13} color={colors.text.secondary} />
            </ScalePressable>
          </View>

          <SectionHead icon="bar-chart-outline" title="EPS History" />
          <EarningsBars history={s.earningsHistory} />
        </>
      ) : (
        <>
          <View style={d.nextEarnRow}>
            <View style={d.nextEarnLeft}>
              <Ionicons name="calendar-outline" size={15} color={colors.text.muted} />
              <Text style={d.nextEarnLabel}>Next Earnings</Text>
            </View>
            <Text style={d.nextEarnDate}>{s.earningsUpcoming.date}</Text>
          </View>
          <View style={ec.upcomingGrid}>
            <View style={ec.upcomingCell}>
              <Text style={ec.upcomingCellLabel}>EPS estimate</Text>
              <Text style={ec.upcomingCellVal}>${s.earningsUpcoming.epsEstimate}</Text>
            </View>
            <View style={ec.upcomingCell}>
              <Text style={ec.upcomingCellLabel}>Revenue estimate</Text>
              <Text style={ec.upcomingCellVal}>{s.earningsUpcoming.revenueEstimate}</Text>
            </View>
          </View>
          <SectionHead icon="eye-outline" title="What to Look Out For" />
          <View style={d.summaryBox}>
            {s.earningsUpcoming.lookout.map((line, i) => (
              <View key={i} style={d.summaryRow}>
                <Text style={d.bullet}>•</Text>
                <Text style={d.summaryText}>{line}</Text>
              </View>
            ))}
          </View>
        </>
      )}
    </View>
  );
}

const ec = StyleSheet.create({
  stack: { gap: spacing.sm },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default,
    borderLeftWidth: 3, padding: spacing.md,
  },
  rowLeft:   { flex: 1, gap: 6 },
  rowLabel:  { fontSize: fontSize.xs, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.muted, letterSpacing: 0.6 },
  rowValues: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  valueBlock: { gap: 2 },
  valueSmall: { fontSize: 9, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.muted, letterSpacing: 0.5 },
  valueBig:   { fontSize: fontSize.xl, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold },
  valueMid:   { fontSize: fontSize.xl, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.secondary },
  valueDivider: { width: 0.5, height: 28, backgroundColor: colors.border.default },
  guidanceText: { fontSize: fontSize.xl, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    borderWidth: 1, borderRadius: radius.full,
    paddingHorizontal: spacing.sm, paddingVertical: 5, flexShrink: 0,
  },
  badgeText: { fontSize: fontSize.xs, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, letterSpacing: 0.4 },
  upcomingGrid: { flexDirection: 'row', gap: spacing.sm },
  upcomingCell: {
    flex: 1, backgroundColor: colors.bg.card, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.md, gap: 6,
  },
  upcomingCellLabel: { fontSize: 9, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.muted, letterSpacing: 0.8 },
  upcomingCellVal:   { fontSize: fontSize.xxl, fontFamily: fontFamily.bold, fontWeight: fontWeight.bold, color: colors.text.primary },
});

// ─── Smart Money tab ──────────────────────────────────────────────────────────

function SplitBar({ buyPct }: { buyPct: number }) {
  return (
    <View style={d.splitTrack}>
      <View style={[d.splitFill, { width: `${buyPct}%`, backgroundColor: colors.status.green }]} />
      <View style={[d.splitFill, { width: `${100 - buyPct}%`, backgroundColor: colors.status.red }]} />
    </View>
  );
}

function SmartMoneyTab({ s, onOpenInsiders }: { s: StockOverview; onOpenInsiders: () => void }) {
  const sm = s.smartMoney;
  return (
    <View style={d.tabBody}>
      {/* Insider trades */}
      <SectionHead
        icon="people-outline" title="Insider Trades"
        right={<ScalePressable style={d.seeTradesBtn} onPress={onOpenInsiders}><Text style={d.seeTradesText}>See Trades</Text></ScalePressable>}
      />
      <SplitBar buyPct={sm.insiderBuyPct} />
      <View style={d.splitLabels}>
        <Text style={[d.splitLabel, { color: colors.status.green }]}>Buy {sm.insiderBuyPct}%</Text>
        <Text style={[d.splitLabel, { color: colors.status.red }]}>Sell {100 - sm.insiderBuyPct}%</Text>
      </View>
      <Text style={d.splitCaption}>Based on shares transacted in the past year</Text>

      <View style={d.smDivider} />

      {/* Congress trades */}
      <SectionHead
        icon="business-outline" title="Congress Trades"
        right={<ScalePressable style={d.seeTradesBtn} onPress={() => router.push('/congress')}><Text style={d.seeTradesText}>See Trades</Text></ScalePressable>}
      />
      <View style={d.congressGrid}>
        <Text style={d.congressColLabel}>Purchases</Text>
        <Text style={[d.congressColLabel, { textAlign: 'right' }]}>No. of trades</Text>
      </View>
      <View style={d.congressRow}>
        <Text style={d.congressValue}>{sm.congress.purchases}</Text>
        <Text style={[d.congressCount, { color: colors.status.green }]}>{sm.congress.purchaseTrades}</Text>
      </View>
      <Text style={d.congressColLabel}>Sales</Text>
      <View style={d.congressRow}>
        <Text style={d.congressValue}>{sm.congress.sales}</Text>
        <Text style={[d.congressCount, { color: colors.status.red }]}>{sm.congress.saleTrades}</Text>
      </View>
      <Text style={d.splitCaption}>Based on trades in the past year</Text>

      <View style={d.smDivider} />

      {/* Super investors */}
      <SectionHead
        icon="cash-outline" title="Super Investors"
        right={<Text style={d.quarterText}>Q1 2026</Text>}
      />
      <View style={d.holdersHeaderRow}>
        <Text style={d.holdersSubtitle}>Top Holders by Portfolio Weight</Text>
        <ScalePressable style={d.showMoreChip} onPress={() => router.push('/super-investors')}>
          <Text style={d.showMoreText}>Show More</Text>
        </ScalePressable>
      </View>
      {sm.superInvestors.map((h) => (
        <View key={h.name} style={d.holderCard}>
          <Text style={d.holderName}>{h.name}</Text>
          <View style={d.holderBarRow}>
            <View style={d.holderTrack}>
              <View style={[d.holderFill, { width: `${Math.min(100, h.weightPct * 2.5)}%` }]} />
            </View>
            <Text style={d.holderPct}>{h.weightPct.toFixed(2)}% of portfo...</Text>
          </View>
        </View>
      ))}
    </View>
  );
}

// ─── News tab ─────────────────────────────────────────────────────────────────

function NewsTab({ s }: { s: StockOverview }) {
  return (
    <View style={d.tabBody}>
      {s.news.map((n, i) => (
        <View key={i}>
          <ScalePressable
            style={d.newsRow}
            onPress={() => n.url && Linking.openURL(n.url).catch(() => {})}
          >
            <View style={d.newsInner}>
              <Text style={d.newsTitle}>{n.title}</Text>
              <View style={d.newsMeta}>
                <Text style={d.newsSource}>{n.source}</Text>
                <Text style={d.newsTime}>{n.time}</Text>
              </View>
            </View>
            {n.url && <Ionicons name="open-outline" size={14} color={colors.text.muted} style={{ flexShrink: 0, marginTop: 3 }} />}
          </ScalePressable>
          {i < s.news.length - 1 && <View style={d.newsDivider} />}
        </View>
      ))}
    </View>
  );
}

// ─── Profile detail sheet ─────────────────────────────────────────────────────

const SHEET_TABS = ['Key Stats', 'Financials', 'Price Target', 'Ratings'];

function ProfileSheet({ s, visible, onClose }: { s: StockOverview; visible: boolean; onClose: () => void }) {
  const [tab, setTab] = useState('Key Stats');
  const ps = s.profileSheet;
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={d.sheetOverlay} onPress={onClose}>
        <Pressable style={d.sheet} onPress={() => {}}>
          <View style={d.sheetHeader}>
            <Text style={d.sheetTitle}>{s.ticker} Profile</Text>
            <ScalePressable onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
              <View style={d.sheetClose}><Ionicons name="close" size={18} color={colors.text.primary} /></View>
            </ScalePressable>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={d.sheetTabRow}>
            {SHEET_TABS.map(t => (
              <ScalePressable key={t} style={[d.sheetTab, tab === t && d.sheetTabActive]} onPress={() => setTab(t)}>
                <Text style={[d.sheetTabText, tab === t && d.sheetTabTextActive]}>{t}</Text>
              </ScalePressable>
            ))}
          </ScrollView>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={d.sheetScroll}>
            {tab === 'Price Target' ? (
              <PriceTargetBar {...s.priceTarget} />
            ) : tab === 'Ratings' ? (
              <AnalystRating verdict={s.analystRating.verdict} score={s.analystRating.score} />
            ) : (
              <>
                <SheetGroup icon="business-outline" title="Market Value" caption="USD | Core market valuation and enterprise value metrics">
                  <SheetPair a={['Market Capitalization', ps.marketCap]} b={['Enterprise Value (EV)', ps.enterpriseValue]} />
                </SheetGroup>
                <SheetGroup icon="stats-chart" title="Trading Multiple Analysis" caption="Key price-based valuation ratios for comparative analysis">
                  <SheetPair a={['Price-to-Earnings (P/E)', ps.pe]} b={['Price-to-Book (P/B)', ps.pb]} />
                  <SheetPair a={['Price-to-Sales (P/S)', ps.ps]} b={['EV/EBITDA', ps.evEbitda]} />
                </SheetGroup>
                <SheetGroup icon="pulse-outline" title="Per Share Performance" caption="USD | Key financial metrics on a per share basis">
                  <SheetPair a={['Revenue per Share', ps.revenuePerShare]} b={['Earnings per Share (EPS)', ps.eps]} />
                  <SheetPair a={['Book Value per Share (BVPS)', ps.bvps]} b={['Dividend per Share (DPS)', ps.dps]} />
                </SheetGroup>
              </>
            )}
            <View style={{ height: spacing.xxxl }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function SheetGroup({ icon, title, caption, children }: { icon: keyof typeof Ionicons.glyphMap; title: string; caption: string; children: React.ReactNode }) {
  return (
    <View style={d.sheetGroup}>
      <View style={d.sheetGroupHead}>
        <Ionicons name={icon} size={16} color={colors.text.primary} />
        <Text style={d.sheetGroupTitle}>{title}</Text>
      </View>
      <Text style={d.sheetGroupCaption}>{caption}</Text>
      {children}
    </View>
  );
}

function SheetPair({ a, b }: { a: [string, string]; b: [string, string] }) {
  return (
    <View style={d.sheetPairRow}>
      <View style={d.sheetPairCell}>
        <Text style={d.sheetPairLabel}>{a[0]}</Text>
        <Text style={d.sheetPairValue}>{a[1]}</Text>
      </View>
      <View style={d.sheetPairCell}>
        <Text style={d.sheetPairLabel}>{b[0]}</Text>
        <Text style={d.sheetPairValue}>{b[1]}</Text>
      </View>
    </View>
  );
}

// ─── Insider trades sheet ─────────────────────────────────────────────────────

function InsiderSheet({ txns, visible, onClose }: { txns: InsiderTxn[]; visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={d.sheetOverlay} onPress={onClose}>
        <Pressable style={d.sheet} onPress={() => {}}>
          <View style={d.sheetHeader}>
            <Text style={d.sheetTitle}>Insider Trades</Text>
            <ScalePressable onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
              <View style={d.sheetClose}><Ionicons name="close" size={18} color={colors.text.primary} /></View>
            </ScalePressable>
          </View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={d.sheetScroll}>
            {txns.map((tx, i) => {
              const color = tx.type === 'Buy' ? colors.status.green : colors.status.red;
              return (
                <View key={i} style={d.insiderTxn}>
                  <View style={d.insiderTopRow}>
                    <View>
                      <Text style={d.insiderName}>{tx.name}</Text>
                      <Text style={d.insiderTitle}>{tx.title} · {tx.trades} trade{tx.trades > 1 ? 's' : ''}</Text>
                    </View>
                    <Text style={d.insiderDate}>{tx.date}</Text>
                  </View>
                  <Text style={[d.insiderType, { color }]}>{tx.type}</Text>
                  <View style={d.insiderMetaRow}>
                    {tx.average && <Text style={d.insiderMeta}><Text style={d.insiderMetaVal}>{tx.average}</Text> · Average</Text>}
                    <Text style={[d.insiderMeta, { textAlign: 'right', flex: 1 }]}>Value · <Text style={d.insiderMetaVal}>{tx.value}</Text></Text>
                  </View>
                  <View style={d.insiderLinks}>
                    <ScalePressable style={d.insiderLink}><Text style={d.insiderLinkText}>View Filing </Text><Ionicons name="open-outline" size={12} color={colors.text.secondary} /></ScalePressable>
                    {tx.trades > 1 && <ScalePressable style={d.insiderLink}><Text style={d.insiderLinkText}>View Transactions </Text><Ionicons name="chevron-down" size={12} color={colors.text.secondary} /></ScalePressable>}
                  </View>
                  {i < txns.length - 1 && <View style={d.newsDivider} />}
                </View>
              );
            })}
            <View style={{ height: spacing.xxxl }} />
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtCap(n: number): string {
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9)  return `$${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6)  return `$${(n / 1e6).toFixed(2)}M`;
  return `$${n.toFixed(0)}`;
}
function fmtVol(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return String(n);
}
function fmtM(n: number): string {
  if (Math.abs(n) >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(1)}M`;
  return `$${(n / 1e3).toFixed(0)}K`;
}
async function tryGet<T>(fn: () => Promise<T>): Promise<T | null> {
  try { return await fn(); } catch { return null; }
}
function analystVerdict(recs: Awaited<ReturnType<typeof getAnalystRecs>>): { verdict: AnalystVerdict; score: number } {
  if (!recs.length) return { verdict: 'Hold', score: 50 };
  const r = recs[0];
  const total = r.strongBuy + r.buy + r.hold + r.sell + r.strongSell;
  if (!total) return { verdict: 'Hold', score: 50 };
  const weighted = r.strongBuy * 2 + r.buy * 1 + r.hold * 0 + r.sell * -1 + r.strongSell * -2;
  const pct = ((weighted / (total * 2)) + 0.5) * 100;
  const verdict: AnalystVerdict = pct >= 80 ? 'Strong Buy' : pct >= 60 ? 'Buy' : pct >= 40 ? 'Hold' : pct >= 20 ? 'Sell' : 'Strong Sell';
  return { verdict, score: Math.round(pct) };
}

export default function StockScreen() {
  const params = useLocalSearchParams<{ ticker: string; name?: string; price?: string; sector?: string }>();
  const [tab, setTab] = useState<Tab>('Profile');
  const [range, setRange] = useState('5D');
  const [starred, setStarred] = useState(false);
  const [profileSheet, setProfileSheet] = useState(false);

  const ticker = params.ticker ?? 'NVDA';
  const [s, setS] = useState<StockOverview>(() => ({
    ticker,
    name:     params.name    || ticker,
    sector:   params.sector  || '',
    industry: '',
    price: {
      atClose: params.price ? Number(params.price) : 0,
      closeChange: 0, closeChangePct: 0, closeDate: '',
      postMarket: 0, postChange: 0, postChangePct: 0, hasPostData: false,
    },
    chart: [], volume: [],
    keyStats: [],
    income: [], incomeQuarterly: [],
    priceTarget: { low: 0, median: 0, high: 0, current: 0 },
    analystRating: { verdict: 'Hold' as AnalystVerdict, score: 50 },
    about: null,
    profileSheet: {
      marketCap: '—', enterpriseValue: '—',
      pe: '—', pb: '—', ps: '—', evEbitda: '—',
      revenuePerShare: '—', eps: '—', bvps: '—', dps: '—',
    },
    earningsPast: {
      period: '—',
      revenue: { result: 'Beat', est: '—', actual: '—' },
      eps: { result: 'Beat', est: '—', actual: '—' },
      guidance: 'Inline',
      summary: [],
    },
    earningsHistory: [],
    earningsUpcoming: { date: '—', epsEstimate: '—', revenueEstimate: '—', lookout: [] },
    smartMoney: { insiderBuyPct: 0, congress: { purchases: '—', purchaseTrades: 0, sales: '—', saleTrades: 0 }, superInvestors: [] },
    insiderTransactions: [],
    news: [],
  }));

  const updateS = (patch: Partial<StockOverview>) => setS(prev => ({ ...prev, ...patch }));

  // Fetch chart when range changes — clear first so stale data never shows for a different range
  useEffect(() => {
    updateS({ chart: [], volume: [] });
    tryGet(() => getChartBars(ticker, range as import('../../src/services/polygon').ChartRange)).then((bars: OHLCVBar[] | null) => {
      if (!bars?.length) return;
      updateS({
        chart:  bars.map(b => b.c),
        volume: bars.map(b => ({ value: b.v / 1_000_000, up: b.c >= b.o })),
      });
    });
  }, [ticker, range]);

  // Fetch all fundamental data on mount
  useEffect(() => {
    // Price — Yahoo Finance (free, real-time, no key needed)
    tryGet(() => getYahooQuote(ticker)).then(q => {
      if (!q || q.price <= 0) return;
      const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      updateS({
        price: {
          atClose:       q.price,
          closeChange:   q.change,
          closeChangePct: q.changePct,
          closeDate:     dateStr,
          postMarket:    q.postPrice    ?? q.price,
          postChange:    q.postChange   ?? 0,
          postChangePct: q.postChangePct ?? 0,
          hasPostData:   q.postPrice !== null && q.postPrice !== q.price,
        },
      });
    });

    // Company profile → name, description, key stats
    // Run profile + Claude about in parallel; Claude is the fallback when FMP has no description
    (async () => {
      const profile = await tryGet(() => getProfile(ticker));
      const resolvedName   = profile?.name   || s.name;
      const resolvedSector = profile?.sector || s.sector;
      const fmpAbout = profile?.description?.trim() || '';
      const about = fmpAbout || await getCompanyAbout(ticker, resolvedName, resolvedSector);

      updateS({
        name:     resolvedName,
        sector:   resolvedSector,
        industry: profile?.industry || s.industry,
        about,
        ...(profile ? {
          profileSheet: { ...s.profileSheet, marketCap: fmtCap(profile.marketCap) },
          keyStats: [
            { label: 'Market Cap', value: fmtCap(profile.marketCap) },
            { label: 'Beta',       value: profile.beta.toFixed(2) },
            { label: 'Avg Volume', value: fmtVol(profile.volAvg) },
            { label: 'IPO Date',   value: profile.ipoDate ?? '—' },
            { label: 'Employees',  value: profile.employees ? profile.employees.toLocaleString() : '—' },
            { label: 'Exchange',   value: profile.exchange },
            { label: 'Country',    value: profile.country },
            { label: 'CEO',        value: profile.ceo },
          ],
        } : {}),
      });
    })();

    // Income statement via Polygon (free tier)
    tryGet(() => getAnnualFinancials(ticker, 6)).then(income => {
      if (!income?.length) return;
      updateS({ income: income.map(p => ({ period: p.period, revenue: p.revenue, netIncome: p.netIncome, margin: p.netMargin })) });
    });
    tryGet(() => getQuarterlyFinancials(ticker, 8)).then(income => {
      if (!income?.length) return;
      updateS({ incomeQuarterly: income.map(p => ({ period: p.period, revenue: p.revenue, netIncome: p.netIncome, margin: p.netMargin })) });
    });

    // Earnings history via Finnhub (free tier) + most-recent quarter summary
    tryGet(() => getFinnhubEarnings(ticker, 8)).then(hist => {
      if (!hist?.length) return;
      const latest = hist[0];
      const epsResult: 'Beat' | 'Miss' = latest.beatEps ? 'Beat' : 'Miss';
      updateS({
        earningsHistory: hist.map(q => ({
          period:    q.period,
          actualEps: q.epsActual,
          estEps:    q.epsEstimate,
          beatPct:   q.epsEstimate !== 0 ? ((q.epsActual - q.epsEstimate) / Math.abs(q.epsEstimate)) * 100 : 0,
          actualRev: 0,
          estRev:    0,
        })),
        earningsPast: {
          period:   latest.period,
          eps:      { result: epsResult, est: `$${latest.epsEstimate.toFixed(2)}`, actual: `$${latest.epsActual.toFixed(2)}` },
          revenue:  { result: epsResult, est: '—', actual: '—' },
          guidance: 'Inline',
          summary:  [],
        },
      });
    });

    // Earnings estimate (upcoming)
    tryGet(() => getEarningsEstimate(ticker)).then(est => {
      if (!est) return;
      updateS({
        earningsUpcoming: {
          date:            est.date,
          epsEstimate:     est.epsAvg.toFixed(2),
          revenueEstimate: fmtM(est.revenueAvg),
          lookout:         [`EPS range $${est.epsLow.toFixed(2)} – $${est.epsHigh.toFixed(2)}`],
        },
      });
    });

    // Price targets
    tryGet(() => getPriceTargets(ticker, 20)).then(targets => {
      if (!targets?.length) return;
      const prices = targets.map(t => t.target).filter(Boolean).sort((a, b) => a - b);
      if (!prices.length) return;
      const mid = Math.floor(prices.length / 2);
      setS(prev => ({
        ...prev,
        priceTarget: {
          low:    prices[0],
          median: prices.length % 2 ? prices[mid] : (prices[mid - 1] + prices[mid]) / 2,
          high:   prices[prices.length - 1],
          current: prev.price.atClose,
        },
      }));
    });

    // Analyst recommendations
    tryGet(() => getAnalystRecs(ticker)).then(recs => {
      if (!recs?.length) return;
      updateS({ analystRating: analystVerdict(recs) });
    });

    // Insider trades
    tryGet(() => getInsiderTrades(ticker, 20)).then(insiders => {
      if (!insiders?.length) return;
      const buys  = insiders.filter(t => t.type === 'Buy').length;
      const total = insiders.length;
      const buyPct = total > 0 ? Math.round((buys / total) * 100) : null;
      const txns: InsiderTxn[] = insiders.map(t => ({
        name:    t.name,
        title:   t.title,
        trades:  t.shares,
        type:    t.type,
        date:    t.date,
        average: `$${t.price.toFixed(2)}`,
        value:   fmtM(t.value),
      }));
      setS(prev => ({
        ...prev,
        insiderTransactions: txns,
        smartMoney: {
          ...prev.smartMoney,
          insiderBuyPct: buyPct ?? prev.smartMoney.insiderBuyPct,
        },
      }));
    });

    // Congressional trades for this ticker
    tryGet(() => getCongressTrades(ticker, 20)).then(trades => {
      if (!trades?.length) return;
      const purchases = trades.filter(t => t.type === 'Purchase');
      const sales     = trades.filter(t => t.type === 'Sale');
      const totPurch  = purchases.reduce((acc, t) => acc + t.amountHigh, 0);
      const totSales  = sales.reduce((acc, t) => acc + t.amountHigh, 0);
      setS(prev => ({
        ...prev,
        smartMoney: {
          ...prev.smartMoney,
          congress: {
            purchases:      fmtM(totPurch),
            purchaseTrades: purchases.length,
            sales:          fmtM(totSales),
            saleTrades:     sales.length,
          },
        },
      }));
    });

    // Institutional holders (super investors)
    tryGet(() => getHolders(ticker, 10)).then(holders => {
      if (!holders?.length) return;
      setS(prev => ({
        ...prev,
        smartMoney: {
          ...prev.smartMoney,
          superInvestors: holders.slice(0, 5).map(h => ({
            name:      h.filerName,
            weightPct: h.pctPortfolio,
          })),
        },
      }));
    });

    // News
    tryGet(() => getTickerNews(ticker, 7)).then(articles => {
      if (!articles?.length) return;
      updateS({
        news: articles.slice(0, 10).map(a => ({
          title:  a.headline,
          source: a.source,
          time:   new Date(a.datetime * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          url:    a.url,
        })),
      });
    });
  }, [ticker]);

  const closeUp = s.price.closeChange >= 0;
  const postUp = s.price.postChange >= 0;

  return (
    <SafeAreaView style={d.container} edges={['top']}>
      {/* Header */}
      <View style={d.header}>
        <ScalePressable onPress={() => router.back()} style={d.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
        </ScalePressable>
        <ScalePressable onPress={() => setStarred(v => !v)} style={d.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
          <Ionicons name={starred ? 'star' : 'star-outline'} size={22} color={starred ? colors.status.amber : colors.text.secondary} />
        </ScalePressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={d.scroll} stickyHeaderIndices={[3]}>
        {/* Stock identity */}
        <View style={d.identityRow}>
          <TickerLogo ticker={s.ticker} size={52} borderRadius={10} />
          <View>
            <Text style={d.companyName}>{s.name}</Text>
            <Text style={d.companyTicker}>{s.ticker}</Text>
          </View>
        </View>

        {/* Price */}
        <View style={d.priceRow}>
          <View style={d.priceCol}>
            <Text style={d.priceColLabel}>At close: {s.price.closeDate}</Text>
            <Text style={d.priceBig}>{s.price.atClose.toFixed(2)} <Text style={d.priceUnit}>USD</Text></Text>
            <View style={d.priceChangeRow}>
              <Ionicons name={closeUp ? 'arrow-up' : 'arrow-down'} size={13} color={closeUp ? colors.status.green : colors.status.red} />
              <Text style={[d.priceChange, { color: closeUp ? colors.status.green : colors.status.red }]}>
                {closeUp ? '+' : ''}{s.price.closeChange.toFixed(2)} ({closeUp ? '+' : ''}{s.price.closeChangePct.toFixed(2)}%)
              </Text>
            </View>
          </View>
          {s.price.hasPostData && (
            <View style={d.priceCol}>
              <Text style={d.priceColLabel}>After Hours</Text>
              <Text style={d.priceBig}>{s.price.postMarket.toFixed(2)} <Text style={d.priceUnit}>USD</Text></Text>
              <View style={d.priceChangeRow}>
                <Ionicons name={postUp ? 'arrow-up' : 'arrow-down'} size={13} color={postUp ? colors.status.green : colors.status.red} />
                <Text style={[d.priceChange, { color: postUp ? colors.status.green : colors.status.red }]}>
                  {postUp ? '+' : ''}{s.price.postChange.toFixed(2)} ({postUp ? '+' : ''}{s.price.postChangePct.toFixed(2)}%)
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Charts + range + CTA (this whole block is index 3 — but we keep it inline) */}
        <View style={d.chartsBlock}>
          <PriceChart data={s.chart} up={closeUp} />
          <VolumeChart data={s.volume} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={d.rangeRow}>
            {RANGES.map(r => (
              <ScalePressable key={r} style={[d.rangeChip, range === r && d.rangeChipActive]} onPress={() => setRange(r)}>
                <Text style={[d.rangeText, range === r && d.rangeTextActive]}>{r}</Text>
              </ScalePressable>
            ))}
          </ScrollView>
        </View>

        {/* Sticky tab bar (index 3) */}
        <View style={d.tabBar}>
          <View style={d.tabBarContent}>
            {TABS.map(t => (
              <ScalePressable key={t} style={d.tabBtn} onPress={() => setTab(t)}>
                <Text style={[d.tabText, tab === t && d.tabTextActive]}>{t}</Text>
              </ScalePressable>
            ))}
          </View>
          {/* Indicator bar — rendered outside the pressables, no absolute positioning needed */}
          <View style={d.tabIndicatorRow}>
            {TABS.map(t => (
              <View key={t} style={d.tabIndicatorCell}>
                {tab === t && <View style={d.tabIndicator} />}
              </View>
            ))}
          </View>
        </View>

        {/* Tab content */}
        {tab === 'Profile'  && <ProfileTab s={s} onOpenSheet={() => setProfileSheet(true)} />}
        {tab === 'Earnings' && <EarningsTab s={s} />}
        {tab === 'News'     && <NewsTab s={s} />}

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>

      <ProfileSheet s={s} visible={profileSheet} onClose={() => setProfileSheet(false)} />
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const d = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },

  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
  },
  headerBtn: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.md, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary, letterSpacing: 1 },

  scroll: { paddingBottom: spacing.xl },

  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  companyName: { fontSize: fontSize.xl, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  companyTicker: { fontSize: fontSize.md, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },

  priceRow: { flexDirection: 'row', paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.xl },
  priceCol: { flex: 1, gap: 3 },
  priceColLabel: { fontSize: fontSize.md, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.secondary },
  priceBig: { fontSize: fontSize.xxl, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  priceUnit: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },
  priceChangeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  priceChange: { fontSize: fontSize.md, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium },
  priceSince: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },

  chartsBlock: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, gap: spacing.lg },
  rangeRow: { gap: spacing.xs, paddingVertical: 2 },
  rangeChip: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.full, minHeight: 34, alignItems: 'center', justifyContent: 'center' },
  rangeChipActive: { backgroundColor: colors.accent.violet + '25' },
  rangeText: { fontSize: fontSize.md, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.muted },
  rangeTextActive: { color: colors.accent.violetBright },

  // Tab bar
  tabBar: {
    backgroundColor: colors.bg.primary, marginTop: spacing.lg,
    borderBottomWidth: 0.5, borderBottomColor: colors.border.default,
  },
  tabBarContent: { flexDirection: 'row', paddingHorizontal: spacing.xl },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  tabText: { fontSize: fontSize.md, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },
  tabTextActive: { color: colors.text.primary, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium },
  tabIndicatorRow: { flexDirection: 'row', paddingHorizontal: spacing.xl },
  tabIndicatorCell: { flex: 1, alignItems: 'center' },
  tabIndicator: { height: 2, width: '40%', backgroundColor: colors.accent.violet, borderRadius: 1 },

  tabBody: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.md },

  // Section head
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  sectionHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.xl, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  viewMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm },
  viewMoreText: { fontSize: fontSize.md, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.secondary },

  // Key stats
  statList: { gap: 0 },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md },
  statRowBorder: { borderBottomWidth: 0.5, borderBottomColor: colors.border.default },
  statLabel: { fontSize: fontSize.lg, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.secondary },
  statValue: { fontSize: fontSize.lg, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },

  // Toggle row (Annual/Quarterly)
  toggleRow: { flexDirection: 'row', gap: spacing.sm },
  toggleBtn: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.md, backgroundColor: colors.bg.card, borderWidth: 0.5, borderColor: colors.border.default, minHeight: 34 },
  toggleBtnActive: { backgroundColor: colors.bg.elevated, borderColor: colors.border.strong },
  toggleText: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.muted },
  toggleTextActive: { color: colors.text.primary },

  // About
  aboutName: { fontSize: fontSize.md, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  aboutSector: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },
  aboutBody: { fontSize: fontSize.md, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.secondary, lineHeight: 22 },

  // Earnings
  bigToggle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 0.5, borderColor: colors.border.default, paddingVertical: spacing.md, minHeight: 48 },
  bigToggleActive: { backgroundColor: colors.accent.violetDim, borderColor: colors.accent.violet },
  bigToggleText: { fontSize: fontSize.md, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.muted },
  bigToggleTextActive: { color: colors.accent.violetBright },
  earnPeriod: { fontSize: fontSize.lg, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary, marginTop: spacing.sm },
  earnCardRow: { flexDirection: 'row', gap: spacing.sm },
  earnCard: { flex: 1, backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 0.5, padding: spacing.md, alignItems: 'center', gap: spacing.xs, minHeight: 150, justifyContent: 'center' },
  earnIconRing: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  earnLabel: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.secondary },
  earnResult: { fontSize: fontSize.lg, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium },
  earnEst: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },
  seeReason: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  seeReasonText: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },
  earnLegend: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
  beatPill: { backgroundColor: colors.status.green + '25', borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  beatPillText: { fontSize: 9, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.status.green },
  upcomingLabel: { fontSize: 9, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted, fontStyle: 'italic' },

  summaryBox: { backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 0.5, borderColor: colors.border.default, padding: spacing.md, gap: spacing.md },
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  bullet: { fontSize: fontSize.md, color: colors.text.muted, lineHeight: 22 },
  summaryText: { flex: 1, fontSize: fontSize.md, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.primary, lineHeight: 22 },
  transcriptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  transcriptText: { fontSize: fontSize.md, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.secondary },

  nextEarnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 0.5, borderColor: colors.border.default, padding: spacing.md, minHeight: 48, marginTop: spacing.sm },
  nextEarnLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nextEarnLabel: { fontSize: fontSize.md, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.secondary },
  nextEarnDate: { fontSize: fontSize.lg, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  estRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 0.5, borderBottomColor: colors.border.default },
  estLabel: { fontSize: fontSize.lg, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.secondary },
  estValue: { fontSize: fontSize.lg, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },

  // Smart money
  seeTradesBtn: { backgroundColor: colors.bg.card, borderRadius: radius.full, borderWidth: 0.5, borderColor: colors.border.default, paddingHorizontal: spacing.md, paddingVertical: 7, minHeight: 34, justifyContent: 'center' },
  seeTradesText: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  splitTrack: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden' },
  splitFill: { height: 10 },
  splitLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  splitLabel: { fontSize: fontSize.lg, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium },
  splitCaption: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted, textAlign: 'center' },
  smDivider: { height: 0.5, backgroundColor: colors.border.default, marginVertical: spacing.sm },
  congressGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  congressColLabel: { fontSize: fontSize.md, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted, flex: 1 },
  congressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  congressValue: { fontSize: fontSize.xl, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  congressCount: { fontSize: fontSize.xl, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium },
  quarterText: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },
  holdersHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  holdersSubtitle: { fontSize: fontSize.md, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.secondary },
  showMoreChip: { backgroundColor: colors.bg.card, borderRadius: radius.full, borderWidth: 0.5, borderColor: colors.border.default, paddingHorizontal: spacing.md, paddingVertical: 6 },
  showMoreText: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  holderCard: { backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 0.5, borderColor: colors.border.default, padding: spacing.md, gap: spacing.sm },
  holderName: { fontSize: fontSize.lg, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  holderBarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  holderTrack: { flex: 1, height: 6, backgroundColor: colors.bg.secondary, borderRadius: 3 },
  holderFill: { height: 6, borderRadius: 3, backgroundColor: colors.status.blue },
  holderPct: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },

  // News
  newsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  newsInner: { flex: 1, gap: spacing.xs },
  newsTitle: { fontSize: fontSize.md, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary, lineHeight: 21 },
  newsMeta: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  newsSource: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.accent.violet },
  newsTime: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },
  newsDivider: { height: 0.5, backgroundColor: colors.border.default, marginVertical: spacing.md },

  // Sheets
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderTopWidth: 0.5, borderColor: colors.border.default, paddingTop: spacing.xl, maxHeight: '88%' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  sheetTitle: { fontSize: fontSize.xxl, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  sheetClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bg.secondary, alignItems: 'center', justifyContent: 'center' },
  sheetTabRow: { gap: spacing.sm, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  sheetTab: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full, borderWidth: 0.5, borderColor: colors.border.default, minHeight: 36, justifyContent: 'center' },
  sheetTabActive: { backgroundColor: colors.accent.violetDim, borderColor: colors.accent.violet },
  sheetTabText: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.secondary },
  sheetTabTextActive: { color: colors.accent.violetBright },
  sheetScroll: { paddingHorizontal: spacing.xl, gap: spacing.xl },
  sheetGroup: { gap: spacing.sm },
  sheetGroupHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sheetGroupTitle: { fontSize: fontSize.lg, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  sheetGroupCaption: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },
  sheetPairRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  sheetPairCell: { flex: 1, gap: 2 },
  sheetPairLabel: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.secondary },
  sheetPairValue: { fontSize: fontSize.xl, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },

  // Insider sheet
  insiderTxn: { gap: spacing.sm },
  insiderTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  insiderName: { fontSize: fontSize.lg, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  insiderTitle: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted, marginTop: 2 },
  insiderDate: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },
  insiderType: { fontSize: fontSize.md, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium },
  insiderMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  insiderMeta: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },
  insiderMetaVal: { fontSize: fontSize.lg, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  insiderLinks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  insiderLink: { flexDirection: 'row', alignItems: 'center' },
  insiderLinkText: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.secondary },
});
