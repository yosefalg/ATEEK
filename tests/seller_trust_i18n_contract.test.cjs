const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/components/SellerTrustPanel.tsx', 'utf8');
const locales = ['ar','en','tr','fa'].map(code => JSON.parse(fs.readFileSync(`src/i18n/locale/${code}.json`, 'utf8')));
const keys = ['sellerTrust.loading','sellerTrust.verified','sellerTrust.active','sellerTrust.completedDeals','sellerTrust.accountAgeDays','sellerTrust.newAccountWarning','sellerTrust.message'];

test('seller trust renders localized labels, numbers, and direction', () => {
  assert.match(source, /useLocale/);
  assert.match(source, /const\{t,formatNumber,isRTL\}=useLocale\(\)/);
  for (const key of keys) assert.match(source, new RegExp(`t\\('${key.replaceAll('.', '\\.')}'\\)`));
  assert.match(source, /formatNumber\(m\?\.completedDeals\?\?0\)/);
  assert.match(source, /formatNumber\(m\?\.accountAgeDays\?\?0\)/);
  assert.match(source, /const flow=isRTL\?'row-reverse':'row'/);
  assert.doesNotMatch(source, />حساب موثّق</);
  assert.doesNotMatch(source, />مراسلة البائع</);
});

test('seller trust translation keys stay complete in every supported locale', () => {
  for (const locale of locales) {
    for (const key of keys) assert.equal(typeof locale[key], 'string', `missing ${key}`), assert.ok(locale[key].trim().length > 0, `empty ${key}`);
  }
});
