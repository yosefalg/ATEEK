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

test('auth inputs lock while an existing Supabase Auth request is busy', () => {
  for (const field of ['name', 'email', 'password']) {
    const start = transform.indexOf(`replaceField('${field}',`);
    assert.notEqual(start, -1, `${field} replacement must exist`);
    const end = transform.indexOf(`,'`, start);
    assert.notEqual(end, -1, `${field} replacement must have a contract label`);
    const replacement = transform.slice(start, end);
    assert.match(replacement, /editable=\{!props\.busy\}/, `${field} must lock while auth is busy`);
  }
  assert.match(transform, /onSubmitEditing=\{props\.busy \? undefined : props\.onSubmit\}/);
});

test('password keyboard submits through the existing AuthPortal submit callback', () => {
  assert.match(transform, /returnKeyType="done"/);
  assert.match(transform, /onSubmitEditing=\{props\.busy \? undefined : props\.onSubmit\}/);
  assert.match(transform, /label="كلمة المرور"/);
});
