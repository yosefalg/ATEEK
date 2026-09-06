import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'ateek.reels.swr.v1';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;

type Cursor = { createdAt: string; id: string } | null;
export type ReelsSnapshot<R, L> = {
  version: 1;
  cachedAt: number;
  reels: R[];
  listings: Record<string, L>;
  nextCursor: Cursor;
};

export async function readReelsSnapshot<R, L>(): Promise<ReelsSnapshot<R, L> | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ReelsSnapshot<R, L>;
    if (parsed?.version !== 1 || !Array.isArray(parsed.reels) || !parsed.listings || typeof parsed.cachedAt !== 'number') return null;
    if (Date.now() - parsed.cachedAt > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function writeReelsSnapshot<R extends { id: string; created_at: string }, L>(reels: R[], listings: Record<string, L>) {
  const last = reels[reels.length - 1];
  const snapshot: ReelsSnapshot<R, L> = {
    version: 1,
    cachedAt: Date.now(),
    reels,
    listings,
    nextCursor: last ? { createdAt: last.created_at, id: last.id } : null,
  };
  try {
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(snapshot));
  } catch {
    // Cache failure must never block the live Supabase feed.
  }
}
