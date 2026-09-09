const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/components/SafeReelVideo.tsx', 'utf8');

test('invalid reel telemetry runs from an effect instead of render', () => {
  assert.match(source, /function InvalidReelFallback/);
  assert.match(source, /logVideoError\(reel\.id, 'VIDEO_SOURCE_INVALID_OR_MISSING'\);/);
  assert.match(source, /\}, \[reel\.id\]\);/);
  const safeReel = source.slice(source.indexOf('export function SafeReelVideo'));
  assert.doesNotMatch(safeReel, /if \(!resolved\) \{\s*logVideoError/);
  assert.match(safeReel, /return <InvalidReelFallback/);
});

test('reel fallback hides a failed remote thumbnail and resets for a new URI', () => {
  assert.match(source, /const \[thumbnailFailed, setThumbnailFailed\] = useState\(false\);/);
  assert.match(source, /useEffect\(\(\) => setThumbnailFailed\(false\), \[thumbnail\]\);/);
  assert.match(source, /const showThumbnail = !!thumbnail && !thumbnailFailed;/);
  assert.match(source, /onError=\{\(\) => setThumbnailFailed\(true\)\}/);
});
