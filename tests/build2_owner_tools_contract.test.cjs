const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');

const source=fs.readFileSync('src/components/Build2Tools.tsx','utf8');

test('owner price update reuses validated production money parsing',()=>{
  assert.match(source,/import \{ parsePrice \} from '\.\.\/utils\/money';/);
  assert.match(source,/const savePrice=\(\)=>\{const value=parsePrice\(price\);if\(!value\)return Alert\.alert\('أدخل سعرًا صحيحًا'\);void run\(\(\)=>supabase\.rpc\('ateek_listing_price',\{p_listing_id:item\.id,p_price:value\}\)\)\}/);
  assert.doesNotMatch(source,/p_price:Number\(price\)/);
});

test('owner mutations and share capture remain synchronously single-flight',()=>{
  assert.match(source,/busyRef=useRef\(false\)/);
  assert.match(source,/if\(busyRef\.current\)return;busyRef\.current=true;setBusy\(true\)/);
  assert.match(source,/if\(!ref\.current\|\|busyRef\.current\)return;busyRef\.current=true;setBusy\(true\)/);
});
