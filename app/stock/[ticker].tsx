import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import THEME from '../../src/theme';
import {
  getStockOverview, StockOverview, IncomePeriod, EarningsQuarter,
  InsiderTxn, AnalystVerdict,
} from '../../src/mock';
import { getSnapshot, getChartBars, OHLCVBar } from '../../src/services/polygon';
import { getProfile, getIncomeStatement, getEarningsHistory, getEarningsEstimate, getPriceTargets, getInsiderTrades } from '../../src/services/fmp';
import { getAnalystRecs, getTickerNews } from '../../src/services/finnhub';
import { TickerLogo } from '../../src/components/ui';
import { getCongressTrades, getHolders } from '../../src/services/whalewisdom';

const { colors, fontSize, fontWeight, radius, spacing } = THEME;

const RANGES = ['1D', '1W', '1M', '3M', '6M', 'YTD', '1Y', '5Y'];
type Tab = 'Profile' | 'Earnings' | 'Smart Money' | 'News';
const TABS: Tab[] = ['Profile', 'Earnings', 'Smart Money', 'News'];

// ─── Price area chart (flat, View-based) ──────────────────────────────────────

function PriceChart({ data, up }: { data: number[]; up: boolean }) {
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const color = up ? colors.status.green : colors.status.red;

  // Y-axis labels (4 ticks high→low)
  const ticks = [max, max - range / 3, max - (2 * range) / 3, min].map(v => v.toFixed(1));

  return (
    <View style={cht.priceWrap}>
      <View style={cht.pricePlot}>
        {/* Y-axis labels */}
        <View style={cht.yAxis}>
          {ticks.map((t, i) => <Text key={i} style={cht.yLabel}>{t}</Text>)}
        </View>
        {/* Bars (area silhouette) */}
        <View style={cht.bars}>
          {data.map((v, i) => {
            const h = 6 + ((v - min) / range) * 94;
            return <View key={i} style={[cht.bar, { height: `${h}%`, backgroundColor: color + '33', borderTopWidth: 1.5, borderTopColor: color }]} />;
          })}
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
      <Text style={cht.volTitle}>VOLUME</Text>
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
  pricePlot: { flexDirection: 'row', height: 180, gap: spacing.sm },
  yAxis: { width: 44, justifyContent: 'space-between', paddingVertical: 2 },
  yLabel: { fontSize: 10, fontWeight: fontWeight.regular, color: colors.text.muted },
  bars: { flex: 1, flexDirection: 'row', alignItems: 'flex-end', gap: 1 },
  bar: { flex: 1, borderRadius: 1 },
  volWrap: { gap: spacing.sm, paddingTop: spacing.sm, borderTopWidth: 0.5, borderTopColor: 'rgba(255,255,255,0.06)' },
  volTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text.muted, letterSpacing: 0.5 },
  volPlot: { flexDirection: 'row', height: 80, gap: spacing.sm },
});

// ─── Income statement combo (bars + margin dots) ──────────────────────────────

function IncomeChart({ data }: { data: IncomePeriod[] }) {
  const maxRev = Math.max(...data.map(d => d.revenue)) || 1;
  return (
    <View style={inc.wrap}>
      <View style={inc.plot}>
        {data.map((d) => (
          <View key={d.period} style={inc.col}>
            <View style={inc.barsRow}>
              {/* margin dot above the bars */}
              <View style={[inc.marginDot, { bottom: `${d.margin}%` }]} />
              <View style={[inc.bar, { height: `${(d.revenue / maxRev) * 100}%`, backgroundColor: colors.status.blue }]} />
              <View style={[inc.bar, { height: `${(d.netIncome / maxRev) * 100}%`, backgroundColor: '#A855F7' }]} />
            </View>
            <Text style={inc.period}>{d.period}</Text>
          </View>
        ))}
      </View>
      <View style={inc.legend}>
        <LegendDot color={colors.status.blue} label="Revenue" />
        <LegendDot color="#A855F7" label="Net income" />
        <LegendDot color={colors.status.amber} label="Net margin %" />
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
  plot: { flexDirection: 'row', height: 160, alignItems: 'flex-end' },
  col: { flex: 1, alignItems: 'center', gap: spacing.xs },
  barsRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 2, height: 130, position: 'relative' },
  bar: { width: 9, borderTopLeftRadius: 2, borderTopRightRadius: 2 },
  marginDot: { position: 'absolute', alignSelf: 'center', left: '50%', marginLeft: -3, width: 6, height: 6, borderRadius: 3, backgroundColor: colors.status.amber },
  period: { fontSize: 9, fontWeight: fontWeight.regular, color: colors.text.muted },
  legend: { flexDirection: 'row', justifyContent: 'center', gap: spacing.md, flexWrap: 'wrap' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.secondary },
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
  current: { fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.text.secondary },
  currentVal: { fontWeight: fontWeight.medium, color: colors.text.primary },
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
  endLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.secondary },
  endVal: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: colors.text.primary },
  median: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.secondary, textAlign: 'center', marginTop: spacing.xs },
  medianVal: { fontWeight: fontWeight.medium, color: colors.text.primary },
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
  endLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.muted },
  verdict: { fontSize: fontSize.xl, fontWeight: fontWeight.medium, textAlign: 'center', marginTop: spacing.xs },
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
    <TouchableOpacity style={d.viewMore} onPress={onPress} activeOpacity={0.7}>
      <Text style={d.viewMoreText}>View more </Text>
      <Ionicons name="chevron-forward" size={13} color={colors.text.secondary} />
    </TouchableOpacity>
  );
}

