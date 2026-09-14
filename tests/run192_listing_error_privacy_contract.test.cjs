const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/screens/AddListingScreen.tsx', 'utf8');

test('listing AI and publish failures use production-safe user messages', () => {
  assert.match(source, /تعذّر إكمال التحليل الآن\. تحقق من اتصال الإنترنت أو جرّب صورة أخرى\./);
  assert.match(source, /لم يكتمل النشر\. تحقق من اتصال الإنترنت ثم أعد المحاولة\./);
  assert.doesNotMatch(source, /error instanceof Error \? error\.message/);
});
