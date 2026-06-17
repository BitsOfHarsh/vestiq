import { Text, TextStyle, StyleProp } from 'react-native';
import THEME from '../../theme';

type Size = keyof typeof THEME.fontSize;
type Weight = keyof typeof THEME.fontWeight;
type Color = 'primary' | 'secondary' | 'muted' | 'teal' | 'green' | 'red' | 'amber';

const COLOR_MAP: Record<Color, string> = {
  primary: THEME.colors.text.primary,
  secondary: THEME.colors.text.secondary,
  muted: THEME.colors.text.muted,
  teal: THEME.colors.accent.tealLight,
  green: THEME.colors.status.green,
  red: THEME.colors.status.red,
  amber: THEME.colors.status.amber,
};

interface VTextProps {
  children: React.ReactNode;
  size?: Size;
  weight?: Weight;
  color?: Color;
  style?: StyleProp<TextStyle>;
  numberOfLines?: number;
}

export default function VText({
  children,
  size = 'base',
  weight = 'regular',
  color = 'primary',
  style,
  numberOfLines,
}: VTextProps) {
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        {
          fontSize: THEME.fontSize[size],
          fontWeight: THEME.fontWeight[weight],
          color: COLOR_MAP[color],
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}
