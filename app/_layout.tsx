import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import THEME from '../src/theme';

const BG = THEME.colors.bg.primary;

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: BG } }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="alerts" />
        <Stack.Screen name="events" />
        <Stack.Screen name="news" />
        <Stack.Screen name="congress" />
        <Stack.Screen name="insider" />
        <Stack.Screen name="reddit" />
        <Stack.Screen name="super-investors" />
        <Stack.Screen name="stock" />
      </Stack>
    </SafeAreaProvider>
  );
}
