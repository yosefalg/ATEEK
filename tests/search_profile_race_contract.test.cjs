const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/screens/SearchScreen.tsx', 'utf8');

test('profile search uses refs to synchronously gate duplicate RPC submissions', () => {
  assert.match(source, /const usernameRequestRef=useRef\(0\),usernameBusyRef=useRef\(false\)/);
  assert.match(source, /if\(usernameBusyRef\.current\)return true/);
  assert.match(source, /usernameBusyRef\.current=true;const requestId=\+\+usernameRequestRef\.current;setUserBusy\(true\)/);
});

test('changing the query invalidates stale profile search responses', () => {
  assert.match(source, /const changeQuery=\(value:string\)=>\{usernameRequestRef\.current\+=1;usernameBusyRef\.current=false;setUserBusy\(false\);setQuery\(value\)\}/);
  assert.match(source, /if\(requestId!==usernameRequestRef\.current\)return true;if\(error\)throw error/);
  assert.match(source, /await commitHistory\(`@\$\{name\}`\);if\(requestId!==usernameRequestRef\.current\)return true;openSpatialProfile/);
});

test('stale requests cannot surface errors or clear the busy state of a newer request', () => {
  assert.match(source, /catch\(e:any\)\{if\(requestId===usernameRequestRef\.current\)Alert\.alert/);
  assert.match(source, /finally\{if\(requestId===usernameRequestRef\.current\)\{usernameBusyRef\.current=false;setUserBusy\(false\)\}\}/);
  assert.match(source, /usernameRequestRef\.current\+=1;usernameBusyRef\.current=false/);
});

test('nearest sorting synchronously gates duplicate location requests', () => {
  assert.match(source, /const locationRequestRef=useRef\(0\),locationBusyRef=useRef\(false\)/);
  assert.match(source, /if\(locationBusyRef\.current\)return;locationBusyRef\.current=true;const requestId=\+\+locationRequestRef\.current;setLocationBusy\(true\)/);
  assert.match(source, /if\(requestId!==locationRequestRef\.current\)return;setNear\(/);
});

test('changing sort invalidates stale location responses and cleanup', () => {
  assert.match(source, /locationRequestRef\.current\+=1;locationBusyRef\.current=false;setLocationBusy\(false\);await persistSort\(next\)/);
  assert.match(source, /catch\(e:any\)\{if\(requestId===locationRequestRef\.current\)Alert\.alert/);
  assert.match(source, /finally\{if\(requestId===locationRequestRef\.current\)\{locationBusyRef\.current=false;setLocationBusy\(false\)\}\}/);
  assert.match(source, /locationRequestRef\.current\+=1;locationBusyRef\.current=false/);
});
