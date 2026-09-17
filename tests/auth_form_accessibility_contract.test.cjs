const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const onlineSource = fs.readFileSync(path.join(process.cwd(), 'src/cloud/OnlineApp.tsx'), 'utf8');
const portalSource = fs.readFileSync(path.join(process.cwd(), 'src/components/AuthPortal.tsx'), 'utf8');

test('shared input exposes a stable accessible name', () => {
  assert.match(onlineSource, /accessibilityLabel=\{props\.accessibilityLabel\?\?String\(props\.placeholder\?\?'حقل إدخال'\)\}/);
  assert.match(portalSource, /accessibilityLabel=\{label\}/);
});

test('authentication errors are announced as one assertive alert surface', () => {
  assert.match(portalSource, /accessible accessibilityRole="alert" accessibilityLiveRegion="assertive" accessibilityLabel=\{props\.error\}/);
  assert.match(portalSource, /accessibilityElementsHidden importantForAccessibility="no">\{props\.error\}<\/Text>/);
});

test('authentication actions expose button role, disabled state, and stable labels', () => {
  assert.match(portalSource, /accessibilityRole="button"[\s\S]*?accessibilityLabel=\{props\.register \? 'إنشاء حساب عتيك' : 'تسجيل الدخول إلى عتيك'\}[\s\S]*?accessibilityState=\{\{ disabled: props\.busy, busy: props\.busy \}\}[\s\S]*?disabled=\{props\.busy\}/);
  assert.match(portalSource, /accessibilityLabel=\{props\.register \? 'لدي حساب بالفعل' : 'إنشاء حساب جديد'\}[\s\S]*?accessibilityState=\{\{ disabled: props\.busy \}\}[\s\S]*?disabled=\{props\.busy\}/);
});

test('password input remains protected and bounded', () => {
  assert.match(portalSource, /label="كلمة المرور"[\s\S]*?secureTextEntry[\s\S]*?maxLength=\{128\}/);
});
