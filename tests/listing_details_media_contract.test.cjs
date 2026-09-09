const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/screens/ListingDetails.tsx', 'utf8');

test('listing details does not mount a remote image for an empty image URL', () => {
  assert.match(source, /const imageUri = item\.image\?\.trim\(\) \?\? '';/);
  assert.match(source, /const hasImage = imageUri\.length > 0;/);
  assert.match(source, /const showImageFallback = imageFailed \|\| !hasImage;/);
  assert.match(source, /source=\{\{ uri: imageUri \}\}/);
  assert.match(source, /لا توجد صورة لهذا الإعلان/);
});

test('listing details only offers image retry when a real URL exists and resets when it changes', () => {
  assert.match(source, /\[item\?\.id, item\?\.image, visible\]/);
  assert.match(source, /if \(!hasImage\) return;/);
  assert.match(source, /\{hasImage && <Pressable style=\{styles\.imageRetryButton\}/);
});
