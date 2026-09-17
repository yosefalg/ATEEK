const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const source = fs.readFileSync(path.join(process.cwd(), 'src/components/AuthPortal.tsx'), 'utf8');

test('auth trust disclosure states the existing Supabase Auth boundary', () => {
  assert.match(source, /تسجيل الدخول محمي عبر Supabase Auth ولا تُحفظ كلمة المرور داخل التطبيق/);
});

test('auth trust disclosure is exposed as one accessible text element', () => {
  assert.match(source, /<View[^>]*styles\.trust[^>]*accessible[^>]*accessibilityRole="text"[^>]*accessibilityLabel="تسجيل الدخول محمي عبر Supabase Auth ولا تُحفظ كلمة المرور داخل التطبيق"/);
});

test('decorative trust icon is excluded from accessibility navigation', () => {
  assert.match(source, /shield-checkmark-outline[^>]*accessibilityElementsHidden[^>]*importantForAccessibility="no"/);
});

test('visible trust copy is excluded from duplicate accessibility announcements', () => {
  assert.match(source, /styles\.trustText[^>]*accessibilityElementsHidden[^>]*importantForAccessibility="no"/);
});
