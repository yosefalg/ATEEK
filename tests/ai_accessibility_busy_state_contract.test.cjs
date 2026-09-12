const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/screens/AIAssistantScreen.tsx', 'utf8');

test('AI mode controls expose their disabled state while a reply is streaming', () => {
  assert.match(
    source,
    /accessibilityState=\{\{ selected: active, disabled: busy \}\}[\s\S]*?disabled=\{busy\}[\s\S]*?onPress=\{\(\) => setMode\(item\.id\)\}/,
  );
});

test('AI send control exposes busy and disabled states consistently', () => {
  assert.match(
    source,
    /accessibilityState=\{\{ disabled: busy \|\| !input\.trim\(\), busy \}\}[\s\S]*?disabled=\{busy \|\| !input\.trim\(\)\}/,
  );
});

test('AI composer and streaming placeholder announce non-editable progress without duplicate decorative icons', () => {
  assert.match(source, /TextInput[\s\S]*?editable=\{!busy\}[\s\S]*?accessibilityState=\{\{ disabled: busy \}\}/);
  assert.match(source, /accessibilityLiveRegion="polite" accessibilityLabel="ATEEK AI يفكر"/);
  assert.match(source, /Ionicons accessible=\{false\}/);
});
