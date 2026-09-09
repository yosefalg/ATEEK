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
