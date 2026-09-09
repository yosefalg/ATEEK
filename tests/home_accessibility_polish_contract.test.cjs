const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const chain = fs.readFileSync('scripts/run77-reels-transform.mjs', 'utf8');
const transform = fs.readFileSync('scripts/run182-home-accessibility-polish.mjs', 'utf8');

test('home accessibility polish is chained after search accessibility polish', () => {
  const searchIndex = chain.indexOf("await import('./run181-search-accessibility-polish.mjs');");
  const homeIndex = chain.indexOf("await import('./run182-home-accessibility-polish.mjs');");
  assert.ok(searchIndex >= 0);
  assert.ok(homeIndex > searchIndex);
});

test('home polish preserves real navigation and favorite behavior while improving touch semantics', () => {
  assert.match(transform, /accessibilityElementsHidden importantForAccessibility="no-hide-descendants"/);
  assert.match(transform, /sectionAction:\{minHeight:44/);
  assert.match(transform, /favorite:\{position:'absolute',left:8,top:8,width:44,height:44/);
});
