import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'ateek.reels.swr.v1';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;

let cacheOperationChain: Promise<void> = Promise.resolve();

type Cursor = { createdAt: string; id: string } | null;
export type ReelsSnapshot<R, L> = {
  version: 1;
  cachedAt: number;
  reels: R[];
  listings: Record<string, L>;
  nextCursor: Cursor;
};

function serializeCacheOperation<T>(operation: () => Promise<T>): Promise<T> {
  const run = cacheOperationChain.then(operation, operation);
  cacheOperationChain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function isCursor(value: unknown): value is Cursor {
  if (value === null) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const cursor = value as Record<string, unknown>;
  return typeof cursor.createdAt === 'string' && cursor.createdAt.length > 0 && typeof cursor.id === 'string' && cursor.id.length > 0;
}

async function discardInvalidSnapshot() {
  try {
    await AsyncStorage.removeItem(CACHE_KEY);
  } catch {
    // Cache cleanup must never block the live Supabase feed.
  }
}

export async function readReelsSnapshot<R, L>(): Promise<ReelsSnapshot<R, L> | null> {
  return serializeCacheOperation(async () => {
    try {
      const raw = await AsyncStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as ReelsSnapshot<R, L>;
      const now = Date.now();
      const valid =
        parsed?.version === 1 &&
        Array.isArray(parsed.reels) &&
        !!parsed.listings &&
        typeof parsed.listings === 'object' &&
        !Array.isArray(parsed.listings) &&
        Number.isFinite(parsed.cachedAt) &&
        parsed.cachedAt <= now + MAX_FUTURE_SKEW_MS &&
        isCursor(parsed.nextCursor);
      if (!valid || now - parsed.cachedAt > MAX_AGE_MS) {
        await discardInvalidSnapshot();
        return null;
      }
      return parsed;
    } catch {
      await discardInvalidSnapshot();
      return null;
    }
  });
}

export async function writeReelsSnapshot<R extends { id: string; created_at: string }, L>(reels: R[], listings: Record<string, L>) {
  return serializeCacheOperation(async () => {
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
  });
}
