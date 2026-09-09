const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

test('theme preference writes are serialized and rejection-safe', () => {
  const source = fs.readFileSync('src/theme/ThemeProvider.tsx','utf8');
  assert.match(source, /let preferenceWrite:Promise<void>=Promise\.resolve\(\)/);
  assert.match(source, /preferenceWrite=preferenceWrite\.catch\(\(\)=>\{\}\)\.then\(async\(\)=>\{await task\(\);\}\)\.catch\(\(\)=>\{\}\)/);
  assert.match(source, /persistPreference\(\(\)=>AsyncStorage\.setItem\(THEME_KEY,m\)\)/);
  assert.match(source, /persistPreference\(\(\)=>AsyncStorage\.multiSet\(\[\[VISUAL_KEY,v\],\[THEME_KEY,'dark'\]\]\)\)/);
  assert.match(source, /persistPreference\(\(\)=>AsyncStorage\.setItem\(LOW_DATA_KEY,v\?'1':'0'\)\)/);
  assert.match(source, /persistPreference\(\(\)=>AsyncStorage\.setItem\(ANIM_KEY,v\?'1':'0'\)\)/);
  assert.doesNotMatch(source, /void AsyncStorage\.setItem\((THEME_KEY|LOW_DATA_KEY|ANIM_KEY)/);
});
