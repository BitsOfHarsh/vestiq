import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import THEME from '../src/theme';
import { TickerLogo } from '../src/components/ui';
import ScalePressable from '../src/components/ui/ScalePressable';
import { EarningsDay, EarningsCompany, EconomicDay } from '../src/mock';
import { getEarningsCalendar, getEconomicCalendar } from '../src/services/fmp';

const { colors, fontSize, fontWeight, fontFamily, radius, spacing } = THEME;

type Tab = 'notable' | 'earnings' | 'economic';

// ─── Notable tab ──────────────────────────────────────────────────────────────

function NotableTab() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, paddingBottom: 60 }}>
      <Ionicons name="star-outline" size={36} color={colors.text.muted} />
      <Text style={{ fontSize: fontSize.md, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.secondary }}>
        Coming soon
      </Text>
      <Text style={{ fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted, textAlign: 'center', paddingHorizontal: 40 }}>
        Curated market-moving events will appear here
      </Text>
    </View>
  );
}

// ─── Earnings tab ─────────────────────────────────────────────────────────────

function CompanyBlock({ company }: { company: EarningsCompany }) {
  const hasBeat = company.beatPct !== undefined;
  return (
    <View style={t.companyBlock}>
      <TickerLogo
        ticker={company.ticker} size={52} borderRadius={10}
        onPress={() => router.push({ pathname: '/stock/[ticker]', params: { ticker: company.ticker } })}
      />
      <Text style={t.companyTicker}>{company.ticker}</Text>
      {hasBeat && (
        <View style={t.beatBadge}>
          <Text style={t.beatPct}>{company.beatPct}%</Text>
          <Text style={t.beatLabel}>Beat</Text>
        </View>
      )}
    </View>
  );
}

function EarningsDayCard({ day }: { day: EarningsDay }) {
  const parts = day.date.split(' '); // e.g. ["Mon,", "Jun", "22"] or ["Mon", "Jun", "22"]
  const weekday = parts[0].replace(',', '');
  const dayNum  = parts[parts.length - 1];

  const hasPreMarket  = day.preMarket.length > 0;
  const hasPostMarket = day.postMarket.length > 0;

  return (
    <View style={t.dayRow}>
      {/* Left: date */}
      <View style={t.dayNumCol}>
        <Text style={t.weekday}>{weekday}</Text>
        <Text style={t.dayNum}>{dayNum}</Text>
      </View>

      {/* Right: card with pre/post sections */}
      <View style={t.dayCard}>
        <View style={t.sectionsRow}>

          {/* Pre-Market */}
          <View style={[t.section, hasPreMarket && hasPostMarket && t.sectionBorder]}>
            <View style={t.sectionHeader}>
              <Ionicons name="sunny-outline" size={13} color={colors.status.amber} />
              <Text style={t.sectionLabel}>Pre-Market</Text>
            </View>
            {hasPreMarket
              ? (
                <View style={t.companiesRow}>
                  {day.preMarket.map(c => <CompanyBlock key={c.ticker} company={c} />)}
                </View>
              )
              : <Text style={t.noEarnings}>No earnings available</Text>
            }
          </View>

          {/* Post-Market */}
          <View style={t.section}>
            <View style={t.sectionHeader}>
              <Ionicons name="moon-outline" size={13} color={colors.status.blue} />
              <Text style={t.sectionLabel}>Post-Market</Text>
            </View>
            {hasPostMarket
              ? (
                <View style={t.companiesRow}>
                  {day.postMarket.map(c => <CompanyBlock key={c.ticker} company={c} />)}
                </View>
              )
              : <Text style={t.noEarnings}>No earnings available</Text>
            }
          </View>

        </View>
      </View>
    </View>
  );
}

