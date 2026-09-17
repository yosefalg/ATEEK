const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/components/EmptyState.tsx', 'utf8');

test('empty states expose one combined live-region announcement', () => {
  assert.match(source, /accessible\s*[\r\n\s]+accessibilityRole="text"/);
  assert.match(source, /accessibilityLabel=\{`\$\{title\}\. \$\{body\}`\}/);
  assert.match(source, /accessibilityLiveRegion="polite"/);
});

test('empty-state decorative icon subtree stays out of accessibility navigation', () => {
  assert.match(source, /<View[^>]*accessibilityElementsHidden[^>]*importantForAccessibility="no-hide-descendants"/s);
});

test('visible empty-state title and body do not duplicate the combined announcement', () => {
  const hiddenText = /<Text[^>]*accessibilityElementsHidden[^>]*importantForAccessibility="no"[^>]*>/gs;
  const matches = source.match(hiddenText) ?? [];
  assert.equal(matches.length, 2);
});
