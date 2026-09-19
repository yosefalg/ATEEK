const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('reels cache rejects malformed, future, expired, and oversized snapshots and cleans them up', () => {
  const cache = fs.readFileSync('src/services/reelsCache.ts', 'utf8');
  assert.match(cache, /const MAX_FUTURE_SKEW_MS = 5 \* 60 \* 1000/);
  assert.match(cache, /const MAX_CACHED_REELS = 100/);
  assert.match(cache, /const MAX_CACHE_BYTES = 1024 \* 1024/);
  assert.match(cache, /function exceedsUtf8ByteBudget\(value: string, maxBytes: number\): boolean/);
  assert.match(cache, /exceedsUtf8ByteBudget\(raw, MAX_CACHE_BYTES\)/);
  assert.match(cache, /function isNonBlankString\(value: unknown\): value is string/);
  assert.match(cache, /typeof value === 'string' && value\.trim\(\)\.length > 0/);
  assert.match(cache, /function isValidTimestamp\(value: unknown\): value is string/);
  assert.match(cache, /isNonBlankString\(value\) && Number\.isFinite\(Date\.parse\(value\)\)/);
  assert.match(cache, /function isCursor\(value: unknown\): value is Cursor/);
  assert.match(cache, /isValidTimestamp\(cursor\.createdAt\) && isNonBlankString\(cursor\.id\)/);
  assert.match(cache, /function hasValidReelCursorFields\(value: unknown\): boolean/);
  assert.match(cache, /isNonBlankString\(reel\.id\) && isValidTimestamp\(reel\.created_at\)/);
  assert.match(cache, /parsed\.reels\.length <= MAX_CACHED_REELS/);
  assert.match(cache, /parsed\.reels\.every\(hasValidReelCursorFields\)/);
  assert.match(cache, /typeof parsed\.listings === 'object'/);
  assert.match(cache, /!Array\.isArray\(parsed\.listings\)/);
  assert.match(cache, /Number\.isFinite\(parsed\.cachedAt\)/);
  assert.match(cache, /parsed\.cachedAt <= now \+ MAX_FUTURE_SKEW_MS/);
  assert.match(cache, /isCursor\(parsed\?\.nextCursor\)/);
  assert.match(cache, /now - parsed\.cachedAt > MAX_AGE_MS/);
  assert.match(cache, /async function discardInvalidSnapshot\(\)[\s\S]*?try \{[\s\S]*?await AsyncStorage\.removeItem\(CACHE_KEY\)[\s\S]*?\} catch \{/);
  assert.match(cache, /await discardInvalidSnapshot\(\)/);
  assert.match(cache, /Cache cleanup must never block the live Supabase feed/);
});

test('reels cache cursor must match the final cached reel', () => {
  const cache = fs.readFileSync('src/services/reelsCache.ts', 'utf8');
  assert.match(cache, /function hasCoherentNextCursor\(reels: unknown\[\], nextCursor: Cursor\): boolean/);
  assert.match(cache, /if \(reels\.length === 0\) return nextCursor === null/);
  assert.match(cache, /if \(!nextCursor\) return false/);
  assert.match(cache, /const last = reels\[reels\.length - 1\] as Record<string, unknown>/);
  assert.match(cache, /last\.id === nextCursor\.id && last\.created_at === nextCursor\.createdAt/);
  assert.match(cache, /cursorValid &&[\s\S]*?hasCoherentNextCursor\(parsed\.reels, parsed\.nextCursor\)/);
});

test('reels cache byte budget counts UTF-8 including surrogate pairs and exits once over budget', () => {
  const cache = fs.readFileSync('src/services/reelsCache.ts', 'utf8');
  assert.match(cache, /codeUnit <= 0x7f[\s\S]*?bytes \+= 1/);
  assert.match(cache, /codeUnit <= 0x7ff[\s\S]*?bytes \+= 2/);
  assert.match(cache, /codeUnit >= 0xd800 && codeUnit <= 0xdbff/);
  assert.match(cache, /nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff[\s\S]*?bytes \+= 4[\s\S]*?index \+= 1/);
  assert.match(cache, /if \(bytes > maxBytes\) return true/);
  assert.match(cache, /return false/);
  assert.match(cache, /exceedsUtf8ByteBudget\(serialized, MAX_CACHE_BYTES\)/);
});

test('reels cache serializes reads, cleanup, and writes so stale cleanup cannot delete a fresh snapshot', () => {
  const cache = fs.readFileSync('src/services/reelsCache.ts', 'utf8');
  assert.match(cache, /let cacheOperationChain: Promise<void> = Promise\.resolve\(\)/);
  assert.match(cache, /function serializeCacheOperation<T>\(operation: \(\) => Promise<T>\): Promise<T>/);
  assert.match(cache, /const run = cacheOperationChain\.then\(operation, operation\)/);
  assert.match(cache, /cacheOperationChain = run\.then\([\s\S]*?\(\) => undefined,[\s\S]*?\(\) => undefined/);
  assert.match(cache, /readReelsSnapshot[\s\S]*?return serializeCacheOperation\(async \(\) => \{[\s\S]*?AsyncStorage\.getItem\(CACHE_KEY\)/);
  assert.match(cache, /writeReelsSnapshot[\s\S]*?return serializeCacheOperation\(async \(\) => \{[\s\S]*?const serialized = JSON\.stringify\(snapshot\)[\s\S]*?AsyncStorage\.setItem\(CACHE_KEY, serialized\)/);
});

test('reels cache bounds persisted feed and retains only listings referenced by cached reels', () => {
  const cache = fs.readFileSync('src/services/reelsCache.ts', 'utf8');
  assert.match(cache, /const boundedReels = reels\.slice\(0, MAX_CACHED_REELS\)/);
  assert.match(cache, /boundedReels\.map\(\(reel\) => reel\.listing_id\)/);
  assert.match(cache, /Object\.entries\(listings\)\.filter\(\(\[listingId\]\) => boundedListingIds\.has\(listingId\)\)/);
  assert.match(cache, /reels: boundedReels/);
  assert.match(cache, /listings: boundedListings/);
  assert.match(cache, /const last = boundedReels\[boundedReels\.length - 1\]/);
});

test('oversized refresh preserves the last known-good reels snapshot', () => {
  const cache = fs.readFileSync('src/services/reelsCache.ts', 'utf8');
  assert.match(cache, /if \(exceedsUtf8ByteBudget\(serialized, MAX_CACHE_BYTES\)\) \{[\s\S]*?last known-good snapshot[\s\S]*?return;[\s\S]*?\}/);
  const writeSection = cache.slice(cache.indexOf('export async function writeReelsSnapshot'));
  const oversizedBranch = writeSection.match(/if \(exceedsUtf8ByteBudget\(serialized, MAX_CACHE_BYTES\)\) \{([\s\S]*?)\n\s*\}/)?.[1] ?? '';
  assert.doesNotMatch(oversizedBranch, /removeItem|discardInvalidSnapshot/);
});
