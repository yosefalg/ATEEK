const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/components/EmptyState.tsx', 'utf8');

test('empty states announce dynamic changes without duplicating decorative icon content', () => {
  assert.match(source, /accessible\s*[\r\n\s]+accessibilityRole="text"/);
  assert.match(source, /accessibilityLabel=\{`\$\{title\}\. \$\{body\}`\}/);
  assert.match(source, /accessibilityLiveRegion="polite"/);
  assert.match(source, /accessibilityElementsHidden/);
  assert.match(source, /importantForAccessibility="no-hide-descendants"/);
});
