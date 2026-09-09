const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('listing draft persistence waits for restore choice and ignores unmounted callbacks', () => {
  const source = fs.readFileSync('src/screens/AddListingScreen.tsx', 'utf8');

  assert.match(source, /const \[draftReady, setDraftReady\] = useState\(false\)/);
  assert.match(source, /let active = true/);
  assert.match(source, /if \(!active\) return/);
  assert.match(source, /if \(!raw\) \{\s*setDraftReady\(true\)/s);
  assert.match(source, /if \(!draftReady \|\| publishedRef\.current\) return/);
  assert.match(source, /\[draftReady, title, price, description, location, category, image\]/);
  assert.match(source, /return \(\) => \{\s*active = false;\s*\}/s);
  assert.doesNotMatch(source, /const restored = useRef/);
});
