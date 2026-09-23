import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCalendars, getLocales } from 'expo-localization';
import { I18n } from 'i18n-js';
import React, { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';
import ar from './locale/ar.json';
import en from './locale/en.json';
import tr from './locale/tr.json';
import fa from './locale/fa.json';

export type LocaleCode = 'ar' | 'en' | 'tr' | 'fa';
const LOCALE_KEY = 'ateek.locale.v2';
const LOCALE_BOOTSTRAP_TIMEOUT_MS = 2500;
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

function deviceLocale(): LocaleCode {
  try {
    return normalize(getLocales()[0]?.languageCode);
  } catch {
    return 'ar';
  }
}

function persistedLocale(code?: string | null): LocaleCode | null {
  if (!code) return null;
  const v = code.trim().toLowerCase();
  return v === 'ar' || v === 'en' || v === 'tr' || v === 'fa' ? v : null;
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
  // Calendar preference is stable for the lifetime of this provider. Keep the
  // native lookup off the render hot path and degrade safely if the platform
  // localization module cannot provide calendar metadata.
  const calendar = useMemo(() => {
    try {
      return getCalendars()[0]?.calendar;
    } catch {
      return undefined;
    }
  }, []);

  const apply = useCallback(async (next: LocaleCode, persist = true) => {
    const start = globalThis.performance?.now?.() ?? Date.now();
    let elapsed = 0;
    setSwitching(true);
    I18nManager.allowRTL(true);
    i18n.locale = next;
    setLocaleState(next);
    try {
      // Locale switching is a runtime preference and must remain usable when
      // device storage is temporarily unavailable. Persistence is best-effort;
      // the selected locale remains active for the current app session.
      if (persist) await AsyncStorage.setItem(LOCALE_KEY, next).catch(() => undefined);
    } finally {
      elapsed = (globalThis.performance?.now?.() ?? Date.now()) - start;
      setLastSwitchMs(elapsed);
      setSwitching(false);
      if (__DEV__) console.info(`[ATEEK i18n] switch=${next} elapsed=${elapsed.toFixed(2)}ms rtl=${RTL.has(next)}`);
    }
    return elapsed;
  }, []);

  useEffect(() => {
    let active = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    // Resolve storage failures to the same safe fallback path as a timeout. A
    // rejected AsyncStorage read must not strand bootstrap on the hard-coded
    // Arabic initial state when the device locale is another supported locale.
    const storageRead = AsyncStorage.getItem(LOCALE_KEY).catch(() => null);
    const timeout = new Promise<null>(resolve => {
      timeoutId = setTimeout(() => resolve(null), LOCALE_BOOTSTRAP_TIMEOUT_MS);
    });
    void Promise.race([storageRead, timeout]).then(storedRaw => {
      if (timeoutId) clearTimeout(timeoutId);
      if (!active) return;
      // Persisted locale is app-owned state, so accept only exact supported
      // values. Corrupt/stale values must fall back to the device locale rather
      // than silently forcing Arabic through normalize().
      const stored = persistedLocale(storedRaw);
      const detected = stored ?? deviceLocale();
      i18n.locale = detected;
      I18nManager.allowRTL(true);
      setLocaleState(detected);
      setReady(true);
    }).catch(() => {
      if (timeoutId) clearTimeout(timeoutId);
      if (!active) return;
      const detected = deviceLocale();
      i18n.locale = detected;
      I18nManager.allowRTL(true);
      setLocaleState(detected);
      setReady(true);
    });
    return () => {
      active = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, []);

  const isRTL = RTL.has(locale);
  const localeTag = locale === 'ar' ? 'ar-IQ' : locale === 'fa' ? 'fa-IR' : locale === 'tr' ? 'tr-TR' : 'en-US';
  const value = useMemo<Ctx>(() => ({
    locale,
    isRTL,
    direction: isRTL ? 'rtl' : 'ltr',
    ready,
    switching,
    lastSwitchMs,
    // Re-selecting the active locale is a no-op. Avoid an unnecessary storage
    // write, switching state churn and downstream renders on repeated taps.
    setLocale: next => next === locale ? Promise.resolve(0) : apply(next),
    t: (key, options) => String(i18n.t(key, options)),
    // Do not surface NaN/Infinity from malformed API or derived values into
    // production UI. Finite values retain the exact locale-aware formatting.
    formatNumber: value => Number.isFinite(value) ? new Intl.NumberFormat(localeTag).format(value) : '',
    formatDate: value => {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      try {
        return new Intl.DateTimeFormat(localeTag, { dateStyle: 'medium', calendar: calendar || undefined }).format(date);
      } catch {
        // Native calendar identifiers can vary by Android/ICU version. A valid
        // date must remain renderable even if Intl does not recognize the
        // platform-provided calendar identifier.
        return new Intl.DateTimeFormat(localeTag, { dateStyle: 'medium' }).format(date);
      }
    },
  }), [apply, calendar, isRTL, lastSwitchMs, locale, localeTag, ready, switching]);
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside LocaleProvider');
  return ctx;
}
