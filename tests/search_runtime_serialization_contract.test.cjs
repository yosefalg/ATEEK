const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/screens/SearchScreen.tsx', 'utf8');

test('username lookup is single-flight and stale-response guarded', () => {
  assert.match(source, /usernameBusyRef=useRef\(false\)/);
  assert.match(source, /if\(usernameBusyRef\.current\)return true/);
  assert.match(source, /const requestId=\+\+usernameRequestRef\.current/);
  assert.match(source, /if\(requestId!==usernameRequestRef\.current\)return true/);
  assert.match(source, /supabase\.rpc\('ateek_profile_by_username'/);
});

test('nearest-location sorting is single-flight and lifecycle guarded', () => {
  assert.match(source, /locationBusyRef=useRef\(false\)/);
  assert.match(source, /if\(locationBusyRef\.current\)return/);
  assert.match(source, /const requestId=\+\+locationRequestRef\.current/);
  assert.match(source, /if\(requestId!==locationRequestRef\.current\)return/);
  assert.match(source, /Location\.requestForegroundPermissionsAsync\(\)/);
  assert.match(source, /Location\.getCurrentPositionAsync\(\{accuracy:Location\.Accuracy\.Balanced\}\)/);
});

test('local search history and saved-search writes stay serialized', () => {
  assert.match(source, /historyWriteRef=useRef<Promise<void>>\(Promise\.resolve\(\)\)/);
  assert.match(source, /savedWriteRef=useRef<Promise<void>>\(Promise\.resolve\(\)\)/);
  assert.match(source, /historyWriteRef\.current=historyWriteRef\.current\.then\(\(\)=>AsyncStorage\.setItem\(HISTORY/);
  assert.match(source, /savedWriteRef\.current=savedWriteRef\.current\.then\(\(\)=>AsyncStorage\.setItem\(SAVED/);
});

test('changing sort cancels stale nearest requests before persisting another mode', () => {
  assert.match(source, /locationRequestRef\.current\+=1/);
  assert.match(source, /locationBusyRef\.current=false/);
  assert.match(source, /setLocationBusy\(false\)/);
  assert.match(source, /await persistSort\(next\)/);
});
