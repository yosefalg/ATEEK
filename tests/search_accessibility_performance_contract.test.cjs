const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/screens/SearchScreen.tsx', 'utf8');

test('search controls expose labels, hints, roles, and busy/selected state', () => {
  assert.match(source, /accessibilityLabel="حقل البحث"/);
  assert.match(source, /accessibilityHint="ابحث عن سلعة أو اكتب معرف مستخدم يبدأ بعلامة @"/);
  assert.match(source, /accessibilityLabel="تنفيذ البحث" accessibilityState=\{\{busy:userBusy,disabled:userBusy\}\}/);
  assert.match(source, /accessibilityRole="toolbar" accessibilityLabel="ترتيب نتائج البحث"/);
  assert.match(source, /accessibilityState=\{\{selected:active,busy,disabled:busy\}\}/);
  assert.match(source, /accessibilityLiveRegion="polite"/);
});

test('result and category controls remain screen-reader discoverable', () => {
  assert.match(source, /accessibilityLabel=\{`عدد نتائج البحث \$\{filtered\.length\}`\}/);
  assert.match(source, /accessibilityLabel=\{`نتائج البحث، \$\{filtered\.length\} نتيجة`\}/);
  assert.match(source, /accessibilityLabel=\{`قسم \$\{item\.label\}`\} accessibilityState=\{\{selected:category===item\.id\}\}/);
  assert.match(source, /accessibilityLabel=\{`إعادة البحث عن \$\{item\}`\}/);
});

test('search result virtualization honors low-data mode', () => {
  assert.match(source, /initialNumToRender=\{lowData\?4:8\}/);
  assert.match(source, /maxToRenderPerBatch=\{lowData\?4:8\}/);
  assert.match(source, /windowSize=\{lowData\?3:6\}/);
  assert.match(source, /removeClippedSubviews/);
});
