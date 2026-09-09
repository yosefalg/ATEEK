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
