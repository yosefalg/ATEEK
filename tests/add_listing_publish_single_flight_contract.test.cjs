const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/screens/AddListingScreen.tsx', 'utf8');

test('listing publication is synchronously single-flight before React state commits', () => {
  assert.match(source, /const publishInFlightRef = useRef\(false\);/);
  assert.match(source, /if \(publishInFlightRef\.current \|\| publishing \|\| analyzing\) return;/);
  assert.match(source, /publishInFlightRef\.current = true;\s*setPublishing\(true\);/s);
  assert.match(source, /finally \{\s*publishInFlightRef\.current = false;\s*setPublishing\(false\);/s);
});

test('single-flight guard preserves the real publish callback and draft cleanup', () => {
  assert.match(source, /await onAdd\(\{/);
  assert.match(source, /publishedRef\.current = true;/);
  assert.match(source, /await draftWriteChainRef\.current\.catch\(\(\) => \{\}\);/);
  assert.match(source, /await AsyncStorage\.removeItem\(DRAFT_KEY\)\.catch\(\(\) => \{\}\);/);
});
