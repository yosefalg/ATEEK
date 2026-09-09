const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/components/Header.tsx', 'utf8');

test('header never fabricates an unread notification indicator', () => {
  assert.doesNotMatch(source, /styles\.dot/);
  assert.doesNotMatch(source, /لا توجد إشعارات/);
});

test('notification control is disabled when no real navigation handler exists', () => {
  assert.match(source, /const notificationsEnabled=typeof onNotifications==='function'/);
  assert.match(source, /accessibilityRole="button"/);
  assert.match(source, /accessibilityState=\{\{disabled:!notificationsEnabled\}\}/);
  assert.match(source, /disabled=\{!notificationsEnabled\}/);
  assert.match(source, /onPress=\{onNotifications\}/);
});
