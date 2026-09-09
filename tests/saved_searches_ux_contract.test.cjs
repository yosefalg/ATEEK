const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const transform = fs.readFileSync('scripts/run186-saved-searches-ux.mjs', 'utf8');
const chain = fs.readFileSync('scripts/run77-reels-transform.mjs', 'utf8');
const source = fs.readFileSync('src/screens/SearchScreen.tsx', 'utf8');

test('production transform chain includes interactive saved-search UX after prior search hardening', () => {
  const prior = chain.indexOf("await import('./run181-search-accessibility-polish.mjs')");
  const current = chain.indexOf("await import('./run186-saved-searches-ux.mjs')");
  assert.ok(prior >= 0, 'Run181 search hardening must remain in production chain');
  assert.ok(current > prior, 'Run186 must run after prior search hardening');
});

test('saved searches become visible, reusable, category-aware, and removable', () => {
  assert.match(transform, /const applySavedSearch=\(item:Saved\)=>/);
  assert.match(transform, /setCategory\(item\.category\)/);
  assert.match(transform, /const removeSavedSearch=async\(item:Saved\)=>/);
  assert.match(transform, /AsyncStorage\.setItem\(SAVED,JSON\.stringify\(next\)\)/);
  assert.match(transform, /عمليات البحث المحفوظة/);
  assert.match(transform, /onPress=\{\(\)=>applySavedSearch\(item\)\}/);
  assert.match(transform, /onLongPress=\{\(\)=>void removeSavedSearch\(item\)\}/);
  assert.match(transform, /accessibilityHint="ضغط مطول يحذف هذا البحث المحفوظ"/);
});

test('saved-search style transform targets the post-Run181 44dp history chip', () => {
  assert.match(transform, /historyChip:\{minHeight:44,/);
  assert.doesNotMatch(transform, /historyChip:\{minHeight:38,/);
  assert.match(transform, /saved search category style after Run181/);
});

test('saved-search UX preserves real listing search and profile lookup paths', () => {
  assert.match(source, /supabase\.rpc\('ateek_profile_by_username'/);
  assert.match(source, /<ListingCard item=\{item\}/);
  assert.match(source, /onOpen\(item\)/);
  assert.doesNotMatch(transform, /mock|placeholder|fake/i);
});
