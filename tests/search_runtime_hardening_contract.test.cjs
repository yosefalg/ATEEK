const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const search = fs.readFileSync('src/screens/SearchScreen.tsx', 'utf8');
const empty = fs.readFileSync('src/components/EmptyState.tsx', 'utf8');

test('search persistence stays defensive and serialized', () => {
  assert.match(search, /AsyncStorage\.multiGet\(\[HISTORY,SAVED,SORT\]\)/);
  assert.match(search, /const parseStringArray=/);
  assert.match(search, /const parseSaved=/);
  assert.match(search, /historyWriteRef\.current=historyWriteRef\.current\.then/);
  assert.match(search, /savedWriteRef\.current=savedWriteRef\.current\.then/);
});

test('username and location requests remain single-flight and stale-safe', () => {
  assert.match(search, /usernameBusyRef=useRef\(false\)/);
  assert.match(search, /locationBusyRef=useRef\(false\)/);
  assert.match(search, /requestId!==usernameRequestRef\.current/);
  assert.match(search, /requestId!==locationRequestRef\.current/);
});

test('search controls expose selected, busy, and result-count accessibility state', () => {
  assert.match(search, /accessibilityState=\{\{selected:active,busy,disabled:busy\}\}/);
  assert.match(search, /accessibilityState=\{\{selected:category===item\.id\}\}/);
  assert.match(search, /accessibilityLabel=\{`عدد نتائج البحث \$\{filtered\.length\}`\}/);
});

test('empty state is theme-aware and announced once as a polite text region', () => {
  assert.match(empty, /useAteekTheme\(\)/);
  assert.match(empty, /accessible/);
  assert.match(empty, /accessibilityRole="text"/);
  assert.match(empty, /accessibilityLiveRegion="polite"/);
  assert.match(empty, /accessibilityElementsHidden/);
  assert.match(empty, /importantForAccessibility="no-hide-descendants"/);
});
