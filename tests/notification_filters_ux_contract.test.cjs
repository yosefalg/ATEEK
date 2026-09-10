const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const transform = fs.readFileSync('scripts/run188-notification-filters-ux.mjs','utf8');
const chain = fs.readFileSync('scripts/run77-reels-transform.mjs','utf8');
const source = fs.readFileSync('src/cloud/OnlineApp.tsx','utf8');

test('notification filtering runs after existing notifications UX',()=>{
  const prior=chain.indexOf("await import('./run96-notifications-ux.mjs')");
  const current=chain.indexOf("await import('./run188-notification-filters-ux.mjs')");
  assert.ok(prior>=0,'Run96 notifications UX must remain in production chain');
  assert.ok(current>prior,'Run188 must run after Run96');
});

test('notifications expose truthful all/unread tabs with accessible semantics',()=>{
  assert.match(transform,/const\[filter,setFilter\]=useState<'all'\|'unread'>\('all'\)/);
  assert.match(transform,/filter==='unread'\?m\.notifications\.filter\(n=>!n\.is_read\):m\.notifications/);
  assert.match(transform,/accessibilityRole=\\"tablist\\" accessibilityLabel=\\"تصفية الإشعارات\\"/);
  assert.match(transform,/accessibilityState=\{\{selected:filter==='unread'\}\}/);
  assert.match(transform,/غير المقروء \{unread\}/);
  assert.match(transform,/لا توجد إشعارات غير مقروءة/);
  assert.match(transform,/notificationFilter:\{minHeight:44,/);
});

test('notification filters preserve real cloud mutation and linked-chat semantics',()=>{
  assert.match(source,/m\.mutate\('read',\{\}\)/);
  assert.match(source,/onChat\(String\(n\.thread_id\)\)/);
  assert.doesNotMatch(transform,/mock|placeholder|fake/i);
});
