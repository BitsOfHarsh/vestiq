import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import THEME from '../../src/theme';

const { colors, fontSize, fontWeight, radius, spacing } = THEME;

const FEATURES: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }[] = [
  { icon: 'trending-up-outline',    text: 'Know exactly when to buy, hold or sell' },
  { icon: 'notifications-outline',  text: 'Get alerted the moment price hits your level' },
  { icon: 'newspaper-outline',      text: 'Turn any headline into a trade idea instantly' },
];

const proceed = () => router.push('/onboarding/profile');

export default function WelcomeScreen() {
  return (
    <SafeAreaView style={s.container}>
      <View style={s.content}>

        {/* Logo */}
        <View style={s.logoRow}>
          <View style={s.logoCircle}>
            <Text style={s.logoV}>V</Text>
          </View>
          <Text style={s.logoWord}>VESTIQ</Text>
        </View>

        {/* Hero copy */}
        <Text style={s.tagline}>Your AI investing co-pilot</Text>
        <Text style={s.sub}>Built for investors who want clarity, not confusion</Text>

        {/* Feature rows */}
        <View style={s.features}>
          {FEATURES.map(({ icon, text }) => (
            <View key={text} style={s.featureRow}>
              <View style={s.featureIconWrap}>
                <Ionicons name={icon} size={18} color={colors.accent.teal} />
              </View>
              <Text style={s.featureText}>{text}</Text>
            </View>
          ))}
        </View>

        <View style={s.spacer} />

        {/* CTA */}
        <TouchableOpacity style={s.primaryBtn} onPress={proceed} activeOpacity={0.85}>
          <Text style={s.primaryBtnText}>Get started →</Text>
        </TouchableOpacity>
        <TouchableOpacity style={s.skipLink} onPress={proceed} hitSlop={{ top: 12, bottom: 12, left: 24, right: 24 }}>
          <Text style={s.skipLinkText}>I'll set up later</Text>
        </TouchableOpacity>

      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  content: {
    flex: 1, paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxxl + spacing.xl, paddingBottom: spacing.xl,
  },

  // Logo row
  logoRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.xxxl },
  logoCircle: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: colors.accent.teal, alignItems: 'center', justifyContent: 'center',
  },
  logoV: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: '#FFFFFF' },
  logoWord: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: colors.text.primary, letterSpacing: 3 },

  // Hero
  tagline: {
    fontSize: fontSize.xxl, fontWeight: fontWeight.medium,
    color: colors.text.primary, lineHeight: 34, marginBottom: spacing.sm,
  },
  sub: {
    fontSize: fontSize.md, fontWeight: fontWeight.regular,
    color: colors.text.secondary, lineHeight: 22, marginBottom: spacing.xxxl,
  },

  // Features
  features: { gap: spacing.lg },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  featureIconWrap: {
    width: 36, height: 36, borderRadius: radius.md,
    backgroundColor: colors.accent.tealDim, alignItems: 'center', justifyContent: 'center',
  },
  featureText: {
    flex: 1, fontSize: fontSize.md, fontWeight: fontWeight.regular,
    color: colors.text.primary, lineHeight: 21,
  },

  spacer: { flex: 1 },

  // Buttons
  primaryBtn: {
    backgroundColor: colors.accent.teal, borderRadius: radius.lg,
    height: 52, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.md,
  },
  primaryBtnText: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: '#FFFFFF' },
  skipLink: { alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  skipLinkText: { fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.text.muted },
});
