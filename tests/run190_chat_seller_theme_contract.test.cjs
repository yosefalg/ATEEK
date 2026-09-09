const fs = require('node:fs');
const assert = require('node:assert/strict');
const test = require('node:test');

const transform = fs.readFileSync('scripts/run190-chat-seller-soft-theme.mjs','utf8');
const theme = fs.readFileSync('src/theme/ThemeProvider.tsx','utf8');
const chain = fs.readFileSync('scripts/run77-reels-transform.mjs','utf8');

test('Run190 executes after prior production transforms',()=>{
  assert.match(chain,/run189-global-hub-ai-lifecycle\.mjs'[\s\S]*run190-chat-seller-soft-theme\.mjs/);
});

test('Android chat relies on adjustResize instead of double height resizing',()=>{
  assert.match(transform,/DM double keyboard resize/);
  assert.match(transform,/behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}/);
  assert.match(transform,/keyboardDismissMode="on-drag"/);
});

test('seller profile actions use existing real spatial profile route',()=>{
  assert.match(transform,/openSpatialProfile\(counterpartId\)/);
  assert.match(transform,/openSpatialProfile\(item\.sellerId\)/);
  assert.doesNotMatch(transform,/mock|placeholder/i);
});

test('theme uses warm low-contrast walnut neutrals without changing theme persistence',()=>{
  for (const value of ['#B99872','#F4F0E8','#FAF8F3','#A17E63','#8D9D94']) assert.ok(theme.includes(value));
  assert.match(theme,/AsyncStorage\.multiGet/);
  assert.match(theme,/ateek\.theme\.mode/);
});
