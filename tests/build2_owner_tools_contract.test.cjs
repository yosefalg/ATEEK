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

test('similar listing thumbnails recover from remote image failures and reset for new media',()=>{
  assert.match(source,/function SimilarListingRow\(/);
  assert.match(source,/\[failed,setFailed\]=useState\(false\);useEffect\(\(\)=>setFailed\(false\),\[image\]\)/);
  assert.match(source,/image&&!failed\?<Image accessible=\{false\} source=\{\{uri:image\}\} onError=\{\(\)=>setFailed\(true\)\}/);
  assert.match(source,/xs\.map\(x=><SimilarListingRow key=\{x\.id\} item=\{x\} onOpen=\{onOpen\}\/\>\)/);
});

test('share card recovers from remote image failures before capture and resets for new media',()=>{
  assert.match(source,/\[imageFailed,setImageFailed\]=useState\(false\);useEffect\(\(\)=>setImageFailed\(false\),\[image\]\)/);
  assert.match(source,/image&&!imageFailed\?<Image accessible=\{false\} source=\{\{uri:image\}\} onError=\{\(\)=>setImageFailed\(true\)\} style=\{s\.shareImage\}/);
  assert.match(source,/:<View accessible=\{false\} style=\{\[s\.shareImage,s\.shareImageFallback\]\}\/>/);
});
