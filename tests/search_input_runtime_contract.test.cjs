const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/screens/SearchScreen.tsx', 'utf8');

test('search input remains bounded and autocorrect-free', () => {
  assert.match(source, /autoCorrect=\{false\}/);
  assert.match(source, /maxLength=\{120\}/);
});

test('username lookup validates the public handle before RPC', () => {
  const validation = source.indexOf("if(!/^[a-z0-9_]{3,24}$/.test(name))");
  const rpc = source.indexOf("supabase.rpc('ateek_profile_by_username'");
  assert.ok(validation >= 0, 'username validation must exist');
  assert.ok(rpc > validation, 'username validation must happen before the profile RPC');
});

test('search submit stays guarded while username lookup is busy', () => {
  assert.match(source, /accessibilityState=\{\{busy:userBusy,disabled:userBusy\}\}/);
  assert.match(source, /disabled=\{userBusy\}/);
});
