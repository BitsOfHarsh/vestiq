import { View, ViewStyle, StyleProp } from 'react-native';
import THEME from '../../theme';
import ScalePressable from './ScalePressable';

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
      <ScalePressable style={[cardStyle, style]} onPress={onPress} scaleTo={0.95}>
        {children}
      </ScalePressable>
    );
  }

  return <View style={[cardStyle, style]}>{children}</View>;
}