// ─── Profile tab ──────────────────────────────────────────────────────────────

function ProfileTab({ s, onOpenSheet }: { s: StockOverview; onOpenSheet: () => void }) {
  const [incomeMode, setIncomeMode] = useState<'Annual' | 'Quarterly'>('Annual');
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
          <TouchableOpacity key={m} style={[d.toggleBtn, incomeMode === m && d.toggleBtnActive]} onPress={() => setIncomeMode(m)}>
            <Text style={[d.toggleText, incomeMode === m && d.toggleTextActive]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <IncomeChart data={s.income} />
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
      <Text style={d.aboutSector}>{s.sector} • {s.industry}</Text>
      <Text style={d.aboutBody}>{s.about}</Text>
      <ViewMore onPress={onOpenSheet} />
    </View>
  );
}

// ─── Earnings tab ─────────────────────────────────────────────────────────────

const RESULT_COLOR = { Beat: colors.status.green, Miss: colors.status.red };
const GUIDANCE_COLOR = { Above: colors.status.green, Inline: colors.status.amber, Below: colors.status.red };

function EarningsResultCard({ label, result, est, actual }: { label: string; result: 'Beat' | 'Miss'; est: string; actual: string }) {
  const color = RESULT_COLOR[result];
  return (
    <View style={[d.earnCard, { borderColor: color + '40' }]}>
      <View style={[d.earnIconRing, { borderColor: color + '50' }]}>
        <Ionicons name={result === 'Beat' ? 'checkmark' : 'trending-down'} size={22} color={color} />
      </View>
      <Text style={d.earnLabel}>{label}</Text>
      <Text style={[d.earnResult, { color }]}>{result}</Text>
      <Text style={d.earnEst}>Est {est}</Text>
      <Text style={d.earnEst}>Actual {actual}</Text>
    </View>
  );
}

