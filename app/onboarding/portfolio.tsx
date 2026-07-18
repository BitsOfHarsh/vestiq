import { useState } from 'react';
import { View, Text, StyleSheet, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAppStore } from '../../src/store';
import THEME from '../../src/theme';
import ScalePressable from '../../src/components/ui/ScalePressable';

const { colors, fontSize, fontWeight, fontFamily, radius, spacing } = THEME;

type MarketKey = 'us' | 'india' | 'both';

interface MarketOption {
  key: MarketKey;
  flag: string;
  title: string;
  sub: string;
  badge?: string;
}

const MARKETS: MarketOption[] = [
  { key: 'us',    flag: '🇺🇸', title: 'US Stocks',     sub: 'NYSE & NASDAQ' },
  { key: 'india', flag: '🇮🇳', title: 'Indian Stocks',  sub: 'NSE & BSE',       badge: 'MOST POPULAR' },
  { key: 'both',  flag: '✦',   title: 'Both',           sub: 'Recommended' },
];

const COUNTRY_MAP: Record<MarketKey, string> = { us: 'US', india: 'IN', both: 'BOTH' };

export default function MarketScreen() {
  const [selected, setSelected] = useState<MarketKey>('india');
  const setCountry = useAppStore((s) => s.setCountry);

  const proceed = () => {
    setCountry(COUNTRY_MAP[selected]);
    router.push('/onboarding/alerts');
  };

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>

        {/* Progress — 4 steps, step 3 active */}
        <View style={s.progressRow}>
          <View style={[s.progressDot, s.progressDotDone]} />
          <View style={[s.progressLine, s.progressLineDone]} />
          <View style={[s.progressDot, s.progressDotDone]} />
          <View style={[s.progressLine, s.progressLineDone]} />
          <View style={[s.progressDot, s.progressDotActive]} />
          <View style={s.progressLine} />
          <View style={s.progressDot} />
        </View>

        <Text style={s.title}>What are you investing in?</Text>
        <Text style={s.sub}>Vestiq works with both US and Indian markets</Text>

        {/* Market options */}
        <View style={s.options}>
          {MARKETS.map((opt) => {
            const active = selected === opt.key;
            return (
              <ScalePressable
                key={opt.key}
                style={[s.optionCard, active && s.optionCardActive]}
                onPress={() => setSelected(opt.key)}
                scaleTo={0.95}
              >
                <Text style={s.optionFlag}>{opt.flag}</Text>
                <View style={s.optionBody}>
                  <View style={s.optionTitleRow}>
                    <Text style={[s.optionTitle, active && s.optionTitleActive]}>{opt.title}</Text>
                    {opt.badge && (
                      <View style={s.popularBadge}>
                        <Text style={s.popularBadgeText}>{opt.badge}</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.optionSub}>{opt.sub}</Text>
                </View>
                {active && <Feather name="check-circle" size={20} color={colors.accent.brand} />}
              </ScalePressable>
            );
          })}
        </View>

        {/* INDMoney sync row (coming soon) */}
        <View style={s.syncRow}>
          <View style={s.syncLeft}>
            <Text style={s.syncTitle}>Sync from INDMoney</Text>
            <Text style={s.syncSub}>Import your portfolio automatically</Text>
          </View>
          <View style={s.syncRight}>
            <Text style={s.comingSoon}>Coming soon</Text>
            <Switch
              value={false}
              disabled
              trackColor={{ false: colors.bg.secondary, true: colors.accent.brand }}
              thumbColor={colors.text.muted}
            />
          </View>
        </View>

        {/* Manual setup link */}
        <ScalePressable style={s.manualLink} onPress={proceed} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.manualLinkText}>I'll add stocks manually</Text>
        </ScalePressable>

      </View>

      {/* Continue */}
      <View style={s.footer}>
        <ScalePressable style={s.primaryBtn} onPress={proceed} scaleTo={0.98}>
          <Text style={s.primaryBtnText}>Continue →</Text>
        </ScalePressable>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  content: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },

  // Progress bar
  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xxxl, marginTop: spacing.sm },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border.default },
  progressDotDone: { backgroundColor: colors.accent.brand },
  progressDotActive: { backgroundColor: colors.accent.brand, width: 10, height: 10, borderRadius: 5 },
  progressLine: { flex: 1, height: 1, backgroundColor: colors.border.default, marginHorizontal: 4 },
  progressLineDone: { backgroundColor: colors.accent.brand },

  // Copy
  title: {
    fontSize: fontSize.xxl, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium,
    color: colors.text.primary, lineHeight: 34, marginBottom: spacing.sm,
  },
  sub: {
    fontSize: fontSize.md, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular,
    color: colors.text.secondary, lineHeight: 22, marginBottom: spacing.xl,
  },

  // Options
  options: { gap: spacing.sm, marginBottom: spacing.lg },
  optionCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 0.5, borderColor: colors.border.default, minHeight: 64,
  },
  optionCardActive: { borderColor: colors.accent.brand, backgroundColor: colors.accent.brandDim },
  optionFlag: { fontSize: 28 },
  optionBody: { flex: 1 },
  optionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  optionTitle: { fontSize: fontSize.md, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  optionTitleActive: { color: colors.accent.brandBright },
  optionSub: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.secondary, marginTop: 2 },
  popularBadge: { backgroundColor: colors.status.amber + '20', paddingHorizontal: 6, paddingVertical: 2, borderRadius: radius.sm },
  popularBadgeText: { fontSize: 9, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.status.amber },

  // Sync row
  syncRow: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 0.5, borderColor: colors.border.default,
    opacity: 0.5, marginBottom: spacing.md,
  },
  syncLeft: { flex: 1 },
  syncTitle: { fontSize: fontSize.md, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  syncSub: { fontSize: fontSize.xs, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted, marginTop: 2 },
  syncRight: { alignItems: 'flex-end', gap: 4 },
  comingSoon: { fontSize: 9, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.5 },

  // Manual link
  manualLink: { alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  manualLinkText: { fontSize: fontSize.sm, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.muted },

  // Primary button
  primaryBtn: {
    backgroundColor: colors.accent.brand, borderRadius: radius.lg,
    height: 52, alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { fontSize: fontSize.lg, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: '#FFFFFF' },
});
