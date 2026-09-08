const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('listing favorite control exposes its selected accessibility state', () => {
  const source = fs.readFileSync('src/components/ListingCard.tsx', 'utf8');

  assert.match(source, /accessibilityLabel=\{favorite \? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'\}/);
  assert.match(source, /accessibilityState=\{\{ selected: favorite \}\}/);
  assert.match(source, /event\.stopPropagation\(\)/);
});
