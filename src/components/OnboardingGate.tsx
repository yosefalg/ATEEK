import AsyncStorage from '@react-native-async-storage/async-storage';
import { PropsWithChildren, useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { ui } from '../theme/tokens';

const KEY = 'ateek.onboarding.production.v21';

export function OnboardingGate({ children }: PropsWithChildren) {
  const [done, setDone] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    AsyncStorage.getItem(KEY).then((v) => { if (alive) setDone(v === '1'); }).catch(() => { if (alive) setDone(false); });
    return () => { alive = false; };
  }, []);
  const complete = () => {
    setDone(true);
    void AsyncStorage.setItem(KEY, '1');
  };
  if (done === null) return <View style={{ flex: 1, backgroundColor: ui.colors.background, justifyContent: 'center' }}><ActivityIndicator color={ui.colors.accent} /></View>;
  if (!done) return <OnboardingScreen onDone={complete} />;
  return children;
}
