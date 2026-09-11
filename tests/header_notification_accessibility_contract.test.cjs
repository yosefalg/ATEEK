const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(path.join(process.cwd(),'src/components/Header.tsx'),'utf8');

test('header notification action truthfully exposes availability to assistive tech',()=>{
  assert.match(source,/const notificationsEnabled=typeof onNotifications==='function'/);
  assert.match(source,/accessibilityState=\{\{disabled:!notificationsEnabled\}\}/);
  assert.match(source,/disabled=\{!notificationsEnabled\}/);
  assert.match(source,/accessibilityHint=\{notificationsEnabled\?'يفتح مركز الإشعارات':'الإشعارات غير متاحة في هذه الشاشة'\}/);
});

test('header notification action remains a real callback instead of fabricating behavior',()=>{
  assert.match(source,/onPress=\{onNotifications\}/);
  assert.doesNotMatch(source,/notificationCount|unreadCount|badgeText/);
});
