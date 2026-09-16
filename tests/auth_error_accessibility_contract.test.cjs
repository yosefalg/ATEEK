const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/components/AuthPortal.tsx', 'utf8');

test('auth error uses one assertive alert announcement surface', () => {
  const alertRows = source.match(/accessibilityRole="alert"/g) || [];
  const assertiveRegions = source.match(/accessibilityLiveRegion="assertive"/g) || [];

  assert.equal(alertRows.length, 1, 'AuthPortal must expose exactly one alert role for auth errors');
  assert.equal(assertiveRegions.length, 1, 'AuthPortal must expose exactly one assertive live region');
  assert.match(source, /accessibilityLabel=\{props\.error\}/, 'the alert must announce the real Supabase Auth error text');
});

test('visual auth error children stay out of the accessibility tree', () => {
  assert.match(
    source,
    /<Ionicons name="alert-circle-outline"[^>]*accessibilityElementsHidden importantForAccessibility="no" \/>/,
    'decorative error icon must not be announced separately',
  );
  assert.match(
    source,
    /<Text[^>]*accessibilityElementsHidden importantForAccessibility="no">\{props\.error\}<\/Text>/,
    'visible error text must not duplicate the parent alert announcement',
  );
});
