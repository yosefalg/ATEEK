const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('reels cache rejects malformed, future, expired, and oversized snapshots and cleans them up', () => {
  const cache = fs.readFileSync('src/services/reelsCache.ts', 'utf8');
  assert.match(cache, /const MAX_FUTURE_SKEW_MS = 5 \* 60 \* 1000/);
  assert.match(cache, /const MAX_CACHED_REELS = 100/);
  assert.match(cache, /const MAX_CACHE_BYTES = 1024 \* 1024/);
  assert.match(cache, /function utf8ByteLength\(value: string\): number/);
  assert.match(cache, /utf8ByteLength\(raw\) > MAX_CACHE_BYTES/);
  assert.match(cache, /function isCursor\(value: unknown\): value is Cursor/);
  assert.match(cache, /parsed\.reels\.length <= MAX_CACHED_REELS/);
  assert.match(cache, /typeof parsed\.listings === 'object'/);
  assert.match(cache, /!Array\.isArray\(parsed\.listings\)/);
  assert.match(cache, /Number\.isFinite\(parsed\.cachedAt\)/);
  assert.match(cache, /parsed\.cachedAt <= now \+ MAX_FUTURE_SKEW_MS/);
  assert.match(cache, /isCursor\(parsed\.nextCursor\)/);
  assert.match(cache, /now - parsed\.cachedAt > MAX_AGE_MS/);
  assert.match(cache, /async function discardInvalidSnapshot\(\)[\s\S]*?try \{[\s\S]*?await AsyncStorage\.removeItem\(CACHE_KEY\)[\s\S]*?\} catch \{/);
  assert.match(cache, /await discardInvalidSnapshot\(\)/);
  assert.match(cache, /Cache cleanup must never block the live Supabase feed/);
});

test('reels cache byte budget counts UTF-8 including surrogate pairs without platform encoders', () => {
  const cache = fs.readFileSync('src/services/reelsCache.ts', 'utf8');
  assert.match(cache, /codeUnit <= 0x7f[\s\S]*?bytes \+= 1/);
  assert.match(cache, /codeUnit <= 0x7ff[\s\S]*?bytes \+= 2/);
  assert.match(cache, /codeUnit >= 0xd800 && codeUnit <= 0xdbff/);
  assert.match(cache, /nextCodeUnit >= 0xdc00 && nextCodeUnit <= 0xdfff[\s\S]*?bytes \+= 4[\s\S]*?index \+= 1/);
  assert.match(cache, /utf8ByteLength\(serialized\) > MAX_CACHE_BYTES/);
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
  assert.match(cache, /utf8ByteLength\(serialized\) > MAX_CACHE_BYTES[\s\S]*?await discardInvalidSnapshot\(\)[\s\S]*?return/);
});
