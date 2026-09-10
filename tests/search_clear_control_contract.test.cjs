const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(process.cwd(), 'src/screens/SearchScreen.tsx'), 'utf8');

test('search exposes an accessible clear-query control only when text exists', () => {
  assert.match(source, /\{!!query&&<Pressable[^>]*accessibilityLabel="مسح عبارة البحث"/);
  assert.match(source, /accessibilityHint="يمسح النص الحالي ويلغي أي بحث بروفايل جارٍ"/);
  assert.match(source, /onPress=\{\(\)=>changeQuery\(''\)\}/);
});

test('clearing the query also invalidates in-flight username profile lookup state', () => {
  assert.match(source, /const changeQuery=\(value:string\)=>\{usernameRequestRef\.current\+=1;usernameBusyRef\.current=false;setUserBusy\(false\);setQuery\(value\)\}/);
});
