const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const chain = fs.readFileSync('scripts/run77-reels-transform.mjs', 'utf8');
const transform = fs.readFileSync('scripts/run181-search-accessibility-polish.mjs', 'utf8');
const source = fs.readFileSync('src/screens/SearchScreen.tsx', 'utf8');

test('search accessibility polish is chained after deferred filtering and listing polish', () => {
  const deferredIndex = chain.indexOf("await import('./run172-search-deferred-filtering.mjs');");
  const listingIndex = chain.indexOf("await import('./run178-listing-accessibility-polish.mjs');");
  const searchIndex = chain.indexOf("await import('./run181-search-accessibility-polish.mjs');");
  assert.ok(deferredIndex >= 0, 'deferred search transform must remain chained');
  assert.ok(listingIndex > deferredIndex, 'listing polish must remain after deferred search transform');
  assert.ok(searchIndex > listingIndex, 'search accessibility polish must run after existing production transforms');
});

test('search result count is announced politely and interactive chips meet a 44dp minimum target', () => {
  assert.match(transform, /accessibilityLiveRegion="polite"/);
  assert.match(transform, /sortChip:\{minHeight:44,/);
  assert.match(transform, /historyChip:\{minHeight:44,/);
  assert.match(transform, /chip:\{paddingHorizontal:16,minHeight:44,/);
});

test('search remains wired to real profile lookup and listing actions', () => {
  assert.match(source, /supabase\.rpc\('ateek_profile_by_username'/);
  assert.match(source, /<ListingCard item=\{item\}/);
  assert.match(source, /onFavorite=\{\(\)=>onFavorite\(item\.id\)\}/);
  assert.match(source, /onOpen\(item\)/);
});
