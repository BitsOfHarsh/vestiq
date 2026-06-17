import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAppStore } from '../../src/store';
import THEME from '../../src/theme';

const { colors, fontSize, fontWeight, radius, spacing } = THEME;

const LEVELS = [
  { label: 'STOP',     price: '$539', color: colors.status.red },
  { label: 'ENTRY',    price: '$558', color: colors.status.green },
  { label: 'TARGET 1', price: '$620', color: colors.status.amber },
  { label: 'TARGET 2', price: '$829', color: colors.status.blue },
];

async function complete(setDone: () => void) {
  await AsyncStorage.setItem('vestiq_onboarding_complete', 'true');
  setDone();
  router.replace('/(tabs)/dashboard');
}

export default function AlertsOnboardingScreen() {
  const setOnboardingComplete = useAppStore((s) => s.setOnboardingComplete);

  const activate = () => complete(setOnboardingComplete);
  const skip     = () => complete(setOnboardingComplete);

  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>

        {/* Progress — 4 steps, step 4 active */}
        <View style={s.progressRow}>
          <View style={[s.progressDot, s.progressDotDone]} />
          <View style={[s.progressLine, s.progressLineDone]} />
          <View style={[s.progressDot, s.progressDotDone]} />
          <View style={[s.progressLine, s.progressLineDone]} />
          <View style={[s.progressDot, s.progressDotDone]} />
          <View style={[s.progressLine, s.progressLineDone]} />
          <View style={[s.progressDot, s.progressDotActive]} />
        </View>

        {/* Header */}
        <Text style={s.title}>Never miss the right price</Text>
        <Text style={s.sub}>
          Vestiq calculates your buy zone, stop loss, and targets automatically
        </Text>

        {/* Demo card */}
        <View style={s.demoCard}>
          {/* Stock header */}
          <View style={s.demoHeader}>
            <View style={s.demoBadge}>
              <Text style={s.demoBadgeText}>ME</Text>
            </View>
            <View style={s.demoMeta}>
              <Text style={s.demoTicker}>META</Text>
              <Text style={s.demoName}>Meta Platforms</Text>
            </View>
            <View style={s.demoPriceCol}>
              <Text style={s.demoPrice}>$566.98</Text>
              <Text style={s.demoChange}>+0.26%</Text>
            </View>
          </View>

          {/* Level chips */}
          <View style={s.levelRow}>
            {LEVELS.map(({ label, price, color }) => (
              <View key={label} style={[s.levelChip, { borderColor: color + '50', backgroundColor: color + '12' }]}>
                <Text style={[s.levelLabel, { color }]}>{label}</Text>
                <Text style={[s.levelPrice, { color }]}>{price}</Text>
              </View>
            ))}
          </View>

          {/* R/R */}
          <View style={s.rrRow}>
            <Text style={s.rrText}>Risk/Reward: </Text>
            <Text style={s.rrValue}>4.9x</Text>
            <Text style={s.rrBadge}> — Excellent</Text>
          </View>
        </View>

        {/* Mock iOS notification */}
        <View style={s.notifCard}>
          <View style={s.notifTopRow}>
            <View style={s.notifIcon}>
              <Text style={s.notifIconText}>V</Text>
            </View>
            <Text style={s.notifApp}>Vestiq</Text>
            <Text style={s.notifTime}>now</Text>
          </View>
          <Text style={s.notifTitle}>META hit your entry zone — $558</Text>
          <Text style={s.notifBody}>R/R 4.9x · Consider buying · Analyst upside 46%</Text>
        </View>

        <View style={s.spacer} />

      </View>

      {/* Footer */}
      <View style={s.footer}>
        <TouchableOpacity style={s.primaryBtn} onPress={activate} activeOpacity={0.85}>
          <Text style={s.primaryBtnText}>Activate alerts →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.skipLink} onPress={skip} hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}>
          <Text style={s.skipLinkText}>Skip for now</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  content: { flex: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, gap: spacing.xs },

  // Progress
  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xxxl, marginTop: spacing.sm },
  progressDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border.default },
  progressDotDone: { backgroundColor: colors.accent.teal },
  progressDotActive: { backgroundColor: colors.accent.teal, width: 10, height: 10, borderRadius: 5 },
  progressLine: { flex: 1, height: 1, backgroundColor: colors.border.default, marginHorizontal: 4 },
  progressLineDone: { backgroundColor: colors.accent.teal },

  // Copy
  title: {
    fontSize: fontSize.xxl, fontWeight: fontWeight.medium,
    color: colors.text.primary, lineHeight: 34, marginBottom: spacing.sm,
  },
  sub: {
    fontSize: fontSize.md, fontWeight: fontWeight.regular,
    color: colors.text.secondary, lineHeight: 22, marginBottom: spacing.xl,
  },

  // Demo card
  demoCard: {
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 0.5, borderColor: colors.accent.teal,
    gap: spacing.md, marginBottom: spacing.md,
  },
  demoHeader: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  demoBadge: {
    width: 36, height: 36, borderRadius: radius.sm,
    backgroundColor: colors.accent.tealDim, alignItems: 'center', justifyContent: 'center',
  },
  demoBadgeText: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.accent.tealLight },
  demoMeta: { flex: 1 },
  demoTicker: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text.primary },
  demoName: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.muted },
  demoPriceCol: { alignItems: 'flex-end' },
  demoPrice: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text.primary },
  demoChange: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.status.green },

  // Level chips — 2×2 grid
  levelRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  levelChip: {
    width: '47%', borderRadius: radius.md, padding: spacing.sm,
    borderWidth: 0.5, alignItems: 'flex-start',
  },
  levelLabel: { fontSize: 9, fontWeight: fontWeight.medium, letterSpacing: 0.5, marginBottom: 2 },
  levelPrice: { fontSize: fontSize.lg, fontWeight: fontWeight.medium },

  // R/R
  rrRow: { flexDirection: 'row', alignItems: 'center' },
  rrText: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.secondary },
  rrValue: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.status.green },
  rrBadge: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.status.green },

  // Mock notification
  notifCard: {
    backgroundColor: '#2A2A2A', borderRadius: radius.xl,
    padding: spacing.md, gap: 4,
    borderWidth: 0.5, borderColor: 'rgba(255,255,255,0.1)',
  },
  notifTopRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs, marginBottom: 2 },
  notifIcon: {
    width: 18, height: 18, borderRadius: 4,
    backgroundColor: colors.accent.teal, alignItems: 'center', justifyContent: 'center',
  },
  notifIconText: { fontSize: 9, fontWeight: fontWeight.medium, color: '#FFFFFF' },
  notifApp: { flex: 1, fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.text.secondary },
  notifTime: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.muted },
  notifTitle: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.text.primary },
  notifBody: { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.secondary, lineHeight: 16 },

  spacer: { flex: 1 },

  // Buttons
  primaryBtn: {
    backgroundColor: colors.accent.teal, borderRadius: radius.lg,
    height: 52, alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: '#FFFFFF' },
  skipLink: { alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  skipLinkText: { fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.text.muted },
});
