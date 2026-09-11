const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/screens/SearchScreen.tsx', 'utf8');

test('search history uses synchronous refs and ordered storage writes', () => {
  assert.match(source, /historyRef=useRef<string\[\]>\(\[\]\)/);
  assert.match(source, /historyWriteRef=useRef<Promise<void>>\(Promise\.resolve\(\)\)/);
  assert.match(source, /historyRef\.current=next;setHistory\(next\);historyWriteRef\.current=historyWriteRef\.current\.then\(\(\)=>AsyncStorage\.setItem\(HISTORY,JSON\.stringify\(next\)\)\)\.catch\(\(\)=>\{\}\)/);
});

test('saved searches use latest synchronous state and ordered storage writes', () => {
  assert.match(source, /savedRef=useRef<Saved\[\]>\(\[\]\)/);
  assert.match(source, /savedWriteRef=useRef<Promise<void>>\(Promise\.resolve\(\)\)/);
  assert.match(source, /savedRef\.current=next;setSaved\(next\)/);
  assert.match(source, /savedWriteRef\.current=savedWriteRef\.current\.then\(\(\)=>AsyncStorage\.setItem\(SAVED,JSON\.stringify\(next\)\)\)/);
});
