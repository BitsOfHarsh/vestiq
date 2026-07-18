import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import THEME from '../../src/theme';
import ScalePressable from '../../src/components/ui/ScalePressable';

const { colors, fontSize, fontWeight, fontFamily, radius, spacing } = THEME;

const FEATURES: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string; sub: string }[] = [
  { icon: 'trending-up-outline',   text: 'Know when to act',        sub: 'AI signals for buy, hold, and sell decisions' },
  { icon: 'notifications-outline', text: 'Never miss a level',      sub: 'Alerts the moment price hits your target' },
  { icon: 'flash-outline',         text: 'Headline to trade idea',  sub: 'One tap turns any news into an actionable plan' },
];

const proceed = () => router.push('/onboarding/profile');

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>

        {/* Top — wordmark */}
        <View style={s.top}>
          <View style={s.logoRow}>
            <View style={s.logoPip} />
            <Text style={s.logoWord}>VESTIQ</Text>
          </View>

          <View style={s.heroBlock}>
            <Text style={s.tagline}>Your edge{'\n'}in the market.</Text>
            <Text style={s.sub}>Built for investors who want clarity, not confusion.</Text>
          </View>
        </View>

        {/* Middle — features */}
        <View style={s.features}>
          {FEATURES.map(({ icon, text, sub }) => (
            <View key={text} style={s.featureRow}>
              <View style={s.featureIconWrap}>
                <Ionicons name={icon} size={20} color={colors.accent.violet} />
              </View>
              <View style={s.featureTextBlock}>
                <Text style={s.featureTitle}>{text}</Text>
                <Text style={s.featureSub}>{sub}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Bottom — CTA */}
        <View style={s.bottom}>
          <ScalePressable style={s.primaryBtn} onPress={proceed} scaleTo={0.97}>
            <Text style={s.primaryBtnText}>Get started</Text>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </ScalePressable>
          <ScalePressable
            style={s.skipLink}
            onPress={proceed}
            hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}
          >
            <Text style={s.skipLinkText}>I'll set up later</Text>
          </ScalePressable>
        </View>

      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.lg,
    justifyContent: 'space-between',
  },

  // ── Top ──────────────────────────────────────────────────────────────────────
  top: { gap: spacing.xxxl },

  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  logoPip: {
    width: 8, height: 8, borderRadius: 2,
    backgroundColor: colors.accent.violet,
  },
  logoWord: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.semibold,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
    letterSpacing: 4,
  },

  heroBlock: { gap: spacing.md },
  tagline: {
    fontSize: 38,
    fontFamily: fontFamily.bold,
    fontWeight: fontWeight.bold,
    color: colors.text.primary,
    lineHeight: 46,
    letterSpacing: -0.5,
  },
  sub: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.regular,
    fontWeight: fontWeight.regular,
    color: colors.text.secondary,
    lineHeight: 22,
  },

  // ── Features ─────────────────────────────────────────────────────────────────
  features: { gap: spacing.xl },
  featureRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  featureIconWrap: {
    width: 40, height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.bg.card,
    borderWidth: 0.5,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  featureTextBlock: { flex: 1, gap: 3 },
  featureTitle: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.semibold,
    fontWeight: fontWeight.semibold,
    color: colors.text.primary,
  },
  featureSub: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    fontWeight: fontWeight.regular,
    color: colors.text.muted,
    lineHeight: 18,
  },

  // ── Bottom ────────────────────────────────────────────────────────────────────
  bottom: { gap: spacing.sm },
  primaryBtn: {
    backgroundColor: colors.accent.violet,
    borderRadius: radius.md,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  primaryBtnText: {
    fontSize: fontSize.md,
    fontFamily: fontFamily.semibold,
    fontWeight: fontWeight.semibold,
    color: '#FFFFFF',
  },
  skipLink: { alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  skipLinkText: {
    fontSize: fontSize.sm,
    fontFamily: fontFamily.regular,
    fontWeight: fontWeight.regular,
    color: colors.text.muted,
  },
});
