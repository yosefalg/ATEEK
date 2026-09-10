const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/screens/AIAssistantScreen.tsx', 'utf8');

test('AI response sharing contains native share promise failures', () => {
  assert.match(
    source,
    /onPress=\{\(\) => void Share\.share\(\{ message: item\.body \}\)\.catch\(\(\) => \{\}\)\}/,
    'assistant response sharing must contain Share.share rejections instead of leaking an unhandled promise rejection',
  );
});

test('AI response sharing remains limited to real non-empty assistant messages', () => {
  assert.match(
    source,
    /!mine && !!item\.body && <Pressable[\s\S]*?accessibilityLabel="مشاركة الرد"[\s\S]*?message: item\.body/,
    'share control must remain scoped to populated assistant responses and preserve its accessible label',
  );
});
