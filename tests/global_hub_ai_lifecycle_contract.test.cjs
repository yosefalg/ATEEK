const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const transform = fs.readFileSync('scripts/run189-global-hub-ai-lifecycle.mjs','utf8');
const chain = fs.readFileSync('scripts/run77-reels-transform.mjs','utf8');
const source = fs.readFileSync('src/components/GlobalHub.tsx','utf8');

test('Global Hub AI lifecycle hardening runs after current production UX transforms',()=>{
  const prior=chain.indexOf("await import('./run188-notification-filters-ux.mjs')");
  const current=chain.indexOf("await import('./run189-global-hub-ai-lifecycle.mjs')");
  assert.ok(prior>=0,'Run188 must remain in production chain');
  assert.ok(current>prior,'Run189 must execute after current production UX transforms');
});

test('closing or unmounting Global Hub invalidates stale AI completions',()=>{
  assert.match(transform,/const aiRequestRef=useRef\(0\);/);
  assert.match(transform,/useEffect\(\(\)=>\(\)=>\{aiRequestRef\.current\+=1;\},\[\]\);/);
  assert.match(transform,/const closeHub=\(\)=>\{aiRequestRef\.current\+=1;setBusy\(false\);setOpen\(false\);\};/);
  assert.match(transform,/const requestId=\+\+aiRequestRef\.current;/);
  assert.match(transform,/if\(requestId!==aiRequestRef\.current\)return;/);
  assert.match(transform,/if\(requestId===aiRequestRef\.current\)setBusy\(false\);/);
  assert.match(transform,/onRequestClose=\{closeHub\}/);
});

test('Global Hub keeps real protected assistant and market data semantics',()=>{
  assert.match(source,/supabase\.from\('ateek_listings'\)/);
  assert.match(source,/supabase\.functions\.invoke\('ateek-assistant'/);
  assert.match(transform,/supabase\.functions\.invoke\('ateek-assistant'/);
  assert.doesNotMatch(transform,/AbortController|mock|placeholder|fake/i);
  assert.doesNotMatch(transform,/supabase\.from\([^)]*\)\.insert|\.update\(|\.delete\(/);
});

test('stale request checks occur both before protected invocation and before UI commit',()=>{
  const first=transform.indexOf('if(requestId!==aiRequestRef.current)return;');
  const invoke=transform.indexOf("supabase.functions.invoke('ateek-assistant'");
  const second=transform.indexOf('if(requestId!==aiRequestRef.current)return;',first+1);
  assert.ok(first>=0&&invoke>first,'stale request is stopped before invoking protected assistant');
  assert.ok(second>invoke,'late assistant completion is stopped before updating UI');
});
