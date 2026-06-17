import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
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
        <TouchableOpacity onPress={onAction} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={s.action}>{action}</Text>
        </TouchableOpacity>
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
    color: colors.text.muted, textTransform: 'uppercase', letterSpacing: 0.5,
  },
  action: { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: colors.accent.teal },
});
