import { TouchableOpacity, View, ViewStyle, StyleProp } from 'react-native';
import THEME from '../../theme';

interface VCardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  onPress?: () => void;
  padding?: number;
}

export default function VCard({ children, style, onPress, padding = 16 }: VCardProps) {
  const cardStyle: ViewStyle = {
    backgroundColor: THEME.colors.bg.card,
    borderRadius: THEME.radius.lg,
    borderWidth: THEME.border.width,
    borderColor: THEME.colors.border.default,
    padding,
  };

  if (onPress) {
    return (
      <TouchableOpacity style={[cardStyle, style]} onPress={onPress} activeOpacity={0.75}>
        {children}
      </TouchableOpacity>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
}
