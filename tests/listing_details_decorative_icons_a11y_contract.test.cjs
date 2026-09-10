const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/screens/ListingDetails.tsx', 'utf8');

test('listing detail decorative icons stay hidden from screen readers', () => {
  const requiredDecorativeIcons = [
    /<Ionicons name="image-outline"[^>]*accessibilityElementsHidden\s*\/>/,
    /<Ionicons name="refresh"[^>]*accessibilityElementsHidden\s*\/>/,
    /<Ionicons name="close"[^>]*accessibilityElementsHidden\s*\/>/,
    /<Ionicons name=\{favorite \? 'heart' : 'heart-outline'\}[^>]*accessibilityElementsHidden\s*\/>/,
    /<Ionicons name="chevron-back"[^>]*accessibilityElementsHidden\s*\/>/,
    /<Ionicons name="checkmark-circle"[^>]*accessibilityElementsHidden\s*\/>/,
    /<Ionicons name="person"[^>]*accessibilityElementsHidden\s*\/>/,
    /<Ionicons name="chatbubble-ellipses"[^>]*accessibilityElementsHidden\s*\/>/,
  ];

  for (const pattern of requiredDecorativeIcons) {
    assert.match(source, pattern);
  }
});

test('listing detail interactive controls retain explicit accessible semantics', () => {
  assert.match(source, /accessibilityLabel="إغلاق تفاصيل الإعلان"/);
  assert.match(source, /accessibilityLabel=\{favorite \? 'إزالة الإعلان من المفضلة' : 'إضافة الإعلان إلى المفضلة'\}/);
  assert.match(source, /accessibilityState=\{\{ selected: favorite \}\}/);
  assert.match(source, /accessibilityLabel="إعادة محاولة تحميل صورة الإعلان"/);
  assert.match(source, /accessibilityLabel=\{`مراسلة البائع \$\{item\.seller\}`\}/);
});

test('metadata icons are decorative while their text remains exposed', () => {
  assert.match(source, /function Meta\([^)]*\)[\s\S]*?<Ionicons[^>]*accessibilityElementsHidden\s*\/>[\s\S]*?<Text style=\{styles\.metaText\}>\{text\}<\/Text>/);
});
