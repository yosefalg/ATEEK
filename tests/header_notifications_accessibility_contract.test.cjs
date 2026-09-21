const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'components', 'Header.tsx'), 'utf8');

test('notification control is disabled when no real handler is available', () => {
  assert.match(source, /const notificationsEnabled=typeof onNotifications==='function';/);
  assert.match(source, /disabled=\{!notificationsEnabled\}/);
  assert.match(source, /accessibilityState=\{\{disabled:!notificationsEnabled\}\}/);
  assert.match(source, /onPress=\{onNotifications\}/);
  assert.doesNotMatch(source, /Alert\.alert/);
});

test('notification control preserves localized accessibility guidance and touch target', () => {
  assert.match(source, /accessibilityRole="button"/);
  assert.match(source, /accessibilityLabel=\{t\('header\.notifications'\)\}/);
  assert.match(source, /accessibilityHint=\{t\(notificationsEnabled\?'header\.notifications\.openHint':'header\.notifications\.unavailableHint'\)\}/);
  assert.match(source, /hitSlop=\{8\}/);
});

test('decorative header icons stay hidden from assistive technology', () => {
  assert.match(source, /<Ionicons accessible=\{false\} name="notifications-outline"/);
  assert.match(source, /accessibilityElementsHidden importantForAccessibility="no-hide-descendants"/);
});
