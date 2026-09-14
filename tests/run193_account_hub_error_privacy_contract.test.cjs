const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/components/ProductionAccountHub.tsx', 'utf8');

test('account hub failures do not expose backend error details', () => {
  assert.match(source, /تعذّر تحميل حالة التوثيق الآن\. تحقق من اتصال الإنترنت ثم أعد المحاولة\./);
  assert.match(source, /تعذّر إرسال طلب التوثيق الآن\. تحقق من اتصال الإنترنت ثم أعد المحاولة\./);
  assert.match(source, /لم يتم حفظ الإعدادات الآن\. تحقق من اتصال الإنترنت ثم أعد المحاولة\./);
  assert.match(source, /تعذّر تحديث كلمة المرور الآن\. تحقق من اتصال الإنترنت ثم أعد المحاولة\./);
  assert.match(source, /تعذّر تسجيل طلب حذف الحساب الآن\. تحقق من اتصال الإنترنت ثم أعد المحاولة\./);
  assert.doesNotMatch(source, /String\(e\?\.message\?\?e\)/);
});

test('location permission promises contain native rejection paths', () => {
  assert.match(source, /getForegroundPermissionsAsync\(\).*catch\(\(\)=>setLoc\('تعذّر فحص الإذن'\)\)/);
  assert.match(source, /requestForegroundPermissionsAsync\(\).*catch\(\(\)=>setLoc\('تعذّر طلب الإذن'\)\)/);
});
