const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/components/BottomNav.tsx', 'utf8');

test('bottom navigation surface follows the active theme instead of forcing a dark background', () => {
  assert.match(source, /backgroundColor:colors\.glassStrong/);
  assert.doesNotMatch(source, /backgroundColor:'rgba\(10,14,23,0\.93\)'/);
});

test('long-press navigation hints are announced without changing tab semantics', () => {
  assert.match(source, /accessibilityLiveRegion="polite"/);
  assert.match(source, /accessibilityRole="tablist"/);
  assert.match(source, /accessibilityRole="tab"/);
  assert.match(source, /accessibilityState=\{\{selected\}\}/);
});

test('bottom navigation follows the active locale direction', () => {
  assert.match(source, /const\{isRTL\}=useLocale\(\)/);
  assert.match(source, /flexDirection:isRTL\?'row-reverse':'row'/);
  assert.doesNotMatch(source, /bar:\{flex:1,flexDirection:'row-reverse'/);
});
