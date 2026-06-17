import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import THEME from '../src/theme';
import { APP_CONFIG } from '../src/config';

// In mock/dev mode, always show onboarding so you can test it.
// Flip FORCE_ONBOARDING to false once you're happy with the flow.
const FORCE_ONBOARDING = APP_CONFIG.USE_MOCK_DATA;

export default function Index() {
  const [ready, setReady] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (FORCE_ONBOARDING) {
      setDone(false);
      setReady(true);
      return;
    }
    AsyncStorage.getItem('vestiq_onboarding_complete').then((val) => {
      setDone(val === 'true');
      setReady(true);
    });
  }, []);

  if (!ready) return <View style={{ flex: 1, backgroundColor: THEME.colors.bg.primary }} />;
  return <Redirect href={done ? '/(tabs)/dashboard' : '/onboarding/welcome'} />;
}
