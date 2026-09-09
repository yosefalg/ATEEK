const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/screens/SearchScreen.tsx', 'utf8');

test('search category follows updated route input after the screen is already mounted', () => {
  assert.match(source, /useEffect\(\(\)=>\{setCategory\(initialCategory\)\},\[initialCategory\]\);/);
});

test('search category still initializes from the route input', () => {
  assert.match(source, /\[category,setCategory\]=useState\(initialCategory\)/);
});
