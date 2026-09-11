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
