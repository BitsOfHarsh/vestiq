import { View, Text, StyleSheet } from 'react-native';
import THEME from '../../theme';

type Variant = 'green' | 'red' | 'amber' | 'blue' | 'teal' | 'muted';

const VARIANT_MAP: Record<Variant, { bg: string; text: string }> = {
  green: { bg: THEME.colors.status.greenDim, text: THEME.colors.status.green },
  red: { bg: THEME.colors.status.redDim, text: THEME.colors.status.red },
  amber: { bg: THEME.colors.status.amberDim, text: THEME.colors.status.amber },
  blue: { bg: THEME.colors.status.blueDim, text: THEME.colors.status.blue },
  teal: { bg: THEME.colors.accent.brandDim, text: THEME.colors.accent.brandBright },
  muted: { bg: THEME.colors.border.subtle, text: THEME.colors.text.muted },
};

interface VBadgeProps {
  label: string;
  variant: Variant;
}

export default function VBadge({ label, variant }: VBadgeProps) {
  const { bg, text } = VARIANT_MAP[variant];
  return (
    <View style={[styles.badge, { backgroundColor: bg }]}>
      <Text style={[styles.label, { color: text }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: THEME.radius.full,
    alignSelf: 'flex-start',
  },
  label: {
    fontSize: THEME.fontSize.xs,
    fontWeight: THEME.fontWeight.medium,
    textTransform: 'capitalize',
  },
});
