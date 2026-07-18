import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import ScalePressable from '../ui/ScalePressable';
import THEME from '../../theme';

const { colors, fontSize, fontWeight, radius, spacing } = THEME;

interface EmptyStateProps {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  subtitle?: string;
  buttonLabel?: string;
  onPress?: () => void;
}

export default function EmptyState({ icon, title, subtitle, buttonLabel, onPress }: EmptyStateProps) {
  return (
    <View style={s.card}>
      <Ionicons name={icon} size={40} color={colors.accent.violet} />
      <Text style={s.title}>{title}</Text>
      {subtitle && <Text style={s.subtitle}>{subtitle}</Text>}
      {buttonLabel && onPress && (
        <ScalePressable style={s.btn} onPress={onPress}>
          <Text style={s.btnText}>{buttonLabel}</Text>
        </ScalePressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: colors.bg.card, borderRadius: radius.lg,
    borderWidth: 0.5, borderColor: colors.border.default,
    padding: spacing.xl, alignItems: 'center', gap: spacing.sm,
  },
  title: { fontSize: fontSize.md, fontWeight: fontWeight.medium, color: colors.text.primary, textAlign: 'center' },
  subtitle: { fontSize: fontSize.sm, fontWeight: fontWeight.regular, color: colors.text.muted, textAlign: 'center', lineHeight: 19 },
  btn: {
    backgroundColor: colors.accent.violet, borderRadius: radius.md,
    paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: spacing.xs,
  },
  btnText: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: '#FFFFFF' },
});
