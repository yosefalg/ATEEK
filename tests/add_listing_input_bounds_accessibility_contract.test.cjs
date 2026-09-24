const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/screens/AddListingScreen.tsx', 'utf8');

test('listing text inputs stay bounded before local draft persistence or publish', () => {
  assert.match(source, /maxLength=\{props\.multiline \? 2000 : 120\}/);
  assert.match(source, /const draft: Draft = \{ title, price, description, location, category, image \};/);
  assert.match(source, /title: title\.trim\(\)/);
  assert.match(source, /description: description\.trim\(\) \|\| 'لا يوجد وصف إضافي\.'/);
});

test('listing inputs expose stable labels and lock during publish or any AI mutation', () => {
  assert.match(source, /const busy = publishing \|\| analyzing \|\| improving;/);
  assert.match(source, /editable=\{!disabled\}/);
  assert.match(source, /accessibilityLabel=\{label\}/);
  assert.match(source, /accessibilityState=\{\{ disabled \}\}/);
});

test('listing image and AI actions expose truthful disabled and busy state', () => {
  assert.match(source, /accessibilityLabel=\{image \? 'تغيير صورة السلعة' : 'اختيار صورة للسلعة'\}/);
  assert.match(source, /accessibilityState=\{\{ disabled: busy, busy \}\}/);
  assert.match(source, /accessibilityLabel=\{analyzing \? 'جارٍ تحليل الصورة بالذكاء الاصطناعي' : 'تحليل الصورة بالذكاء الاصطناعي'\}/);
  assert.match(source, /accessibilityState=\{\{ disabled: busy, busy: analyzing \}\}/);
});

test('publish action keeps explicit validation guidance and busy semantics', () => {
  assert.match(source, /accessibilityLabel=\{publishing \? 'جارٍ نشر الإعلان' : 'نشر الإعلان في سوق عتيك'\}/);
  assert.match(source, /accessibilityHint=\{!image \? 'اختر صورة أولاً' : !title\.trim\(\) \? 'أدخل عنوان الإعلان أولاً' : !amount \? 'أدخل سعرًا صحيحًا أولاً' : undefined\}/);
  assert.match(source, /accessibilityState=\{\{ disabled: !canPublish, busy: publishing \}\}/);
});
