const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(process.cwd(), 'src/components/SafeReelVideo.tsx'), 'utf8');

test('reel retry is single-flight and always releases its lock', () => {
  assert.match(source, /const retryInFlight = useRef\(false\);/);
  assert.match(source, /if \(retryInFlight\.current\) return;\s*retryInFlight\.current = true;/s);
  assert.match(source, /await player\.replaceAsync\(source\);/);
  assert.match(source, /finally \{\s*retryInFlight\.current = false;\s*\}/s);
});

test('reel fallback normalizes thumbnail URLs and hides decorative media from accessibility', () => {
  assert.match(source, /typeof reel\.thumbnail_url === 'string' \? reel\.thumbnail_url\.trim\(\) : ''/);
  assert.match(source, /return directThumbnail \|\| cloudinaryVideoThumbnail\(reel\.hls_url\) \|\| cloudinaryVideoThumbnail\(reel\.playback_url\) \|\| null;/);
  assert.match(source, /<Image accessible=\{false\} importantForAccessibility="no-hide-descendants"/);
  assert.match(source, /onError=\{\(\) => setThumbnailFailed\(true\)\}/);
});
