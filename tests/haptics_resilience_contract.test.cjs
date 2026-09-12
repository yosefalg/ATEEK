const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/system/haptics.ts','utf8');

test('haptics contains asynchronous native rejections', () => {
  assert.match(source, /void job\(\)\.catch\(\(\) => \{\}\)/);
});

test('haptics also contains synchronous native capability failures', () => {
  assert.match(source, /const safe = \(job: \(\) => Promise<void>\)/);
  assert.match(source, /try \{/);
  assert.match(source, /catch \{/);
  assert.match(source, /safe\(\(\) => Haptics\.selectionAsync\(\)\)/);
  assert.match(source, /safe\(\(\) => Haptics\.notificationAsync\(Haptics\.NotificationFeedbackType\.Error\)\)/);
});
