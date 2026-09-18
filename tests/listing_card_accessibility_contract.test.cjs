const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const assert = require('node:assert/strict');

const source = fs.readFileSync(path.join(process.cwd(), 'src/components/ListingCard.tsx'), 'utf8');

test('listing card exposes a descriptive primary action', () => {
  assert.match(source, /accessibilityRole="button"/);
  assert.match(source, /accessibilityLabel=\{`\$\{item\.title\}، \$\{formatPrice\(item\.price\)\}، \$\{item\.location\}`\}/);
  assert.match(source, /accessibilityHint="يفتح تفاصيل الإعلان"/);
});

test('favorite action exposes selected state and does not open the listing', () => {
  assert.match(source, /accessibilityLabel=\{favorite \? 'إزالة من المفضلة' : 'إضافة إلى المفضلة'\}/);
  assert.match(source, /accessibilityState=\{\{ selected: favorite \}\}/);
  assert.match(source, /event\.stopPropagation\(\);\s*haptics\.medium\(\);\s*onFavorite\(\);/);
});

test('seller profile remains an explicit isolated action', () => {
  assert.match(source, /accessibilityLabel="فتح بروفايل البائع"/);
  assert.match(source, /accessibilityHint="يفتح صفحة البائع دون فتح الإعلان"/);
  assert.match(source, /event\.stopPropagation\(\);\s*haptics\.light\(\);\s*openSpatialProfile\(item\.sellerId!\);/);
});

test('missing and failed listing media remain meaningfully announced', () => {
  assert.match(source, /accessibilityRole="image"/);
  assert.match(source, /imageFailed \? `تعذر تحميل صورة \$\{item\.title\}` : `لا توجد صورة للإعلان \$\{item\.title\}`/);
  assert.match(source, /accessibilityLabel=\{`صورة \$\{item\.title\}`\}/);
});
