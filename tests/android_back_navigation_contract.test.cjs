const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(process.cwd(), 'src/cloud/OnlineApp.tsx'), 'utf8');

test('Android back closes listing details before changing navigation state', () => {
  assert.match(source, /if\(selected\)\{setSelected\(null\);return true\}/);
});

test('Android back closes an active chat thread before leaving chats', () => {
  assert.match(source, /if\(thread\)\{setThread\(null\);return true\}/);
});

test('Android back returns non-home tabs to home before delegating to the OS', () => {
  assert.match(source, /if\(tab!==['"]home['"]\)\{setTab\(['"]home['"]\);return true\}return false/);
});

test('Android back listener is removed on cleanup and tracks modal, thread, and tab state', () => {
  assert.match(source, /BackHandler\.addEventListener\(['"]hardwareBackPress['"]/);
  assert.match(source, /return\(\)=>sub\.remove\(\)\},\[selected,thread,tab\]\)/);
});
