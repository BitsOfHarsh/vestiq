import { View, Text, StyleSheet } from 'react-native';
import ScalePressable from '../ui/ScalePressable';
import THEME from '../../theme';

const { colors, fontSize, fontWeight, spacing } = THEME;

interface SectionHeaderProps {
  title: string;
  action?: string;
  onAction?: () => void;
}

export default function SectionHeader({ title, action, onAction }: SectionHeaderProps) {
  return (
    <View style={s.row}>
      <Text style={s.title}>{title}</Text>
      {action && (
        <ScalePressable onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.action}>{action}</Text>
        </ScalePressable>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  row: {
    flexDirection: 'row', alignItems: 'center',
    justifyContent: 'space-between', marginBottom: spacing.xs,
  },
  title: {
    fontSize: fontSize.sm, fontWeight: fontWeight.medium,
    color: colors.text.muted, letterSpacing: 0.2,
  },
  action: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.accent.violet },
});
