const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

test('home media failures fall back without repeatedly rendering broken remote images', () => {
  assert.match(source, /const\[failedImageUrls,setFailedImageUrls\]=useState\(\(\)=>new Set<string>\(\)\);/);
  assert.match(source, /const markImageFailed=\(uri:string\)=>setFailedImageUrls/);
  assert.match(source, /profileAvatar&&!failedImageUrls\.has\(profileAvatar\)/);
  assert.match(source, /image&&!failedImageUrls\.has\(image\)/);
  assert.match(source, /thumbnail&&!failedImageUrls\.has\(thumbnail\)/);
  assert.equal((source.match(/onError=\{\(\)=>markImageFailed\(/g) ?? []).length, 3);
});
