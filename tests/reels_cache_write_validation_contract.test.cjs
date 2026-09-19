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

test('reels cache rejects malformed listings input without destroying last-known-good data', () => {
  const cache = fs.readFileSync('src/services/reelsCache.ts', 'utf8');
  const writeSection = cache.slice(cache.indexOf('export async function writeReelsSnapshot'));
  const listingsGuardIndex = writeSection.indexOf("if (!listings || typeof listings !== 'object' || Array.isArray(listings))");
  const listingFilterIndex = writeSection.indexOf('const boundedListingIds = new Set');
  assert.ok(listingsGuardIndex >= 0, 'runtime listings object guard must exist');
  assert.ok(listingFilterIndex > listingsGuardIndex, 'listings runtime guard must execute before enumerating/filtering listing payloads');
  const guardBranch = writeSection.match(/if \(!listings \|\| typeof listings !== 'object' \|\| Array\.isArray\(listings\)\) \{([\s\S]*?)\n\s*\}/)?.[1] ?? '';
  assert.match(guardBranch, /cache failures must not break the live feed/);
  assert.match(guardBranch, /return;/);
  assert.doesNotMatch(guardBranch, /setItem|removeItem|discardInvalidSnapshot/);
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

test('reels cache read validation rejects unreferenced listing payloads and cleans the persisted snapshot', () => {
  const cache = fs.readFileSync('src/services/reelsCache.ts', 'utf8');
  const helperStart = cache.indexOf('function hasOnlyReferencedListings');
  const cursorHelperStart = cache.indexOf('function hasCoherentNextCursor');
  assert.ok(helperStart >= 0 && cursorHelperStart > helperStart, 'referenced-listing validation helper must exist');
  const helperSection = cache.slice(helperStart, cursorHelperStart);
  assert.match(helperSection, /const referencedIds = new Set<string>\(\)/);
  assert.match(helperSection, /listing_id/);
  assert.match(helperSection, /Object\.keys\(listings\)\.every\(\(listingId\) => referencedIds\.has\(listingId\)\)/);

  const readStart = cache.indexOf('export async function readReelsSnapshot');
  const writeStart = cache.indexOf('export async function writeReelsSnapshot');
  const readSection = cache.slice(readStart, writeStart);
  assert.match(readSection, /hasOnlyReferencedListings\(parsed\.reels, parsed\.listings as Record<string, unknown>\)/);
  assert.match(readSection, /if \(!valid \|\| now - parsed\.cachedAt > MAX_AGE_MS\) \{[\s\S]*?await discardInvalidSnapshot\(\);[\s\S]*?return null;/);
});

test('reels cache persists listing payloads only for the bounded reels snapshot', () => {
  const cache = fs.readFileSync('src/services/reelsCache.ts', 'utf8');
  const writeSection = cache.slice(cache.indexOf('export async function writeReelsSnapshot'));
  const referencedIdsIndex = writeSection.indexOf('const boundedListingIds = new Set(boundedReels.map');
  const filterIndex = writeSection.indexOf('Object.entries(listings).filter(([listingId]) => boundedListingIds.has(listingId))');
  const snapshotIndex = writeSection.indexOf('const snapshot: ReelsSnapshot');
  assert.ok(referencedIdsIndex >= 0, 'bounded reel listing-id set must exist');
  assert.ok(filterIndex > referencedIdsIndex, 'listing payloads must be filtered by referenced bounded reel ids');
  assert.ok(snapshotIndex > filterIndex, 'filtered listings must be computed before snapshot serialization');
  assert.match(writeSection, /listings: boundedListings/);
  assert.doesNotMatch(writeSection.slice(snapshotIndex), /listings:\s*listings[,}]/);
});

test('empty reels snapshots cannot retain stale listing payloads and keep a null cursor', () => {
  const cache = fs.readFileSync('src/services/reelsCache.ts', 'utf8');
  const writeSection = cache.slice(cache.indexOf('export async function writeReelsSnapshot'));
  assert.match(writeSection, /const boundedListingIds = new Set\(boundedReels\.map/);
  assert.match(writeSection, /Object\.entries\(listings\)\.filter\(\(\[listingId\]\) => boundedListingIds\.has\(listingId\)\)/);
  assert.match(writeSection, /nextCursor: last \? \{ createdAt: last\.created_at, id: last\.id \} : null/);
  const readStart = cache.indexOf('export async function readReelsSnapshot');
  const writeStart = cache.indexOf('export async function writeReelsSnapshot');
  const readSection = cache.slice(readStart, writeStart);
  assert.match(readSection, /hasOnlyReferencedListings\(parsed\.reels, parsed\.listings as Record<string, unknown>\)/);
  assert.match(cache, /if \(reels\.length === 0\) return nextCursor === null;/);
});
