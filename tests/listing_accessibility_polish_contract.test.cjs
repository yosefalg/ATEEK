const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const transform = fs.readFileSync('scripts/run178-listing-accessibility-polish.mjs', 'utf8');
const chain = fs.readFileSync('scripts/run77-reels-transform.mjs', 'utf8');

test('listing accessibility polish is chained after chat visual polish', () => {
  const chat = chain.indexOf("await import('./run177-chat-visual-accessibility-polish.mjs');");
  const listing = chain.indexOf("await import('./run178-listing-accessibility-polish.mjs');");
  assert.ok(chat >= 0, 'chat visual polish must remain in the production chain');
  assert.ok(listing > chat, 'listing accessibility polish must run after existing visual transforms');
});

test('listing detail actions expose explicit accessible semantics without changing mutations', () => {
  assert.match(transform, /accessibilityRole=\"button\"\\n          accessibilityLabel=\"تكبير صورة الإعلان\"/);
  assert.match(transform, /accessibilityRole=\"button\" accessibilityLabel=\"إغلاق الصورة\"/);
  assert.match(transform, /accessibilityRole=\"button\" accessibilityLabel=\"رجوع\"/);
  assert.match(transform, /accessibilityState=\{\{ selected: m\.favorites\.includes\(item\.id\) \}\}/);
  assert.match(transform, /m\.mutate\('favorite'/);
});

test('listing detail premium identity is localized', () => {
  assert.match(transform, /<Text style=\{styles\.eyebrow\}>إعلان عتيك<\/Text>/);
  assert.doesNotMatch(transform, /to,\s*'<Text style=\{styles\.eyebrow\}>SPATIAL LISTING<\/Text>'/);
});
