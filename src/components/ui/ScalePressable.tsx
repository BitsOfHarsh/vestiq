import { useRef } from 'react';
import {
  Animated, Easing, Pressable, PressableProps,
  StyleProp, ViewStyle, GestureResponderEvent,
} from 'react-native';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

type Props = Omit<PressableProps, 'style'> & {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  scaleTo?: number;
};

export default function ScalePressable({
  children, style, scaleTo = 0.97, disabled,
  onPressIn: piprop, onPressOut: poprop,
  ...rest
}: Props) {
  const scale = useRef(new Animated.Value(1)).current;

  const pressIn = (e: GestureResponderEvent) => {
    Animated.timing(scale, {
      toValue: scaleTo, duration: 100,
      easing: Easing.out(Easing.quad), useNativeDriver: true,
    }).start();
    piprop?.(e);
  };

  const pressOut = (e: GestureResponderEvent) => {
    Animated.timing(scale, {
      toValue: 1, duration: 160,
      easing: Easing.out(Easing.quad), useNativeDriver: true,
    }).start();
    poprop?.(e);
  };

  return (
    <AnimatedPressable
      style={[{ transform: [{ scale }] }, style] as StyleProp<ViewStyle>}
      onPressIn={pressIn}
      onPressOut={pressOut}
      disabled={disabled}
      {...rest}
    >
      {children}
    </AnimatedPressable>
  );
}
