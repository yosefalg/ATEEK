const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('reels cache rejects non-array refresh input before slicing', () => {
  const cache = fs.readFileSync('src/services/reelsCache.ts', 'utf8');
  const writeSection = cache.slice(cache.indexOf('export async function writeReelsSnapshot'));
  const arrayGuardIndex = writeSection.indexOf('if (!Array.isArray(reels))');
  const sliceIndex = writeSection.indexOf('const boundedReels = reels.slice(0, MAX_CACHED_REELS)');
  assert.ok(arrayGuardIndex >= 0, 'runtime reels array guard must exist');
  assert.ok(sliceIndex > arrayGuardIndex, 'runtime reels array guard must execute before reels.slice');
  const guardBranch = writeSection.match(/if \(!Array\.isArray\(reels\)\) \{([\s\S]*?)\n\s*\}/)?.[1] ?? '';
  assert.match(guardBranch, /last known-good snapshot/);
  assert.match(guardBranch, /return;/);
  assert.doesNotMatch(guardBranch, /setItem|removeItem|discardInvalidSnapshot/);
});

test('reels cache rejects malformed or duplicate refresh rows before replacing last-known-good data', () => {
  const cache = fs.readFileSync('src/services/reelsCache.ts', 'utf8');
  const writeSection = cache.slice(cache.indexOf('export async function writeReelsSnapshot'));
  assert.match(writeSection, /const boundedReels = reels\.slice\(0, MAX_CACHED_REELS\)/);
  const validationBranch = writeSection.match(/if \(!boundedReels\.every\(hasValidReelCursorFields\) \|\| !hasUniqueReelIds\(boundedReels\)\) \{([\s\S]*?)\n\s*\}/)?.[1] ?? '';
  assert.ok(validationBranch, 'malformed/duplicate runtime validation branch must exist');
  assert.match(validationBranch, /last known-good snapshot/);
  assert.match(validationBranch, /return;/);
  assert.doesNotMatch(validationBranch, /setItem|removeItem|discardInvalidSnapshot/);
});

test('reels cache read validation rejects duplicate ids and cleans the persisted snapshot', () => {
  const cache = fs.readFileSync('src/services/reelsCache.ts', 'utf8');
  const readStart = cache.indexOf('export async function readReelsSnapshot');
  const writeStart = cache.indexOf('export async function writeReelsSnapshot');
  assert.ok(readStart >= 0 && writeStart > readStart, 'read and write cache sections must exist');
  const readSection = cache.slice(readStart, writeStart);
  assert.match(readSection, /hasUniqueReelIds\(parsed\.reels\)/);
  assert.match(readSection, /if \(!valid \|\| now - parsed\.cachedAt > MAX_AGE_MS\) \{[\s\S]*?await discardInvalidSnapshot\(\);[\s\S]*?return null;/);
});
