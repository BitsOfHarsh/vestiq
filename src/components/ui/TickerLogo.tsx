import { useState } from 'react';
import { Image, View, Text, StyleSheet } from 'react-native';
import THEME from '../../theme';

const { colors, fontWeight } = THEME;

interface TickerLogoProps {
  ticker: string;
  size: number;
  borderRadius?: number;
  style?: object;
}

const LOGO_URL = (ticker: string) =>
  `https://financialmodelingprep.com/image-stock/${ticker.toUpperCase()}.png`;

export default function TickerLogo({ ticker, size, borderRadius, style }: TickerLogoProps) {
  const [failed, setFailed] = useState(false);
  const br = borderRadius ?? Math.round(size * 0.22);
  const clean = (ticker ?? '').replace(/[^A-Z0-9]/gi, '').toUpperCase();

  if (!failed && clean) {
    return (
      <View style={[{ width: size, height: size, borderRadius: br, overflow: 'hidden', backgroundColor: '#FFFFFF' }, style]}>
        <Image
          source={{ uri: LOGO_URL(clean) }}
          style={{ width: size, height: size }}
          resizeMode="contain"
          onError={() => setFailed(true)}
        />
      </View>
    );
  }

  // Fallback: teal initial badge
  return (
    <View style={[fb.box, { width: size, height: size, borderRadius: br }, style]}>
      <Text style={[fb.text, { fontSize: Math.round(size * 0.3) }]}>
        {clean.slice(0, 2)}
      </Text>
    </View>
  );
}

const fb = StyleSheet.create({
  box: {
    backgroundColor: colors.bg.secondary,
    borderWidth: 0.5,
    borderColor: colors.border.default,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: { fontWeight: fontWeight.medium, color: colors.accent.teal },
});
