import AsyncStorage from '@react-native-async-storage/async-storage';
import { PropsWithChildren, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { ui } from '../theme/tokens';

const KEY = 'ateek.onboarding.production.v21';
const INITIAL_READ_TIMEOUT_MS = 2500;

export function OnboardingGate({ children }: PropsWithChildren) {
  const [done, setDone] = useState<boolean | null>(null);
  const completionWriteRef = useRef<Promise<void> | null>(null);
  useEffect(() => {
    let alive = true;
    let settled = false;
    const settleInitialRead = (value: boolean) => {
      if (!alive || settled) return;
      settled = true;
      clearTimeout(fallback);
      setDone(value);
    };
    const fallback = setTimeout(() => settleInitialRead(false), INITIAL_READ_TIMEOUT_MS);
    AsyncStorage.getItem(KEY)
      .then((v) => settleInitialRead(v === '1'))
      .catch(() => settleInitialRead(false));
    return () => {
      alive = false;
      clearTimeout(fallback);
    };
  }, []);
  const complete = () => {
    setDone(true);
    if (completionWriteRef.current) return;
    const persistCompletion = async () => {
      try {
        await AsyncStorage.setItem(KEY, '1');
      } catch {
        try {
          await AsyncStorage.setItem(KEY, '1');
        } catch {
          // Keep onboarding completion non-blocking for the current session.
        }
      }
    };
    const write = persistCompletion()
      .finally(() => { if (completionWriteRef.current === write) completionWriteRef.current = null; });
    completionWriteRef.current = write;
  };
  if (done === null) return <View style={{ flex: 1, backgroundColor: ui.colors.background, justifyContent: 'center' }} accessibilityState={{ busy: true }}><ActivityIndicator accessible accessibilityRole="progressbar" accessibilityLabel="جارٍ تجهيز عتيك" accessibilityLiveRegion="polite" color={ui.colors.accent} /></View>;
  if (!done) return <OnboardingScreen onDone={complete} />;
  return children;
}
