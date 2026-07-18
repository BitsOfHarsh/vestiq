import { useEffect, useRef } from 'react';
import { Animated, Easing, ViewStyle } from 'react-native';
import THEME from '../../theme';

interface VSkeletonProps {
  width: number | string;
  height: number;
  borderRadius?: number;
}

export default function VSkeleton({ width, height, borderRadius = THEME.radius.md }: VSkeletonProps) {
  const opacity = useRef(new Animated.Value(0.2)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.5, duration: 600,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.2, duration: 600,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
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
