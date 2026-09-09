const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const source=fs.readFileSync('src/screens/SearchScreen.tsx','utf8');

test('search results use indexed favorites instead of repeated linear lookup',()=>{
  assert.match(source,/const favoriteIds=useMemo\(\(\)=>new Set\(favorites\),\[favorites\]\);/);
  assert.match(source,/favorite=\{favoriteIds\.has\(item\.id\)\}/);
  assert.doesNotMatch(source,/favorites\.includes\(item\.id\)/);
});

test('search exposes concrete result count to users and assistive tech',()=>{
  assert.match(source,/\{filtered\.length\} نتيجة/);
  assert.match(source,/accessibilityLabel=\{`عدد نتائج البحث \$\{filtered\.length\}`\}/);
  assert.match(source,/accessibilityLabel=\{`نتائج البحث، \$\{filtered\.length\} نتيجة`\}/);
});

test('username profile lookup does not show a misleading listing count',()=>{
  assert.match(source,/const isUsernameQuery=query\.trim\(\)\.startsWith\('@'\);/);
  assert.match(source,/\{!isUsernameQuery&&<Text/);
  assert.match(source,/ListEmptyComponent=\{isUsernameQuery\?/);
});
