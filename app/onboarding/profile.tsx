import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAppStore, ExperienceLevel } from '../../src/store';
import THEME from '../../src/theme';

const { colors, fontSize, fontWeight, radius, spacing } = THEME;

const LEVELS: { key: ExperienceLevel; label: string; emoji: string; desc: string }[] = [
  { key: 'beginner',     label: 'Beginner',     emoji: '🌱', desc: 'New to investing, building my first portfolio' },
  { key: 'intermediate', label: 'Intermediate',  emoji: '📈', desc: 'I understand stocks and basic market analysis' },
  { key: 'advanced',     label: 'Advanced',      emoji: '⚡', desc: 'Active trader, comfortable with complex strategies' },
];

export default function ProfileScreen() {
  const [name,  setName]  = useState('');
  const [level, setLevel] = useState<ExperienceLevel>('beginner');
  const setProfile = useAppStore((s) => s.setProfile);

  const proceed = () => {
    setProfile({ name: name.trim() || 'Investor', experienceLevel: level });
    router.push('/onboarding/portfolio');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <SafeAreaView style={s.container}>
        <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Progress — 4 steps, step 2 active */}
          <View style={s.progressRow}>
            <View style={[s.dot, s.dotDone]} />
            <View style={[s.line, s.lineDone]} />
            <View style={[s.dot, s.dotActive]} />
            <View style={s.line} />
            <View style={s.dot} />
            <View style={s.line} />
            <View style={s.dot} />
          </View>

          <Text style={s.title}>Tell us about yourself</Text>
          <Text style={s.sub}>We'll personalise every AI analysis to match your level</Text>

          {/* Name */}
          <Text style={s.fieldLabel}>Your first name</Text>
          <TextInput
            style={s.nameInput}
            placeholder="e.g. Harsh"
            placeholderTextColor={colors.text.muted}
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            returnKeyType="done"
          />

          {/* Experience level */}
          <Text style={[s.fieldLabel, { marginTop: spacing.xl }]}>Experience level</Text>
          <View style={s.levels}>
            {LEVELS.map((opt) => {
              const active = level === opt.key;
              return (
                <TouchableOpacity
                  key={opt.key}
                  style={[s.levelCard, active && s.levelCardActive]}
                  onPress={() => setLevel(opt.key)}
                  activeOpacity={0.75}
                >
                  <Text style={s.levelEmoji}>{opt.emoji}</Text>
                  <View style={s.levelBody}>
                    <Text style={[s.levelLabel, active && s.levelLabelActive]}>{opt.label}</Text>
                    <Text style={s.levelDesc}>{opt.desc}</Text>
                  </View>
                  {active && <Ionicons name="checkmark-circle" size={20} color={colors.accent.teal} />}
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ height: spacing.xxxl }} />
        </ScrollView>

        <View style={s.footer}>
          <TouchableOpacity style={s.primaryBtn} onPress={proceed} activeOpacity={0.85}>
            <Text style={s.primaryBtnText}>Continue →</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  scroll: { paddingHorizontal: spacing.xl, paddingTop: spacing.xl },
  footer: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },

  progressRow: { flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xxxl, marginTop: spacing.sm },
  dot:       { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.border.default },
  dotDone:   { backgroundColor: colors.accent.teal },
  dotActive: { backgroundColor: colors.accent.teal, width: 10, height: 10, borderRadius: 5 },
  line:      { flex: 1, height: 1, backgroundColor: colors.border.default, marginHorizontal: 4 },
  lineDone:  { backgroundColor: colors.accent.teal },

  title: { fontSize: fontSize.xxl, fontWeight: fontWeight.medium, color: colors.text.primary, lineHeight: 34, marginBottom: spacing.sm },
  sub:   { fontSize: fontSize.md, fontWeight: fontWeight.regular, color: colors.text.secondary, lineHeight: 22, marginBottom: spacing.xl },

  fieldLabel: { fontSize: fontSize.xs, fontWeight: fontWeight.medium, color: colors.text.muted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: spacing.sm },

  nameInput: {
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default,
    paddingHorizontal: spacing.md, height: 52,
    fontSize: fontSize.lg, fontWeight: fontWeight.regular, color: colors.text.primary,
  },

  levels: { gap: spacing.sm },
  levelCard: {
    flexDirection: 'row', alignItems: 'center', gap: spacing.md,
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    padding: spacing.md, borderWidth: 0.5, borderColor: colors.border.default, minHeight: 68,
  },
  levelCardActive: { borderColor: colors.accent.teal, backgroundColor: colors.accent.teal + '12' },
  levelEmoji: { fontSize: 24, width: 32, textAlign: 'center' },
  levelBody:  { flex: 1 },
  levelLabel: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text.primary },
  levelLabelActive: { color: colors.accent.tealLight },
  levelDesc:  { fontSize: fontSize.xs, fontWeight: fontWeight.regular, color: colors.text.secondary, marginTop: 2, lineHeight: 16 },

  primaryBtn: {
    backgroundColor: colors.accent.teal, borderRadius: radius.lg,
    height: 52, alignItems: 'center', justifyContent: 'center',
  },
  primaryBtnText: { fontSize: fontSize.lg, fontWeight: fontWeight.medium, color: '#FFFFFF' },
});
