import { Stack } from 'expo-router';
import THEME from '../../src/theme';

export default function OnboardingLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        contentStyle: { backgroundColor: THEME.colors.bg.primary },
      }}
    >
      <Stack.Screen name="welcome" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="portfolio" />
      <Stack.Screen name="alerts" />
    </Stack>
  );
}
