const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const source = fs.readFileSync(path.join(process.cwd(), 'src/components/AuthPortal.tsx'), 'utf8');

test('email input keeps email keyboard and disables capitalization and autocorrect', () => {
  assert.match(source, /label="البريد الإلكتروني"[\s\S]*?keyboardType="email-address"[\s\S]*?autoCapitalize="none"[\s\S]*?autoCorrect=\{false\}[\s\S]*?maxLength=\{254\}/);
});

test('password input stays secret, uncapitalized, and bounded', () => {
  assert.match(source, /label="كلمة المرور"[\s\S]*?secureTextEntry[\s\S]*?autoCapitalize="none"[\s\S]*?maxLength=\{128\}/);
});

test('field exposes accessible label, hint, and disabled state', () => {
  assert.match(source, /accessibilityLabel=\{label\}[\s\S]*?accessibilityHint=\{`أدخل \$\{label\}`\}[\s\S]*?accessibilityState=\{\{ disabled: props\.editable === false \}\}/);
});

test('android auth surface preserves adjustResize-compatible keyboard behavior', () => {
  assert.match(source, /enabled=\{Platform\.OS === 'ios'\}/);
  assert.match(source, /behavior=\{Platform\.OS === 'ios' \? 'padding' : undefined\}/);
  assert.match(source, /keyboardDismissMode=\{Platform\.OS === 'ios' \? 'interactive' : 'on-drag'\}/);
});
