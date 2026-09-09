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
  assert.match(source, /useEffect\(\(\)=>\(\)=>\{usernameRequestRef\.current\+=1;usernameBusyRef\.current=false\},\[\]\)/);
});
