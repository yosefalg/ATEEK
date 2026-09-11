const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.join(process.cwd(),'src/components/Header.tsx'),'utf8');
const locales=['ar','en','tr','fa'].map(locale=>JSON.parse(fs.readFileSync(path.join(process.cwd(),`src/i18n/locale/${locale}.json`),'utf8')));

test('header notification action truthfully exposes availability to assistive tech',()=>{
  assert.match(source,/const notificationsEnabled=typeof onNotifications==='function'/);
  assert.match(source,/accessibilityState=\{\{disabled:!notificationsEnabled\}\}/);
  assert.match(source,/disabled=\{!notificationsEnabled\}/);
  assert.match(source,/accessibilityLabel=\{t\('header\.notifications'\)\}/);
  assert.match(source,/accessibilityHint=\{t\(notificationsEnabled\?'header\.notifications\.openHint':'header\.notifications\.unavailableHint'\)\}/);
});

test('header user-facing copy is localized across every supported locale',()=>{
  assert.match(source,/const \{ t \} = useLocale\(\)/);
  assert.match(source,/\{t\('header\.tagline'\)\}/);
  for(const catalog of locales){
    for(const key of ['header.notifications','header.notifications.openHint','header.notifications.unavailableHint','header.tagline']){
      assert.equal(typeof catalog[key],'string');
      assert.ok(catalog[key].trim().length>0,`${key} must be translated`);
    }
  }
});

test('header notification action remains a real callback instead of fabricating behavior',()=>{
  assert.match(source,/onPress=\{onNotifications\}/);
  assert.doesNotMatch(source,/notificationCount|unreadCount|badgeText/);
});
