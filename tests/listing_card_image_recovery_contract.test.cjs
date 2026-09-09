const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('listing cards recover from failed remote images and reset for a new image', () => {
  const source = fs.readFileSync('src/components/ListingCard.tsx', 'utf8');

  assert.match(source, /const \[imageFailed, setImageFailed\] = useState\(false\)/);
  assert.match(source, /setLoaded\(false\);\s*setImageFailed\(false\);\s*}, \[item\.image\]\);/s);
  assert.match(source, /onError=\{\(\) => \{\s*setImageFailed\(true\);\s*setLoaded\(true\);\s*}\}/s);
  assert.match(source, /imageFailed \? \(/);
  assert.match(source, /accessibilityLabel=\{`تعذر تحميل صورة \$\{item\.title\}`\}/);
});
