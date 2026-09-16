import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCalendars, getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';
import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { AppState, I18nManager } from 'react-native';
import ar from './locale/ar.json';
import en from './locale/en.json';
import tr from './locale/tr.json';
import fa from './locale/fa.json';

export type LocaleCode = 'ar' | 'en' | 'tr' | 'fa';
const LOCALE_KEY = 'ateek.locale.v2';
const RTL = new Set<LocaleCode>(['ar', 'fa']);
const catalogs = { ar, en, tr, fa } as const;
const i18n = new I18n(catalogs);
i18n.defaultLocale = 'ar';
i18n.enableFallback = true;

function normalize(code?: string | null): LocaleCode {
  const v = (code ?? '').toLowerCase();
  if (v.startsWith('fa')) return 'fa';
  if (v.startsWith('tr')) return 'tr';
  if (v.startsWith('en')) return 'en';
  return 'ar';
}

type Ctx = {
  locale: LocaleCode;
  isRTL: boolean;
  direction: 'rtl' | 'ltr';
  ready: boolean;
  switching: boolean;
  lastSwitchMs: number | null;
  setLocale: (locale: LocaleCode) => Promise<number>;
  t: (key: string, options?: Record<string, unknown>) => string;
  formatNumber: (value: number) => string;
  formatDate: (value: Date | string | number) => string;
};
const LocaleContext = createContext<Ctx | null>(null);

export function LocaleProvider({ children }: PropsWithChildren) {
  const [locale, setLocaleState] = useState<LocaleCode>('ar');
  const [ready, setReady] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [lastSwitchMs, setLastSwitchMs] = useState<number | null>(null);

  const apply = useCallback(async (next: LocaleCode, persist = true) => {
    const start = globalThis.performance?.now?.() ?? Date.now();
    setSwitching(true);
    I18nManager.allowRTL(true);
    i18n.locale = next;
    setLocaleState(next);
    if (persist) await AsyncStorage.setItem(LOCALE_KEY, next);
    const elapsed = (globalThis.performance?.now?.() ?? Date.now()) - start;
    setLastSwitchMs(elapsed);
    setSwitching(false);
    if (__DEV__) console.info(`[ATEEK i18n] switch=${next} elapsed=${elapsed.toFixed(2)}ms rtl=${RTL.has(next)}`);
    return elapsed;
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      const storedRaw = await AsyncStorage.getItem(LOCALE_KEY);
      const detected = storedRaw ? normalize(storedRaw) : normalize(getLocales()[0]?.languageCode);
      if (!active) return;
      i18n.locale = detected;
      I18nManager.allowRTL(true);
      setLocaleState(detected);
      setReady(true);
    })().catch(() => setReady(true));
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      if (state !== 'active') return;
      const system = normalize(getLocales()[0]?.languageCode);
      void Promise.resolve(system);
    });
    return () => sub.remove();
  }, []);

  const isRTL = RTL.has(locale);
  const localeTag = locale === 'ar' ? 'ar-IQ' : locale === 'fa' ? 'fa-IR' : locale === 'tr' ? 'tr-TR' : 'en-US';
  const calendar = getCalendars()[0]?.calendar;
  const value = useMemo<Ctx>(() => ({
    locale,
    isRTL,
    direction: isRTL ? 'rtl' : 'ltr',
    ready,
    switching,
    lastSwitchMs,
    setLocale: next => apply(next),
    t: (key, options) => String(i18n.t(key, options)),
    formatNumber: value => new Intl.NumberFormat(localeTag).format(value),
    formatDate: value => new Intl.DateTimeFormat(localeTag, { dateStyle: 'medium', calendar: calendar || undefined }).format(new Date(value)),
  }), [apply, calendar, isRTL, lastSwitchMs, locale, localeTag, ready, switching]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside LocaleProvider');
  return ctx;
}
