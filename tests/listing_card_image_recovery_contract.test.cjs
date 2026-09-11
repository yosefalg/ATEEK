const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('listing cards recover from failed remote images and reset for a new image', () => {
  const source = fs.readFileSync('src/components/ListingCard.tsx', 'utf8');

  assert.match(source, /const \[imageFailed, setImageFailed\] = useState\(false\)/);
  assert.match(source, /const imageUri = item\.image\?\.trim\(\) \?\? '';/);
  assert.match(source, /setLoaded\(false\);\s*setImageFailed\(false\);\s*}, \[imageUri\]\);/s);
  assert.match(source, /onError=\{\(\) => \{\s*setImageFailed\(true\);\s*setLoaded\(true\);\s*}\}/s);
  assert.match(source, /!hasImage \|\| imageFailed \? \(/);
  assert.ok(
    source.includes('accessibilityLabel={imageFailed ? `تعذر تحميل صورة ${item.title}` : `لا توجد صورة للإعلان ${item.title}`}'),
    'listing image fallback must announce both failed and missing-media states',
  );
});
