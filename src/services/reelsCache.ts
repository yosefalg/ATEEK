import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'ateek.reels.swr.v1';
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const MAX_FUTURE_SKEW_MS = 5 * 60 * 1000;
const MAX_CACHED_REELS = 100;
const MAX_CACHE_BYTES = 1024 * 1024;
const MAX_ID_LENGTH = 128;

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
    if (codeUnit <= 0x7f) bytes += 1;
    else if (codeUnit <= 0x7ff) bytes += 2;
    else if (codeUnit >= 0xd800 && codeUnit <= 0xdbff && index + 1 < value.length) {
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff) {
        bytes += 4;
        index += 1;
      } else bytes += 3;
    } else bytes += 3;
    if (bytes > maxBytes) return true;
  }
  return false;
}

function serializeCacheOperation<T>(operation: () => Promise<T>): Promise<T> {
  const run = cacheOperationChain.then(operation, operation);
  cacheOperationChain = run.then(() => undefined, () => undefined);
  return run;
}

function isNonBlankString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isCanonicalId(value: unknown): value is string {
  return isNonBlankString(value) && value === value.trim() && value.length <= MAX_ID_LENGTH;
}

function isValidTimestamp(value: unknown): value is string {
  return isNonBlankString(value) && Number.isFinite(Date.parse(value));
}

function isCursor(value: unknown): value is Cursor {
  if (value === null) return true;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const cursor = value as Record<string, unknown>;
  return isValidTimestamp(cursor.createdAt) && isCanonicalId(cursor.id);
}

function hasValidReelCursorFields(value: unknown): boolean {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const reel = value as Record<string, unknown>;
  if (!isCanonicalId(reel.id) || !isValidTimestamp(reel.created_at)) return false;
  return reel.listing_id == null || isCanonicalId(reel.listing_id);
}

function hasUniqueReelIds(reels: unknown[]): boolean {
  const ids = new Set<string>();
  for (const value of reels) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const id = (value as Record<string, unknown>).id;
    if (!isCanonicalId(id) || ids.has(id)) return false;
    ids.add(id);
  }
  return true;
}

function hasOnlyReferencedListings(reels: unknown[], listings: Record<string, unknown>): boolean {
  const referencedIds = new Set<string>();
  for (const value of reels) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const listingId = (value as Record<string, unknown>).listing_id;
    if (isCanonicalId(listingId)) referencedIds.add(listingId);
  }
  return Object.keys(listings).every((listingId) => isCanonicalId(listingId) && referencedIds.has(listingId));
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
      const listingsValid = !!parsed?.listings && typeof parsed.listings === 'object' && !Array.isArray(parsed.listings);
      const valid = parsed?.version === 1 && Array.isArray(parsed.reels) && parsed.reels.length <= MAX_CACHED_REELS && parsed.reels.every(hasValidReelCursorFields) && hasUniqueReelIds(parsed.reels) && listingsValid && hasOnlyReferencedListings(parsed.reels, parsed.listings as Record<string, unknown>) && Number.isFinite(parsed.cachedAt) && parsed.cachedAt <= now + MAX_FUTURE_SKEW_MS && cursorValid && hasCoherentNextCursor(parsed.reels, parsed.nextCursor);
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
    if (!Array.isArray(reels)) {
      // Runtime callers can still violate TypeScript contracts; preserve the last known-good snapshot.
      return;
    }
    const boundedReels = reels.slice(0, MAX_CACHED_REELS);
    if (!boundedReels.every(hasValidReelCursorFields) || !hasUniqueReelIds(boundedReels)) {
      // Reject malformed or duplicate refresh data without replacing the last known-good snapshot.
      return;
    }
    if (!listings || typeof listings !== 'object' || Array.isArray(listings)) {
      // Runtime callers can still violate TypeScript contracts; cache failures must not break the live feed.
      return;
    }
    const boundedListingIds = new Set(boundedReels.map((reel) => reel.listing_id).filter((id): id is string => isCanonicalId(id)));
    const boundedListings = Object.fromEntries(Object.entries(listings).filter(([listingId]) => isCanonicalId(listingId) && boundedListingIds.has(listingId))) as Record<string, L>;
    const last = boundedReels[boundedReels.length - 1];
    const snapshot: ReelsSnapshot<R, L> = { version: 1, cachedAt: Date.now(), reels: boundedReels, listings: boundedListings, nextCursor: last ? { createdAt: last.created_at, id: last.id } : null };
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
