const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/screens/SearchScreen.tsx', 'utf8');

test('username lookup ignores stale async completions and is single-flight', () => {
  assert.match(source, /const usernameRequestRef=useRef\(0\),usernameBusyRef=useRef\(false\);/);
  assert.match(source, /if\(usernameBusyRef\.current\)return true;/);
  assert.match(source, /usernameBusyRef\.current=true;const requestId=\+\+usernameRequestRef\.current;setUserBusy\(true\);/);
  assert.match(source, /if\(requestId!==usernameRequestRef\.current\)return true;if\(error\)throw error;/);
  assert.match(source, /if\(requestId===usernameRequestRef\.current\)\{usernameBusyRef\.current=false;setUserBusy\(false\)\}/);
});

test('query changes invalidate an in-flight username lookup before changing visible input', () => {
  assert.match(source, /const changeQuery=\(value:string\)=>\{usernameRequestRef\.current\+=1;usernameBusyRef\.current=false;setUserBusy\(false\);setQuery\(value\)\}/);
  assert.match(source, /await commitHistory\(`@\$\{name\}`\);if\(requestId!==usernameRequestRef\.current\)return true;openSpatialProfile/);
});

test('location lookup is single-flight and stale location completions cannot change sort', () => {
  assert.match(source, /const locationRequestRef=useRef\(0\),locationBusyRef=useRef\(false\);/);
  assert.match(source, /const nearest=async\(\)=>\{if\(locationBusyRef\.current\)return;locationBusyRef\.current=true;const requestId=\+\+locationRequestRef\.current;setLocationBusy\(true\);/);
  assert.match(source, /if\(requestId!==locationRequestRef\.current\)return;setNear\(/);
  assert.match(source, /if\(next==='nearest'\)\{await nearest\(\);return\}locationRequestRef\.current\+=1;locationBusyRef\.current=false;setLocationBusy\(false\);await persistSort\(next\)/);
});

test('history and saved-search writes stay serialized', () => {
  assert.match(source, /historyWriteRef=useRef<Promise<void>>\(Promise\.resolve\(\)\),savedWriteRef=useRef<Promise<void>>\(Promise\.resolve\(\)\)/);
  assert.match(source, /historyWriteRef\.current=historyWriteRef\.current\.then\(\(\)=>AsyncStorage\.setItem\(HISTORY,JSON\.stringify\(next\)\)\)\.catch\(\(\)=>\{\}\)/);
  assert.match(source, /savedWriteRef\.current=savedWriteRef\.current\.then\(\(\)=>AsyncStorage\.setItem\(SAVED,JSON\.stringify\(next\)\)\)\.catch\(\(\)=>\{persisted=false\}\)/);
});
