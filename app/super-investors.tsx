import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import THEME from '../src/theme';
import ScalePressable from '../src/components/ui/ScalePressable';

const { colors, fontSize, fontWeight, fontFamily, spacing, radius } = THEME;

export default function SuperInvestorsScreen() {
  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <ScalePressable onPress={() => router.back()} style={s.backBtn} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} scaleTo={0.88}>
          <Feather name="chevron-left" size={22} color={colors.text.primary} />
        </ScalePressable>
        <Text style={s.headerTitle}>Super Investors</Text>
        <View style={{ width: 38 }} />
      </View>

      <View style={s.emptyState}>
        <Feather name="users" size={44} color={colors.text.muted} />
        <Text style={s.emptyTitle}>Coming soon</Text>
        <Text style={s.emptyDesc}>
          13F filings, hedge fund conviction plays, and top-performing investor portfolios
        </Text>
      </View>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.bg.primary },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.xl, paddingVertical: spacing.md,
    borderBottomWidth: 0.5, borderBottomColor: colors.border.default,
  },
  backBtn: { width: 38, height: 38, justifyContent: 'center' },
  headerTitle: { fontSize: fontSize.lg, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.primary },
  emptyState: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 48 },
  emptyTitle: { fontSize: fontSize.lg, fontFamily: fontFamily.medium, fontWeight: fontWeight.medium, color: colors.text.secondary },
  emptyDesc: { fontSize: fontSize.sm, fontFamily: fontFamily.regular, fontWeight: fontWeight.regular, color: colors.text.muted, textAlign: 'center', lineHeight: 20 },
});
