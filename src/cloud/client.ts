import 'react-native-url-polyfill/auto';
import { createClient, processLock } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';
export const PROJECT_URL = 'https://aoftmiajhujveahjqlct.supabase.co';
// Publishable key, intended for mobile clients. Authorization is enforced by RLS/RPC.
export const PUBLIC_KEY = 'sb_publishable_WRrrrMpgaFmM3ikNJxYHtA_l9-RO0cP';
type Index = { version: string; count: number };
const index = async (key: string): Promise<Index | null> => {
  const raw = await SecureStore.getItemAsync(key);
  if (!raw) return null;
  const v = JSON.parse(raw);
  if (typeof v.version !== 'string' || !Number.isInteger(v.count) || v.count < 1 || v.count > 100) throw new Error('تعذّر قراءة الجلسة');
  return v;
};
const storage = {
  async getItem(key: string) {
    const v = await index(key); if (!v) return null;
    const parts = await Promise.all(Array.from({ length: v.count }, (_,i) => SecureStore.getItemAsync(key + '.' + v.version + '.' + i)));
    return parts.some(x => x === null) ? null : parts.join('');
  },
  async setItem(key: string, value: string) {
    const old = await index(key), version = Date.now() + '-' + Math.random().toString(36).slice(2);
    const count = Math.ceil(value.length / 500);
    if (count > 100) throw new Error('حجم الجلسة غير متوقع');
    for (let i=0;i<count;i++) await SecureStore.setItemAsync(key + '.' + version + '.' + i, value.slice(i*500,(i+1)*500));
    await SecureStore.setItemAsync(key, JSON.stringify({version,count}));
    if (old) for (let i=0;i<old.count;i++) await SecureStore.deleteItemAsync(key + '.' + old.version + '.' + i).catch(() => {});
  },
  async removeItem(key: string) {
    const old = await index(key); await SecureStore.deleteItemAsync(key);
    if (old) for (let i=0;i<old.count;i++) await SecureStore.deleteItemAsync(key + '.' + old.version + '.' + i);
  }
};
export const supabase = createClient(PROJECT_URL, PUBLIC_KEY, {
  auth: { storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, lock: processLock },
});
AppState.addEventListener('change', state => {
  if (state === 'active') supabase.auth.startAutoRefresh(); else supabase.auth.stopAutoRefresh();
});
if (AppState.currentState === 'active') supabase.auth.startAutoRefresh();
export async function action(name: string, payload: Record<string, unknown> = {}) {
  const { data, error } = await supabase.rpc('ateek_action', { action: name, payload });
  if (error) throw new Error(error.message);
  return data as { id?: string };
}
