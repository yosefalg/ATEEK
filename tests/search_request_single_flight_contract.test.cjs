const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/screens/SearchScreen.tsx', 'utf8');

test('username profile lookup stays single-flight and ignores stale responses', () => {
  assert.match(source, /usernameBusyRef=useRef\(false\)/);
  assert.match(source, /if\(usernameBusyRef\.current\)return true/);
  assert.match(source, /const requestId=\+\+usernameRequestRef\.current;setUserBusy\(true\)/);
  assert.match(source, /if\(requestId!==usernameRequestRef\.current\)return true/);
  assert.match(source, /finally\{if\(requestId===usernameRequestRef\.current\)\{usernameBusyRef\.current=false;setUserBusy\(false\)\}\}/);
});

test('nearest-location lookup stays single-flight and rejects stale location results', () => {
  assert.match(source, /if\(locationBusyRef\.current\)return/);
  assert.match(source, /locationBusyRef\.current=true;const requestId=\+\+locationRequestRef\.current;setLocationBusy\(true\)/);
  assert.match(source, /if\(requestId!==locationRequestRef\.current\)return/);
  assert.match(source, /finally\{if\(requestId===locationRequestRef\.current\)\{locationBusyRef\.current=false;setLocationBusy\(false\)\}\}/);
});

test('switching away from nearest sort invalidates an in-flight location request', () => {
  assert.match(source, /locationRequestRef\.current\+=1;locationBusyRef\.current=false;setLocationBusy\(false\);await persistSort\(next\)/);
});
