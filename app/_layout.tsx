import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import THEME from '../src/theme';

const BG = THEME.colors.bg.primary;

const IS_WEB = Platform.OS === 'web';

function AppStack() {
  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: BG }, gestureEnabled: true }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="onboarding" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="alerts" />
        <Stack.Screen name="events" />
        <Stack.Screen name="news/[id]" />
        <Stack.Screen name="congress" />
        <Stack.Screen name="insider" />
        <Stack.Screen name="reddit" />
        <Stack.Screen name="super-investors" />
        <Stack.Screen name="stock/[ticker]" />
      </Stack>
    </SafeAreaProvider>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  if (!fontsLoaded) {
    return <View style={{ flex: 1, backgroundColor: BG }} />;
  }

  if (IS_WEB) {
    return (
      <View style={{ flex: 1, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center' }}>
        <View style={{
          width: 390,
          height: '100%' as unknown as number,
          maxHeight: 844,
          overflow: 'hidden',
          backgroundColor: BG,
          // @ts-ignore web-only
          boxShadow: '0 0 0 1px rgba(255,255,255,0.08), 0 32px 80px rgba(0,0,0,0.8)',
          borderRadius: 16,
        }}>
          <AppStack />
        </View>
      </View>
    );
  }

  return <AppStack />;
}
