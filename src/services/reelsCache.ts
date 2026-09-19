import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'ateek.reels.swr.v1';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const MAX_CACHED_REELS = 100;
const MAX_CACHE_BYTES = 1024 * 1024;

let cacheOperationChain: Promise<void> = Promise.resolve();

type Cursor = { createdAt: string; id: string } | null;
export type ReelsSnapshot<R, L> = {
  version: 1;
  cachedAt: number;
  reels: R[];
  listings: Record<string, L>;
  nextCursor: Cursor;
};

function exceedsUtf8ByteBudget(value: string, maxBytes: number): boolean {
  let bytes = 0;
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit <= 0x7f) {
      bytes += 1;
    } else if (codeUnit <= 0x7ff) {
      bytes += 2;
    } else if (codeUnit >= 0xd800 && codeUnit <= 0xdbff && index + 1 < value.length) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff) {
        bytes += 4;
        index += 1;
      } else {
        bytes += 3;
      }
    } else {
      bytes += 3;
    }
    if (bytes > maxBytes) return true;
  }
  return false;
}

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

function hasValidReelCursorFields(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const reel = value as Record<string, unknown>;
  return typeof reel.id === 'string' && reel.id.length > 0 && typeof reel.created_at === 'string' && reel.created_at.length > 0;
}

function hasCoherentNextCursor(reels: unknown[], nextCursor: Cursor): boolean {
  if (reels.length === 0) return nextCursor === null;
  if (!nextCursor) return false;
  const last = reels[reels.length - 1] as Record<string, unknown>;
  return last.id === nextCursor.id && last.created_at === nextCursor.createdAt;
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
      if (exceedsUtf8ByteBudget(raw, MAX_CACHE_BYTES)) {
        await discardInvalidSnapshot();
        return null;
      }
      const parsed = JSON.parse(raw) as ReelsSnapshot<R, L>;
      const now = Date.now();
      const cursorValid = isCursor(parsed?.nextCursor);
      const valid =
        parsed?.version === 1 &&
        Array.isArray(parsed.reels) &&
        parsed.reels.length <= MAX_CACHED_REELS &&
        parsed.reels.every(hasValidReelCursorFields) &&
        !!parsed.listings &&
        typeof parsed.listings === 'object' &&
        !Array.isArray(parsed.listings) &&
        Number.isFinite(parsed.cachedAt) &&
        parsed.cachedAt <= now + MAX_FUTURE_SKEW_MS &&
        cursorValid &&
        hasCoherentNextCursor(parsed.reels, parsed.nextCursor);
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

export async function writeReelsSnapshot<R extends { id: string; created_at: string; listing_id?: string | null }, L>(reels: R[], listings: Record<string, L>) {
  return serializeCacheOperation(async () => {
    const boundedReels = reels.slice(0, MAX_CACHED_REELS);
    const boundedListingIds = new Set(
      boundedReels.map((reel) => reel.listing_id).filter((id): id is string => typeof id === 'string' && id.length > 0),
    );
    const boundedListings = Object.fromEntries(
      Object.entries(listings).filter(([listingId]) => boundedListingIds.has(listingId)),
    ) as Record<string, L>;
    const last = boundedReels[boundedReels.length - 1];
    const snapshot: ReelsSnapshot<R, L> = {
      version: 1,
      cachedAt: Date.now(),
      reels: boundedReels,
      listings: boundedListings,
      nextCursor: last ? { createdAt: last.created_at, id: last.id } : null,
    };
    try {
      const serialized = JSON.stringify(snapshot);
      if (exceedsUtf8ByteBudget(serialized, MAX_CACHE_BYTES)) {
        // Keep the last known-good snapshot: a too-large refresh must not destroy offline fallback data.
        return;
      }
      await AsyncStorage.setItem(CACHE_KEY, serialized);
    } catch {
      // Cache failure must never block the live Supabase feed.
    }
  });
}
