const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/screens/HomeScreen.tsx', 'utf8');

test('home display name ignores blank profile fields before falling back', () => {
  assert.match(source, /const firstNonEmpty=\(\.\.\.values:unknown\[\]\)=>values\.map\(value=>String\(value\?\?''\)\.trim\(\)\)\.find\(Boolean\)\?\?'';/);
  assert.match(source, /const displayName=firstNonEmpty\(profile\?\.name,profile\?\.display_name,'صديق عتيك'\);/);
  assert.doesNotMatch(source, /String\(profile\?\.name\|\|profile\?\.display_name\|\|'صديق عتيك'\)\.trim\(\)/);
});
