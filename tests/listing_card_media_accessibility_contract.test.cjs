const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'ListingCard.tsx'), 'utf8');

test('listing media never renders an unsafe remote URL directly', () => {
  assert.match(source, /const imageUri = safeRemoteMediaUrl\(item\.image\) \?\? '';/);
  assert.match(source, /source=\{\{ uri: imageUri \}\}/);
  assert.doesNotMatch(source, /source=\{\{ uri: item\.image \}\}/);
});

test('listing image failure exposes a useful accessible fallback', () => {
  assert.match(source, /accessibilityRole="image"/);
  assert.match(source, /accessibilityLabel=\{imageFailed \? `تعذر تحميل صورة \$\{item\.title\}` : `لا توجد صورة للإعلان \$\{item\.title\}`\}/);
  assert.match(source, /onError=\{\(\) => \{\s*setImageFailed\(true\);\s*setLoaded\(true\);\s*\}\}/s);
});

test('low-data mode avoids decorative image fade work', () => {
  assert.match(source, /fadeDuration=\{lowData \? 0 : 180\}/);
});
