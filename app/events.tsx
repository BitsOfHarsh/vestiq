import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import THEME from '../src/theme';
import { TickerLogo } from '../src/components/ui';
import {
  MOCK_UPCOMING_EVENTS,
  NotableEvent,
  EarningsDay,
  EarningsCompany,
  EconomicDay,
} from '../src/mock';

const { colors, fontSize, fontWeight, radius, spacing } = THEME;

type Tab = 'notable' | 'earnings' | 'economic';

// ─── Notable tab ──────────────────────────────────────────────────────────────

function NotableTab({ events }: { events: NotableEvent[] }) {
  return (
    <ScrollView contentContainerStyle={tab.scroll} showsVerticalScrollIndicator={false}>
      {events.map((event, ei) => (
        <View key={ei} style={tab.notableCard}>
          <Text style={tab.notableTitle}>{event.title}</Text>
          <View style={tab.bulletList}>
            {event.bullets.map((b, bi) => (
              <View key={bi} style={tab.bulletRow}>
                <View style={tab.bulletDot} />
                <Text style={tab.bulletText}>{b}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
      <View style={{ height: spacing.xxxl }} />
    </ScrollView>
  );
}

// ─── Earnings tab ─────────────────────────────────────────────────────────────

function CompanyRow({ company }: { company: EarningsCompany }) {
  const hasBeat = company.beatPct !== undefined;
  const hasVerdict = company.verdict !== undefined;
  return (
    <View style={tab.companyRow}>
      <TickerLogo ticker={company.ticker} size={32} borderRadius={7} />
      <Text style={tab.companyTicker}>{company.ticker}</Text>
      {hasBeat && (
        <View style={tab.beatChip}>
          <Text style={tab.beatText}>{company.beatPct}% Beat</Text>
        </View>
      )}
      {hasVerdict && !hasBeat && (
        <View style={[tab.verdictChip, { backgroundColor: (company.verdict === 'Beat' ? colors.status.green : colors.status.red) + '20' }]}>
          <Text style={[tab.verdictText, { color: company.verdict === 'Beat' ? colors.status.green : colors.status.red }]}>
            {company.verdict}
          </Text>
        </View>
      )}
    </View>
  );
}

function EarningsTab({ days }: { days: EarningsDay[] }) {
  return (
    <ScrollView contentContainerStyle={tab.scroll} showsVerticalScrollIndicator={false}>
      {days.map((day) => (
        <View key={day.date} style={tab.earningsDayBlock}>
          <Text style={tab.earningsDayLabel}>{day.date}</Text>

          {day.preMarket.length > 0 && (
            <View style={tab.timeBlock}>
              <Text style={tab.timeLabel}>PRE-MARKET</Text>
              {day.preMarket.map((c) => <CompanyRow key={c.ticker} company={c} />)}
            </View>
          )}

          {day.postMarket.length > 0 && (
            <View style={tab.timeBlock}>
              <Text style={tab.timeLabel}>AFTER HOURS</Text>
              {day.postMarket.map((c) => <CompanyRow key={c.ticker} company={c} />)}
            </View>
          )}

          {day.preMarket.length === 0 && day.postMarket.length === 0 && (
            <Text style={tab.emptyText}>No earnings</Text>
          )}
        </View>
      ))}
      <View style={{ height: spacing.xxxl }} />
    </ScrollView>
  );
}

// ─── Economic tab ─────────────────────────────────────────────────────────────

function EconomicTab({ days }: { days: EconomicDay[] }) {
  return (
    <ScrollView contentContainerStyle={tab.scroll} showsVerticalScrollIndicator={false}>
      {days.map((day) => (
        <View key={day.date} style={tab.economicDayBlock}>
          <Text style={tab.earningsDayLabel}>{day.date}</Text>
          <View style={tab.economicEvents}>
            {day.events.map((ev, i) => (
              <View key={i} style={tab.economicRow}>
                <View style={tab.economicDot} />
                <Text style={tab.economicText}>{ev}</Text>
              </View>
            ))}
          </View>
        </View>
      ))}
      <View style={{ height: spacing.xxxl }} />
    </ScrollView>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: 'notable',  label: 'Notable' },
  { key: 'earnings', label: 'Earnings' },
  { key: 'economic', label: 'Economic' },
];

export default function EventsScreen() {
  const params = useLocalSearchParams<{ tab?: Tab }>();
  const [active, setActive] = useState<Tab>(params.tab ?? 'notable');
  const { notable, earnings, economic } = MOCK_UPCOMING_EVENTS;

  return (
    <SafeAreaView style={s.container}>

      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={s.backBtn}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text.primary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Upcoming Events</Text>
        <View style={{ width: 38 }} />
      </View>

      {/* Tab bar */}
      <View style={s.tabBar}>
        {TABS.map((t) => (
          <TouchableOpacity
            key={t.key}
            style={[s.tabBtn, active === t.key && s.tabBtnActive]}
            onPress={() => setActive(t.key)}
            activeOpacity={0.7}
          >
            <Text style={[s.tabText, active === t.key && s.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      {active === 'notable'  && <NotableTab events={notable} />}
      {active === 'earnings' && <EarningsTab days={earnings} />}
      {active === 'economic' && <EconomicTab days={economic} />}

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
  backBtn: { width: 38, height: 44, justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: colors.text.primary },

  tabBar: {
    flexDirection: 'row', paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    gap: spacing.sm, borderBottomWidth: 0.5, borderBottomColor: colors.border.default,
  },
  tabBtn: {
    paddingHorizontal: spacing.md, paddingVertical: 7,
    borderRadius: radius.full, borderWidth: 0.5, borderColor: colors.border.default,
    minHeight: 34,
  },
  tabBtnActive: { backgroundColor: colors.accent.teal, borderColor: colors.accent.teal },
  tabText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text.secondary },
  tabTextActive: { color: '#FFFFFF' },
});

const tab = StyleSheet.create({
  scroll: { padding: spacing.xl, gap: spacing.md },

  // Notable
  notableCard: {
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.md, gap: spacing.sm,
  },
  notableTitle: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text.primary },

  bulletList: { gap: 5 },
  bulletRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  bulletDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.accent.teal, marginTop: 5, flexShrink: 0,
  },
  bulletText: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.secondary },

  // Earnings
  earningsDayBlock: {
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.md, gap: spacing.md,
  },
  earningsDayLabel: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text.muted },
  timeBlock: { gap: spacing.sm },
  timeLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.text.muted, letterSpacing: 0.5 },
  companyRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, minHeight: 36 },
  companyBadge: {
    width: 32, height: 32, borderRadius: radius.sm,
    backgroundColor: colors.bg.secondary, alignItems: 'center', justifyContent: 'center',
    borderWidth: 0.5, borderColor: colors.border.default,
  },
  companyBadgeText: { fontSize: 10, fontWeight: fontWeight.medium, color: colors.accent.tealLight },
  companyTicker: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text.primary },
  beatChip: {
    backgroundColor: colors.status.green + '20', borderRadius: radius.sm,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  beatText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.status.green },
  verdictChip: { borderRadius: radius.sm, paddingHorizontal: 8, paddingVertical: 3 },
  verdictText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium },
  emptyText: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.muted },

  // Economic
  economicDayBlock: {
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.md, gap: spacing.md,
  },
  economicEvents: { gap: 8 },
  economicRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm },
  economicDot: {
    width: 6, height: 6, borderRadius: 3,
    backgroundColor: colors.text.muted, marginTop: 5, flexShrink: 0,
  },
  economicText: { flex: 1, fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.secondary },
});