function EarningsBars({ history }: { history: EarningsQuarter[] }) {
  const max = Math.max(...history.map(h => Math.max(h.actualEps, h.estEps))) || 1;
  return (
    <View style={inc.wrap}>
      <View style={d.earnLegend}>
        <LegendDot color={colors.status.green} label="Actual EPS" />
        <LegendDot color={colors.text.muted} label="Est. EPS" />
      </View>
      <View style={inc.plot}>
        {history.map((h) => {
          const upcoming = h.actualEps === 0;
          return (
            <View key={h.period} style={inc.col}>
              <View style={inc.barsRow}>
                <View style={[inc.bar, { height: `${(h.estEps / max) * 100}%`, backgroundColor: colors.text.muted, ...(upcoming ? { borderWidth: 1, borderColor: colors.text.muted, borderStyle: 'dashed', backgroundColor: 'transparent' } : {}) }]} />
                {!upcoming && <View style={[inc.bar, { height: `${(h.actualEps / max) * 100}%`, backgroundColor: colors.status.green }]} />}
              </View>
              <Text style={inc.period}>{h.period}</Text>
              {!upcoming
                ? <View style={d.beatPill}><Text style={d.beatPillText}>+{h.beatPct}%</Text></View>
                : <Text style={d.upcomingLabel}>Upcoming</Text>}
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
          <TouchableOpacity key={m} style={[d.bigToggle, mode === m && d.bigToggleActive]} onPress={() => setMode(m)}>
            <Ionicons name={m === 'Past' ? 'time-outline' : 'calendar-outline'} size={15} color={mode === m ? colors.accent.tealLight : colors.text.muted} />
            <Text style={[d.bigToggleText, mode === m && d.bigToggleTextActive]}>{m}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {mode === 'Past' ? (
        <>
          <Text style={d.earnPeriod}>{s.earningsPast.period}</Text>
          <View style={d.earnCardRow}>
            <EarningsResultCard label="Revenue" result={s.earningsPast.revenue.result} est={s.earningsPast.revenue.est} actual={s.earningsPast.revenue.actual} />
            <EarningsResultCard label="EPS" result={s.earningsPast.eps.result} est={s.earningsPast.eps.est} actual={s.earningsPast.eps.actual} />
            <View style={[d.earnCard, { borderColor: GUIDANCE_COLOR[s.earningsPast.guidance] + '40' }]}>
              <View style={[d.earnIconRing, { borderColor: GUIDANCE_COLOR[s.earningsPast.guidance] + '50' }]}>
                <Ionicons name="trending-down" size={22} color={GUIDANCE_COLOR[s.earningsPast.guidance]} />
              </View>
              <Text style={d.earnLabel}>Guidance</Text>
              <Text style={[d.earnResult, { color: GUIDANCE_COLOR[s.earningsPast.guidance] }]}>{s.earningsPast.guidance}</Text>
              <TouchableOpacity style={d.seeReason}>
                <Text style={d.seeReasonText}>See reason </Text>
                <Ionicons name="chevron-forward" size={11} color={colors.text.muted} />
              </TouchableOpacity>
            </View>
          </View>

          <SectionHead icon="document-text-outline" title="Earnings Summary" />
          <View style={d.summaryBox}>
            {s.earningsPast.summary.map((line, i) => (
              <View key={i} style={d.summaryRow}>
                <Text style={d.bullet}>•</Text>
                <Text style={d.summaryText}>{line}</Text>
              </View>
            ))}
            <TouchableOpacity style={d.transcriptBtn}>
              <Text style={d.transcriptText}>See full transcript </Text>
              <Ionicons name="chevron-forward" size={13} color={colors.text.secondary} />
            </TouchableOpacity>
          </View>

          <SectionHead icon="trending-up" title="Earnings" />
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
          <View style={d.estRow}>
            <Text style={d.estLabel}>EPS Estimate</Text>
            <Text style={d.estValue}>{s.earningsUpcoming.epsEstimate}</Text>
          </View>
          <View style={d.estRow}>
            <Text style={d.estLabel}>Revenue Estimate</Text>
            <Text style={d.estValue}>{s.earningsUpcoming.revenueEstimate}</Text>
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
        right={<TouchableOpacity style={d.seeTradesBtn} onPress={onOpenInsiders}><Text style={d.seeTradesText}>See Trades</Text></TouchableOpacity>}
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
        right={<TouchableOpacity style={d.seeTradesBtn} onPress={() => router.push('/congress')}><Text style={d.seeTradesText}>See Trades</Text></TouchableOpacity>}
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
        <TouchableOpacity style={d.showMoreChip} onPress={() => router.push('/super-investors')}>
          <Text style={d.showMoreText}>Show More</Text>
        </TouchableOpacity>
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
        <TouchableOpacity key={i} style={d.newsRow} activeOpacity={0.7}>
          <Text style={d.newsTitle}>{n.title}</Text>
          <View style={d.newsMeta}>
            <Text style={d.newsSource}>{n.source}</Text>
            <Text style={d.newsTime}>{n.time}</Text>
          </View>
          {i < s.news.length - 1 && <View style={d.newsDivider} />}
        </TouchableOpacity>
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
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <View style={d.sheetClose}><Ionicons name="close" size={18} color={colors.text.primary} /></View>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={d.sheetTabRow}>
            {SHEET_TABS.map(t => (
              <TouchableOpacity key={t} style={[d.sheetTab, tab === t && d.sheetTabActive]} onPress={() => setTab(t)}>
                <Text style={[d.sheetTabText, tab === t && d.sheetTabTextActive]}>{t}</Text>
              </TouchableOpacity>
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
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <View style={d.sheetClose}><Ionicons name="close" size={18} color={colors.text.primary} /></View>
            </TouchableOpacity>
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
                    <TouchableOpacity style={d.insiderLink}><Text style={d.insiderLinkText}>View Filing </Text><Ionicons name="open-outline" size={12} color={colors.text.secondary} /></TouchableOpacity>
                    {tx.trades > 1 && <TouchableOpacity style={d.insiderLink}><Text style={d.insiderLinkText}>View Transactions </Text><Ionicons name="chevron-down" size={12} color={colors.text.secondary} /></TouchableOpacity>}
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
  const [range, setRange] = useState('1D');
  const [starred, setStarred] = useState(false);
  const [profileSheet, setProfileSheet] = useState(false);
  const [insiderSheet, setInsiderSheet] = useState(false);

  const ticker = params.ticker ?? 'NVDA';
  const [s, setS] = useState<StockOverview>(() =>
    getStockOverview(ticker, params.name, params.price ? Number(params.price) : undefined, params.sector)
  );

  const updateS = (patch: Partial<StockOverview>) => setS(prev => ({ ...prev, ...patch }));

  // Fetch chart when range changes
  useEffect(() => {
    const validRange = (['1D','5D','1M','3M','6M','1Y','5Y'] as const).find(r => r === range) ?? '1M';
    tryGet(() => getChartBars(ticker, validRange)).then((bars: OHLCVBar[] | null) => {
      if (!bars?.length) return;
      updateS({
        chart:  bars.map(b => b.c),
        volume: bars.map(b => ({ value: b.v / 1_000_000, up: b.c >= b.o })),
      });
    });
  }, [ticker, range]);

  // Fetch all fundamental data on mount
  useEffect(() => {
    // Price
    tryGet(() => getSnapshot(ticker)).then(snap => {
      if (!snap || snap.price <= 0) return;
      const dateStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      updateS({
        price: { atClose: snap.price, closeChange: snap.change, closeChangePct: snap.changePct, closeDate: dateStr, postMarket: snap.price, postChange: 0, postChangePct: 0 },
      });
    });

    // Company profile → name, description, key stats
    tryGet(() => getProfile(ticker)).then(profile => {
      if (!profile) return;
      updateS({
        name:     profile.name || s.name,
        sector:   profile.sector || s.sector,
        industry: profile.industry,
        about:    profile.description || s.about,
        profileSheet: {
          ...s.profileSheet,
          marketCap: fmtCap(profile.marketCap),
        },
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
      });
    });

    // Income statement
    tryGet(() => getIncomeStatement(ticker, 'annual', 6)).then(income => {
      if (!income?.length) return;
      updateS({
        income: income.map(p => ({ period: p.period, revenue: p.revenue, netIncome: p.netIncome, margin: p.netMargin })),
      });
    });

    // Earnings history
    tryGet(() => getEarningsHistory(ticker, 8)).then(hist => {
      if (!hist?.length) return;
      updateS({
        earningsHistory: hist.map(q => ({
          period:    q.period,
          actualEps: q.epsActual,
          estEps:    q.epsEstimate,
          beatPct:   q.epsEstimate !== 0 ? ((q.epsActual - q.epsEstimate) / Math.abs(q.epsEstimate)) * 100 : 0,
          actualRev: q.revenueActual,
          estRev:    q.revenueEstimate,
        })),
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
        <TouchableOpacity onPress={() => router.back()} style={d.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={d.headerTitle}>BAREBONE</Text>
        <TouchableOpacity onPress={() => setStarred(v => !v)} style={d.headerBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name={starred ? 'star' : 'star-outline'} size={22} color={starred ? colors.status.amber : colors.text.secondary} />
        </TouchableOpacity>
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
            <Text style={d.priceColLabel}>At close</Text>
            <Text style={d.priceBig}>{s.price.atClose.toFixed(2)} <Text style={d.priceUnit}>USD</Text></Text>
            <View style={d.priceChangeRow}>
              <Ionicons name={closeUp ? 'arrow-up' : 'arrow-down'} size={13} color={closeUp ? colors.status.green : colors.status.red} />
              <Text style={[d.priceChange, { color: closeUp ? colors.status.green : colors.status.red }]}>
                {closeUp ? '+' : ''}{s.price.closeChange.toFixed(2)} ({closeUp ? '+' : ''}{s.price.closeChangePct.toFixed(2)}%)
              </Text>
            </View>
            <Text style={d.priceSince}>Since  {s.price.closeDate}</Text>
          </View>
          <View style={d.priceCol}>
            <Text style={d.priceColLabel}>Post-Market</Text>
            <Text style={d.priceBig}>{s.price.postMarket.toFixed(2)} <Text style={d.priceUnit}>USD</Text></Text>
            <View style={d.priceChangeRow}>
              <Ionicons name={postUp ? 'arrow-up' : 'arrow-down'} size={13} color={postUp ? colors.status.green : colors.status.red} />
              <Text style={[d.priceChange, { color: postUp ? colors.status.green : colors.status.red }]}>
                {postUp ? '+' : ''}{s.price.postChange.toFixed(2)} ({postUp ? '+' : ''}{s.price.postChangePct.toFixed(2)}%)
              </Text>
            </View>
          </View>
        </View>

        {/* Charts + range + CTA (this whole block is index 3 — but we keep it inline) */}
        <View style={d.chartsBlock}>
          <PriceChart data={s.chart} up={closeUp} />
          <VolumeChart data={s.volume} />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={d.rangeRow}>
            {RANGES.map(r => (
              <TouchableOpacity key={r} style={[d.rangeChip, range === r && d.rangeChipActive]} onPress={() => setRange(r)}>
                <Text style={[d.rangeText, range === r && d.rangeTextActive]}>{r}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity style={d.visualizeBtn} activeOpacity={0.8}>
            <Ionicons name="bar-chart-outline" size={15} color={colors.text.primary} />
            <Text style={d.visualizeText}>Visualize Earnings & Trades</Text>
          </TouchableOpacity>
        </View>

        {/* Sticky tab bar (index 3) */}
        <View style={d.tabBar}>
          {TABS.map(t => (
            <TouchableOpacity key={t} style={d.tabBtn} onPress={() => setTab(t)} activeOpacity={0.7}>
              <Text style={[d.tabText, tab === t && d.tabTextActive]}>{t}</Text>
              {tab === t && <View style={d.tabUnderline} />}
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab content */}
        {tab === 'Profile'     && <ProfileTab s={s} onOpenSheet={() => setProfileSheet(true)} />}
        {tab === 'Earnings'    && <EarningsTab s={s} />}
        {tab === 'Smart Money' && <SmartMoneyTab s={s} onOpenInsiders={() => setInsiderSheet(true)} />}
        {tab === 'News'        && <NewsTab s={s} />}

        <View style={{ height: spacing.xxxl }} />
      </ScrollView>

      <ProfileSheet s={s} visible={profileSheet} onClose={() => setProfileSheet(false)} />
      <InsiderSheet txns={s.insiderTransactions} visible={insiderSheet} onClose={() => setInsiderSheet(false)} />
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
  headerTitle: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text.primary, letterSpacing: 1 },

  scroll: { paddingBottom: spacing.xl },

  identityRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingHorizontal: spacing.xl, paddingTop: spacing.sm },
  companyName: { fontSize: fontSize.xl, fontWeight: fontWeight.medium, color: colors.text.primary },
  companyTicker: { fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.text.muted },

  priceRow: { flexDirection: 'row', paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.xl },
  priceCol: { flex: 1, gap: 3 },
  priceColLabel: { fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.text.secondary },
  priceBig: { fontSize: fontSize.xxl, fontWeight: fontWeight.medium, color: colors.text.primary },
  priceUnit: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.muted },
  priceChangeRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  priceChange: { fontSize: fontSize.md, fontWeight: fontWeight.medium },
  priceSince: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.muted },

  chartsBlock: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl, gap: spacing.lg },
  rangeRow: { gap: spacing.xs, paddingVertical: 2 },
  rangeChip: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.full, minHeight: 34, alignItems: 'center', justifyContent: 'center' },
  rangeChipActive: { backgroundColor: colors.status.red + '25' },
  rangeText: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text.muted },
  rangeTextActive: { color: colors.status.red },
  visualizeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm,
    backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 0.5, borderColor: colors.border.default,
    paddingVertical: spacing.md, minHeight: 48,
  },
  visualizeText: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text.primary },

  // Tab bar
  tabBar: {
    flexDirection: 'row', backgroundColor: colors.bg.primary,
    paddingHorizontal: spacing.xl, marginTop: spacing.lg,
    borderBottomWidth: 0.5, borderBottomColor: colors.border.default,
  },
  tabBtn: { flex: 1, alignItems: 'center', paddingVertical: spacing.md },
  tabText: { fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.text.muted },
  tabTextActive: { color: colors.text.primary, fontWeight: fontWeight.medium },
  tabUnderline: { position: 'absolute', bottom: 0, height: 2, left: '20%', right: '20%', backgroundColor: colors.accent.teal, borderRadius: 1 },

  tabBody: { paddingHorizontal: spacing.xl, paddingTop: spacing.lg, gap: spacing.md },

  // Section head
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: spacing.sm },
  sectionHeadLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sectionTitle: { fontSize: fontSize.xl, fontWeight: fontWeight.medium, color: colors.text.primary },
  viewMore: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.sm },
  viewMoreText: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text.secondary },

  // Key stats
  statList: { gap: 0 },
  statRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md },
  statRowBorder: { borderBottomWidth: 0.5, borderBottomColor: colors.border.default },
  statLabel: { fontSize: fontSize.lg, fontWeight: fontWeight.regular, color: colors.text.secondary },
  statValue: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: colors.text.primary },

  // Toggle row (Annual/Quarterly)
  toggleRow: { flexDirection: 'row', gap: spacing.sm },
  toggleBtn: { paddingHorizontal: spacing.md, paddingVertical: 7, borderRadius: radius.md, backgroundColor: colors.bg.card, borderWidth: 0.5, borderColor: colors.border.default, minHeight: 34 },
  toggleBtnActive: { backgroundColor: colors.bg.elevated, borderColor: colors.border.strong },
  toggleText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text.muted },
  toggleTextActive: { color: colors.text.primary },

  // About
  aboutName: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text.primary },
  aboutSector: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.muted },
  aboutBody: { fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.text.secondary, lineHeight: 22 },

  // Earnings
  bigToggle: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 0.5, borderColor: colors.border.default, paddingVertical: spacing.md, minHeight: 48 },
  bigToggleActive: { backgroundColor: colors.accent.tealDim, borderColor: colors.accent.teal },
  bigToggleText: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text.muted },
  bigToggleTextActive: { color: colors.accent.tealLight },
  earnPeriod: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: colors.text.primary, marginTop: spacing.sm },
  earnCardRow: { flexDirection: 'row', gap: spacing.sm },
  earnCard: { flex: 1, backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 0.5, padding: spacing.md, alignItems: 'center', gap: spacing.xs, minHeight: 150, justifyContent: 'center' },
  earnIconRing: { width: 48, height: 48, borderRadius: 24, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xs },
  earnLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.secondary },
  earnResult: { fontSize: fontSize.lg, fontWeight: fontWeight.medium },
  earnEst: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.muted },
  seeReason: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs },
  seeReasonText: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.muted },
  earnLegend: { flexDirection: 'row', justifyContent: 'center', gap: spacing.lg },
  beatPill: { backgroundColor: colors.status.green + '25', borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2 },
  beatPillText: { fontSize: 9, fontWeight: fontWeight.medium, color: colors.status.green },
  upcomingLabel: { fontSize: 9, fontWeight: fontWeight.regular, color: colors.text.muted, fontStyle: 'italic' },

  summaryBox: { backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 0.5, borderColor: colors.border.default, padding: spacing.md, gap: spacing.md },
  summaryRow: { flexDirection: 'row', gap: spacing.sm },
  bullet: { fontSize: fontSize.md, color: colors.text.muted, lineHeight: 22 },
  summaryText: { flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.text.primary, lineHeight: 22 },
  transcriptBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end' },
  transcriptText: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text.secondary },

  nextEarnRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 0.5, borderColor: colors.border.default, padding: spacing.md, minHeight: 48, marginTop: spacing.sm },
  nextEarnLeft: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  nextEarnLabel: { fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.text.secondary },
  nextEarnDate: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: colors.text.primary },
  estRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: spacing.md, borderBottomWidth: 0.5, borderBottomColor: colors.border.default },
  estLabel: { fontSize: fontSize.lg, fontWeight: fontWeight.regular, color: colors.text.secondary },
  estValue: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: colors.text.primary },

  // Smart money
  seeTradesBtn: { backgroundColor: colors.bg.card, borderRadius: radius.full, borderWidth: 0.5, borderColor: colors.border.default, paddingHorizontal: spacing.md, paddingVertical: 7, minHeight: 34, justifyContent: 'center' },
  seeTradesText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text.primary },
  splitTrack: { flexDirection: 'row', height: 10, borderRadius: 5, overflow: 'hidden' },
  splitFill: { height: 10 },
  splitLabels: { flexDirection: 'row', justifyContent: 'space-between' },
  splitLabel: { fontSize: fontSize.lg, fontWeight: fontWeight.medium },
  splitCaption: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.muted, textAlign: 'center' },
  smDivider: { height: 0.5, backgroundColor: colors.border.default, marginVertical: spacing.sm },
  congressGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  congressColLabel: { fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.text.muted, flex: 1 },
  congressRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  congressValue: { fontSize: fontSize.xl, fontWeight: fontWeight.medium, color: colors.text.primary },
  congressCount: { fontSize: fontSize.xl, fontWeight: fontWeight.medium },
  quarterText: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.muted },
  holdersHeaderRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  holdersSubtitle: { fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.text.secondary },
  showMoreChip: { backgroundColor: colors.bg.card, borderRadius: radius.full, borderWidth: 0.5, borderColor: colors.border.default, paddingHorizontal: spacing.md, paddingVertical: 6 },
  showMoreText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text.primary },
  holderCard: { backgroundColor: colors.bg.card, borderRadius: radius.lg, borderWidth: 0.5, borderColor: colors.border.default, padding: spacing.md, gap: spacing.sm },
  holderName: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: colors.text.primary },
  holderBarRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  holderTrack: { flex: 1, height: 6, backgroundColor: colors.bg.secondary, borderRadius: 3 },
  holderFill: { height: 6, borderRadius: 3, backgroundColor: colors.status.blue },
  holderPct: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.muted },

  // News
  newsRow: { gap: spacing.sm },
  newsTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: colors.text.primary, lineHeight: 23 },
  newsMeta: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  newsSource: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.muted },
  newsTime: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.muted },
  newsDivider: { height: 0.5, backgroundColor: colors.border.default, marginVertical: spacing.md },

  // Sheets
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: colors.bg.card, borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, borderTopWidth: 0.5, borderColor: colors.border.default, paddingTop: spacing.xl, maxHeight: '88%' },
  sheetHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.xl, marginBottom: spacing.lg },
  sheetTitle: { fontSize: fontSize.xxl, fontWeight: fontWeight.medium, color: colors.text.primary },
  sheetClose: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.bg.secondary, alignItems: 'center', justifyContent: 'center' },
  sheetTabRow: { gap: spacing.sm, paddingHorizontal: spacing.xl, paddingBottom: spacing.lg },
  sheetTab: { paddingHorizontal: spacing.md, paddingVertical: 8, borderRadius: radius.full, borderWidth: 0.5, borderColor: colors.border.default, minHeight: 36, justifyContent: 'center' },
  sheetTabActive: { backgroundColor: colors.accent.tealDim, borderColor: colors.accent.teal },
  sheetTabText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text.secondary },
  sheetTabTextActive: { color: colors.accent.tealLight },
  sheetScroll: { paddingHorizontal: spacing.xl, gap: spacing.xl },
  sheetGroup: { gap: spacing.sm },
  sheetGroupHead: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  sheetGroupTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: colors.text.primary },
  sheetGroupCaption: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.muted },
  sheetPairRow: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.sm },
  sheetPairCell: { flex: 1, gap: 2 },
  sheetPairLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.secondary },
  sheetPairValue: { fontSize: fontSize.xl, fontWeight: fontWeight.medium, color: colors.text.primary },

  // Insider sheet
  insiderTxn: { gap: spacing.sm },
  insiderTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  insiderName: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: colors.text.primary },
  insiderTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.muted, marginTop: 2 },
  insiderDate: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.muted },
  insiderType: { fontSize: fontSize.md, fontWeight: fontWeight.medium },
  insiderMetaRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  insiderMeta: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.muted },
  insiderMetaVal: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: colors.text.primary },
  insiderLinks: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  insiderLink: { flexDirection: 'row', alignItems: 'center' },
  insiderLinkText: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.secondary },
});
