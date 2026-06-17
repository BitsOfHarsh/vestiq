import { useEffect, useRef } from 'react';
import { Animated, ViewStyle } from 'react-native';
import THEME from '../../theme';

interface VSkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
}

export default function VSkeleton({ width, height, borderRadius = THEME.radius.md }: VSkeletonProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 700, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 700, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, [opacity]);

  const style: ViewStyle = {
    width: width as number,
    height,
    borderRadius,
    backgroundColor: THEME.colors.bg.elevated,
  };

  return <Animated.View style={[style, { opacity }]} />;
}
