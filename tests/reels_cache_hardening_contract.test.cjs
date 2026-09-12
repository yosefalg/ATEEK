const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('reels cache rejects malformed, future, and expired snapshots and cleans them up', () => {
  const cache = fs.readFileSync('src/services/reelsCache.ts', 'utf8');
  assert.match(cache, /const MAX_FUTURE_SKEW_MS = 5 \* 60 \* 1000/);
  assert.match(cache, /function isCursor\(value: unknown\): value is Cursor/);
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

test('reels cache serializes reads, cleanup, and writes so stale cleanup cannot delete a fresh snapshot', () => {
  const cache = fs.readFileSync('src/services/reelsCache.ts', 'utf8');
  assert.match(cache, /let cacheOperationChain: Promise<void> = Promise\.resolve\(\)/);
  assert.match(cache, /function serializeCacheOperation<T>\(operation: \(\) => Promise<T>\): Promise<T>/);
  assert.match(cache, /const run = cacheOperationChain\.then\(operation, operation\)/);
  assert.match(cache, /cacheOperationChain = run\.then\([\s\S]*?\(\) => undefined,[\s\S]*?\(\) => undefined/);
  assert.match(cache, /readReelsSnapshot[\s\S]*?return serializeCacheOperation\(async \(\) => \{[\s\S]*?AsyncStorage\.getItem\(CACHE_KEY\)/);
  assert.match(cache, /writeReelsSnapshot[\s\S]*?return serializeCacheOperation\(async \(\) => \{[\s\S]*?AsyncStorage\.setItem\(CACHE_KEY, JSON\.stringify\(snapshot\)\)/);
});
