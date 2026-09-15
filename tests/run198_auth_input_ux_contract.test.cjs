const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const transform = fs.readFileSync('scripts/run198-auth-input-ux.mjs', 'utf8');

test('auth inputs expose platform autofill semantics', () => {
  assert.match(transform, /autoComplete=\\"name\\"/);
  assert.match(transform, /autoComplete=\\"email\\"/);
  assert.match(transform, /autoComplete=\{register\?'new-password':'current-password'\}/);
  assert.match(transform, /textContentType=\{register\?'newPassword':'password'\}/);
});

test('password keyboard can submit through existing guarded submit path', () => {
  assert.match(transform, /returnKeyType=\\"done\\"/);
  assert.match(transform, /onSubmitEditing=\{\(\)=>void submit\(\)\}/);
  assert.match(transform, /accessibilityLabel=\\"كلمة المرور\\"/);
});
