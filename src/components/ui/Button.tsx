import { TouchableOpacity, View, Text, ActivityIndicator, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import THEME from '../../theme';

type Variant = 'primary' | 'secondary' | 'ghost';

interface VButtonProps {
  label: string;
  onPress: () => void;
  variant?: Variant;
  loading?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  fullWidth?: boolean;
}

export default function VButton({
  label,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
}: VButtonProps) {
  const isDisabled = disabled || loading;

  const containerStyle: StyleProp<ViewStyle> = [
    styles.base,
    variant === 'primary' && styles.primary,
    variant === 'secondary' && styles.secondary,
    variant === 'ghost' && styles.ghost,
    fullWidth && styles.fullWidth,
    isDisabled && styles.disabled,
  ];

  const textColor =
    variant === 'primary'
      ? THEME.colors.text.primary
      : variant === 'ghost'
      ? THEME.colors.accent.tealLight
      : THEME.colors.text.primary;

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.75}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColor} />
      ) : (
        <View style={styles.inner}>
          {icon && <View style={styles.icon}>{icon}</View>}
          <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 44,
    borderRadius: THEME.radius.md,
    paddingHorizontal: THEME.spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: {
    backgroundColor: THEME.colors.accent.teal,
  },
  secondary: {
    backgroundColor: THEME.colors.bg.card,
    borderWidth: THEME.border.width,
    borderColor: THEME.colors.border.default,
  },
  ghost: {
    backgroundColor: 'transparent',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.4,
  },
  inner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: THEME.spacing.sm,
  },
  icon: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: THEME.fontSize.md,
    fontWeight: THEME.fontWeight.medium,
  },
});
