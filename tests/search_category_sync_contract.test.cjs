const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/screens/SearchScreen.tsx', 'utf8');

test('search category follows updated route input after the screen is already mounted', () => {
  assert.match(source, /useEffect\(\(\)=>\{setCategory\(safeCategory\(initialCategory\)\)\},\[initialCategory\]\);/);
});

test('search category still initializes from the validated route input', () => {
  assert.match(source, /\[category,setCategory\]=useState\(\(\)=>safeCategory\(initialCategory\)\)/);
});

test('invalid route categories fail closed to the all category', () => {
  assert.match(source, /const safeCategory=\(value:string\)=>categoryOptions\.some\(x=>x\.id===value\)\?value:'all';/);
});
