const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/screens/ListingDetails.tsx', 'utf8');

test('listing details exposes a real failed-image recovery path', () => {
  assert.match(source, /onError=\{\(\) => setImageFailed\(true\)\}/);
  assert.match(source, /const retryImage = \(\) => \{/);
  assert.match(source, /setImageRetry\(value => value \+ 1\)/);
  assert.match(source, /key=\{`\$\{item\.id\}-\$\{imageRetry\}`\}/);
});

test('listing image failure is reset when modal context changes', () => {
  assert.match(source, /setImageFailed\(false\);\s*setImageRetry\(0\);/);
  assert.match(source, /\[item\?\.id, visible\]/);
});

test('failed listing image recovery is accessible', () => {
  assert.match(source, /accessibilityRole="alert"/);
  assert.match(source, /accessibilityLabel="إعادة محاولة تحميل صورة الإعلان"/);
  assert.match(source, /accessibilityHint="يحاول تحميل نفس صورة الإعلان مرة أخرى"/);
});
