import { View, ViewStyle } from 'react-native';
import THEME from '../../theme';

interface VDividerProps {
  style?: ViewStyle;
}

export default function VDivider({ style }: VDividerProps) {
  return (
    <View
      style={[
        {
          height: 0.5,
          backgroundColor: THEME.colors.border.default,
        },
        style,
      ]}
    />
  );
}
