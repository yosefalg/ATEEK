const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const source = fs.readFileSync(path.join(process.cwd(), 'src/cloud/OnlineApp.tsx'), 'utf8');

test('shared input exposes a stable accessible name', () => {
  assert.match(source, /accessibilityLabel=\{props\.accessibilityLabel\?\?String\(props\.placeholder\?\?'حقل إدخال'\)\}/);
});

test('authentication errors are announced as alerts', () => {
  assert.match(source, /\{!!error&&<Text accessibilityRole="alert" style=\{s\.error\}>\{error\}<\/Text>\}/);
});

test('authentication actions expose button role, disabled state, and label', () => {
  assert.match(source, /accessibilityRole="button" accessibilityLabel=\{title\} accessibilityState=\{\{disabled\}\} disabled=\{disabled\}/);
});

test('password input remains protected and bounded', () => {
  assert.match(source, /placeholder="كلمة المرور"[^>]*secureTextEntry[^>]*maxLength=\{128\}/);
});
