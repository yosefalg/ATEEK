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
});

test('every public haptic feedback path is routed through the failure-isolating wrapper', () => {
  const calls = [
    'Haptics.selectionAsync()',
    'Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)',
    'Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)',
    'Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)',
    'Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success)',
    'Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning)',
    'Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error)',
  ];

  for (const call of calls) {
    assert.ok(source.includes(`safe(() => ${call})`), `${call} must remain failure-isolated`);
  }

  assert.equal((source.match(/safe\(\(\) => Haptics\./g) || []).length, calls.length);
});
