const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(process.cwd(), 'src/screens/HomeScreen.tsx'), 'utf8');

test('home reels detached refresh work is rejection-safe', () => {
  assert.match(source, /const safeLoad=\(\)=>void load\(\)\.catch\(\(\)=>\{\}\);/);
  assert.match(source, /postgres_changes[\s\S]*,safeLoad\)\.subscribe\(\)/);
  assert.match(source, /if\(alive&&refreshQueued\)\{refreshQueued=false;safeLoad\(\)\}/);
});

test('home reels channel cleanup does not leak a rejected remove promise', () => {
  assert.match(source, /supabase\.removeChannel\(ch\)\.catch\(\(\)=>\{\}\)/);
});
