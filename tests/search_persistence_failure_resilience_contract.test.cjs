const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/screens/SearchScreen.tsx', 'utf8');

test('search persistence queues recover after storage rejection', () => {
  assert.match(source, /historyWriteRef\.current=historyWriteRef\.current\.then\(\(\)=>AsyncStorage\.setItem\(HISTORY,JSON\.stringify\(next\)\)\)\.catch\(\(\)=>\{\}\)/);
  assert.match(source, /savedWriteRef\.current=savedWriteRef\.current\.then\(\(\)=>AsyncStorage\.setItem\(SAVED,JSON\.stringify\(next\)\)\)\.catch\(\(\)=>\{persisted=false\}\)/);
  assert.match(source, /sortWriteRef\.current=sortWriteRef\.current\.then\(\(\)=>AsyncStorage\.setItem\(SORT,next\)\)\.catch\(\(\)=>\{\}\)/);
});

test('saved-search persistence reports local storage failure without claiming success', () => {
  assert.match(source, /let persisted=true/);
  assert.match(source, /if\(persisted\)Alert\.alert\('تم الحفظ'/);
  assert.match(source, /else Alert\.alert\('تعذر الحفظ','تعذر حفظ البحث على هذا الجهاز الآن\.'\)/);
});
