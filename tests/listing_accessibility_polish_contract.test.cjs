const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const transform = fs.readFileSync('scripts/run178-listing-accessibility-polish.mjs', 'utf8');
const run93 = fs.readFileSync('scripts/run93-video-qa-fixes.mjs', 'utf8');
const chain = fs.readFileSync('scripts/run77-reels-transform.mjs', 'utf8');
const source = fs.readFileSync('src/components/SpatialDealScreens.tsx', 'utf8');

test('listing accessibility polish is chained after chat visual polish', () => {
  const chat = chain.indexOf("await import('./run177-chat-visual-accessibility-polish.mjs');");
  const listing = chain.indexOf("await import('./run178-listing-accessibility-polish.mjs');");
  assert.ok(chat >= 0, 'chat visual polish must remain in the production chain');
  assert.ok(listing > chat, 'listing accessibility polish must run after existing visual transforms');
});

test('listing detail actions expose explicit accessible semantics without changing mutations', () => {
  assert.match(source, /accessibilityRole="button"\s+accessibilityLabel="تكبير صورة الإعلان"/);
  assert.match(source, /accessibilityRole="button" accessibilityLabel="إغلاق الصورة"/);
  assert.match(source, /accessibilityRole="button" accessibilityLabel="رجوع"/);
  assert.match(source, /accessibilityState=\{\{ selected: m\.favorites\.includes\(item\.id\) \}\}/);
  assert.match(source, /m\.mutate\('favorite'/);
});

test('listing detail identity follows the post-Run93 localized transform state', () => {
  assert.match(run93, /'SPATIAL LISTING','تفاصيل الإعلان','Arabic listing heading'/);
  assert.match(transform, /<Text style=\{styles\.eyebrow\}>تفاصيل الإعلان<\/Text>/);
  assert.match(source, /<Text style=\{styles\.eyebrow\}>إعلان عتيك<\/Text>/);
});
