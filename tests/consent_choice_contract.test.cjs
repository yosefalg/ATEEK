const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/components/ConsentManager.tsx', 'utf8');

test('privacy consent exposes an explicit essential-only choice', () => {
  assert.match(source, /accessibilityLabel="رفض الخيارات غير الأساسية"/);
  assert.match(source, /accessibilityHint="يحفظ الموافقة على الوظائف الأساسية فقط"/);
  assert.match(source, /onPress=\{\(\) => void save\(false, false\)\}/);
  assert.match(source, />الأساسية فقط<\/Text>/);
});

test('essential-only choice persists exact optional consent values', () => {
  assert.match(source, /const save = async \(nextAnalytics = analytics, nextMarketing = marketing\)/);
  assert.match(source, /analytics: nextAnalytics/);
  assert.match(source, /marketing: nextMarketing/);
  assert.match(source, /setAnalytics\(nextAnalytics\)/);
  assert.match(source, /setMarketing\(nextMarketing\)/);
});

test('privacy switches expose one explicit accessible control without duplicate copy announcements', () => {
  assert.match(source, /accessibilityRole="switch"/);
  assert.match(source, /accessibilityLabel=\{title\}/);
  assert.match(source, /accessibilityHint=\{note\}/);
  assert.match(source, /accessibilityState=\{\{ disabled, checked: value \}\}/);
  assert.match(source, /accessible=\{false\}/);
  assert.match(source, /accessibilityElementsHidden/);
  assert.match(source, /importantForAccessibility="no-hide-descendants"/);
  assert.doesNotMatch(source, /style=\{styles\.rowCopy\} accessible accessibilityLabel=/);
});

test('privacy consent saves are synchronously single-flight to prevent competing writes', () => {
  assert.match(source, /const savingRef = useRef\(false\)/);
  assert.match(source, /if \(savingRef\.current\) return;/);
  assert.match(source, /savingRef\.current = true;\s*setSaving\(true\);/s);
  assert.match(source, /finally \{\s*savingRef\.current = false;\s*setSaving\(false\);\s*\}/s);
  assert.doesNotMatch(source, /if \(saving\) return;/);
});
