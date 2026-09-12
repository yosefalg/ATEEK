const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/components/ProductionAccountHub.tsx', 'utf8');

test('account preference writes are synchronously single-flight', () => {
  assert.match(source, /const saveBusyRef=useRef\(false\),passwordBusyRef=useRef\(false\);/);
  assert.match(source, /const save=async\(\)=>\{if\(saveBusyRef\.current\)return;saveBusyRef\.current=true;setSaving\(true\);/);
  assert.match(source, /finally\{saveBusyRef\.current=false;setSaving\(false\)\}/);
});

test('preference guard preserves the production RPC and local persistence flow', () => {
  assert.match(source, /supabase\.rpc\('ateek_profile_preferences_update'/);
  assert.match(source, /AsyncStorage\.multiSet\(\[\['ateek\.stream\.quality',streamQuality\],\['ateek\.listing\.sort',listingSort\]\]\)/);
  assert.match(source, /await m\.refresh\(\);haptics\.success\(\);/);
});

test('password updates are synchronously single-flight through Supabase Auth', () => {
  assert.match(source, /if\(passwordBusyRef\.current\)return;passwordBusyRef\.current=true;setPasswordBusy\(true\);/);
  assert.match(source, /supabase\.auth\.updateUser\(\{password\}\)/);
  assert.match(source, /finally\{passwordBusyRef\.current=false;setPasswordBusy\(false\)\}/);
});
