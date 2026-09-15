const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const transform = fs.readFileSync('scripts/run198-auth-input-ux.mjs', 'utf8');

test('auth inputs expose platform autofill semantics', () => {
  assert.match(transform, /autoComplete="name"/);
  assert.match(transform, /autoComplete="email"/);
  assert.match(transform, /autoComplete=\{props\.register\?'new-password':'current-password'\}/);
  assert.match(transform, /textContentType=\{props\.register\?'newPassword':'password'\}/);
});

test('password keyboard submits through the existing AuthPortal submit callback', () => {
  assert.match(transform, /returnKeyType="done"/);
  assert.match(transform, /onSubmitEditing=\{props\.onSubmit\}/);
  assert.match(transform, /label="كلمة المرور"/);
});