function EarningsTab({ days, loading }: { days: EarningsDay[]; loading: boolean }) {
  if (loading) {
    return (
      <View style={t.centered}>
        <ActivityIndicator size="large" color={colors.accent.brand} />
      </View>
    );
  }
  if (!days.length) {
    return (
      <View style={t.centered}>
        <Ionicons name="calendar-outline" size={36} color={colors.text.muted} />
        <Text style={t.emptyLabel}>No upcoming earnings</Text>
      </View>
    );
  }

  // Month header from first day
  const firstDate = days[0]?.date ?? '';
  const monthParts = firstDate.split(' ');
  const monthYear  = monthParts.length >= 3
    ? `${monthParts[monthParts.length - 2]} ${new Date().getFullYear()}`
    : '';

  return (
    <ScrollView contentContainerStyle={t.scroll} showsVerticalScrollIndicator={false}>
      {monthYear ? <Text style={t.monthHeader}>{monthYear}</Text> : null}
      {days.map(day => <EarningsDayCard key={day.date} day={day} />)}
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

// ─── Economic tab ─────────────────────────────────────────────────────────────

function EconomicTab({ days, loading }: { days: EconomicDay[]; loading: boolean }) {
  if (loading) {
    return (
      <View style={t.centered}>
        <ActivityIndicator size="large" color={colors.accent.brand} />
      </View>
    );
  }
  if (!days.length) {
    return (
      <View style={t.centered}>
        <Ionicons name="calendar-outline" size={36} color={colors.text.muted} />
        <Text style={t.emptyLabel}>No economic events</Text>
      </View>
    );
  }
  return (
    <ScrollView contentContainerStyle={t.scroll} showsVerticalScrollIndicator={false}>
      {days.map((day) => (
        <View key={day.date} style={t.ecoCard}>
          <Text style={t.ecoDayLabel}>{day.date}</Text>
          <View style={{ gap: 8 }}>
            {day.events.map((ev, i) => (
              <View key={i} style={t.ecoRow}>
                <View style={t.ecoDot} />
                <Text style={t.ecoText}>{ev}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

const TABS: { key: Tab; icon: string; label: string }[] = [
  { key: 'notable',  icon: 'globe-outline',      label: 'Notable'  },
  { key: 'earnings', icon: 'trending-up-outline', label: 'Earnings' },
  { key: 'economic', icon: 'calendar-outline',    label: 'Economic' },
];

export default function EventsScreen() {
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [active, setActive] = useState<Tab>(params.tab ?? 'earnings');

  const [earnings,  setEarnings]  = useState<EarningsDay[]>([]);
  const [economic,  setEconomic]  = useState<EconomicDay[]>([]);
  const [earnLoad,  setEarnLoad]  = useState(true);
  const [ecoLoad,   setEcoLoad]   = useState(true);

  useEffect(() => {
    // Earnings from FMP only
    getEarningsCalendar(14).then(cal => {
      const TICKER_RE = /^[A-Z]{1,5}$/;
      const today = new Date();
      const todayISO = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
      const grouped: Record<string, EarningsDay> = {};
      for (const e of cal) {
        if (!TICKER_RE.test(e.ticker)) continue;
        if (!grouped[e.date]) grouped[e.date] = {
          date: new Date(e.date + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          preMarket: [], postMarket: [],
        };
        const company: EarningsCompany = { ticker: e.ticker, name: e.ticker };
        if (e.time === 'bmo') grouped[e.date].preMarket.push(company);
        else                  grouped[e.date].postMarket.push(company);
      }
      const days = Object.entries(grouped)
        .filter(([iso, d]) => iso >= todayISO && d.preMarket.length + d.postMarket.length > 0)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, d]) => d);
      setEarnings(days);
    }).catch(() => {}).finally(() => setEarnLoad(false));

    // Economic calendar from FMP — US only, medium/high impact
    getEconomicCalendar(14).then(cal => {
      const grouped: Record<string, string[]> = {};
      for (const e of cal) {
        if (e.country !== 'US' && e.country !== 'United States') continue;
        if (e.impact === 'Low') continue;
        if (!grouped[e.date]) grouped[e.date] = [];
        grouped[e.date].push(e.event);
      }
      const days: EconomicDay[] = Object.entries(grouped)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, events]) => ({
          date: new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
          events,
        }));
      setEconomic(days);
    }).catch(() => {}).finally(() => setEcoLoad(false));
  }, []);

  return (
    <SafeAreaView style={s.container}>

      {/* Header */}
      <View style={s.header}>
        <ScalePressable
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={s.backBtn}
          scaleTo={0.88}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
        </ScalePressable>
        <Text style={s.headerTitle}>Upcoming Events</Text>
        <ScalePressable hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
          <Ionicons name="options-outline" size={20} color={colors.text.secondary} />
        </ScalePressable>
      </View>

      {/* Tab bar */}
      <View style={s.tabBar}>
        {TABS.map((tb) => {
          const active_ = active === tb.key;
          return (
            <ScalePressable
              key={tb.key}
              style={[s.tabBtn, active_ && s.tabBtnActive]}
              onPress={() => setActive(tb.key)}
            >
              {active_
                ? <View style={[s.tabBtnGrad, { backgroundColor: colors.accent.brand }]}>
                    <Ionicons name={tb.icon as never} size={13} color="#fff" />
                    <Text style={s.tabTextActive}>{tb.label}</Text>
                  </View>
                : <>
                    <Ionicons name={tb.icon as never} size={13} color={colors.text.muted} />
                    <Text style={s.tabText}>{tb.label}</Text>
                  </>
              }
            </ScalePressable>
          );
        })}
      </View>

      {/* Content */}
      {active === 'notable'  && <NotableTab />}
      {active === 'earnings' && <EarningsTab days={earnings} loading={earnLoad} />}
      {active === 'economic' && <EconomicTab days={economic} loading={ecoLoad} />}

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
  backBtn:     { width: 38, height: 44, justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.lg, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },

  tabBar: {
    flexDirection: 'row', paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    gap: spacing.sm, borderBottomWidth: 0.5, borderBottomColor: colors.border.default,
  },
  tabBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: spacing.md, paddingVertical: 7,
    borderRadius: radius.full, borderWidth: 0.5, borderColor: colors.border.default,
    minHeight: 34, overflow: 'hidden',
  },
  tabBtnActive: { borderColor: 'transparent', padding: 0 },
  tabBtnGrad: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: spacing.md, paddingVertical: 7, minHeight: 34,
    borderRadius: radius.full,
  },
  tabText:       { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.secondary },
  tabTextActive: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: '#ffffff' },
});

const t = StyleSheet.create({
  scroll:  { padding: spacing.xl, gap: spacing.md },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md },
  emptyLabel: { fontSize: fontSize.md, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },

  monthHeader: {
    fontSize: fontSize.xl, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary,
    marginBottom: spacing.sm,
  },

  // Day row layout
  dayRow:   { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  dayNumCol: { width: 36, alignItems: 'flex-start', paddingTop: spacing.md },
  weekday:  { fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted },
  dayNum:   { fontSize: fontSize.xl, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },

  dayCard: {
    flex: 1, backgroundColor: colors.bg.card, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default, overflow: 'hidden',
  },
  sectionsRow: { flexDirection: 'row' },
  section:     { flex: 1, padding: spacing.md, gap: spacing.sm },
  sectionBorder: { borderRightWidth: 0.5, borderRightColor: colors.border.default },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionLabel:  { fontSize: fontSize.xs, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.secondary, letterSpacing: 0.3 },

  companiesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  companyBlock: { alignItems: 'center', gap: 4 },
  companyTicker: { fontSize: fontSize.xs, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.secondary },
  beatBadge: {
    backgroundColor: colors.status.amber + '22', borderRadius: radius.sm,
    paddingHorizontal: 6, paddingVertical: 2, alignItems: 'center',
  },
  beatPct:   { fontSize: 10, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.status.amber },
  beatLabel: { fontSize: 9,  fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.status.amber },
  noEarnings: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted, paddingVertical: 4 },

  // Notable
  notableCard: {
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default, padding: spacing.md, gap: spacing.sm,
  },
  notableTitle: { fontSize: fontSize.md, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  bulletRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bulletDot:    { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.accent.brand, marginTop: 5, flexShrink: 0 },
  bulletText:   { flex: 1, fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.secondary },

  // Economic
  ecoCard: {
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default, padding: spacing.md, gap: spacing.sm,
  },
  ecoDayLabel: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.muted },
  ecoRow:  { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  ecoDot:  { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.text.muted, marginTop: 5, flexShrink: 0 },
  ecoText: { flex: 1, fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.secondary },
});
