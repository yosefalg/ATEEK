const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('reels cache rejects malformed refresh rows before replacing last-known-good data', () => {
  const cache = fs.readFileSync('src/services/reelsCache.ts', 'utf8');
  const writeSection = cache.slice(cache.indexOf('export async function writeReelsSnapshot'));
  assert.match(writeSection, /const boundedReels = reels\.slice\(0, MAX_CACHED_REELS\)/);
  assert.match(writeSection, /if \(!boundedReels\.every\(hasValidReelCursorFields\)\) \{[\s\S]*?last known-good snapshot[\s\S]*?return;[\s\S]*?\}/);
  const validationBranch = writeSection.match(/if \(!boundedReels\.every\(hasValidReelCursorFields\)\) \{([\s\S]*?)\n\s*\}/)?.[1] ?? '';
  assert.doesNotMatch(validationBranch, /setItem|removeItem|discardInvalidSnapshot/);
});
