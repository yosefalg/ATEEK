const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/components/ConsentManager.tsx', 'utf8');

test('stored privacy consent is structurally validated before it can suppress the consent sheet', () => {
  assert.match(source, /function isStoredConsent\(value: unknown\): value is Consents/);
  assert.match(source, /candidate\.essential === true/);
  assert.match(source, /typeof candidate\.analytics === 'boolean'/);
  assert.match(source, /typeof candidate\.marketing === 'boolean'/);
  assert.match(source, /typeof candidate\.savedAt === 'string'/);
  assert.match(source, /const parsed: unknown = JSON\.parse\(raw\);/);
  assert.match(source, /if \(!isStoredConsent\(parsed\)\) \{\s*setVisible\(true\);\s*return;\s*\}/s);
});

test('missing malformed or unreadable consent fails closed to an explicit user choice', () => {
  assert.match(source, /if \(!raw\) \{\s*setVisible\(true\);\s*return;\s*\}/s);
  assert.match(source, /catch \{\s*setVisible\(true\);\s*\}/s);
  assert.match(source, /catch \{\s*if \(mounted\) setVisible\(true\);\s*\}/s);
});

test('optional consent defaults remain off until a validated stored choice is loaded', () => {
  assert.match(source, /const \[analytics, setAnalytics\] = useState\(false\)/);
  assert.match(source, /const \[marketing, setMarketing\] = useState\(false\)/);
  assert.match(source, /setAnalytics\(parsed\.analytics\)/);
  assert.match(source, /setMarketing\(parsed\.marketing\)/);
});
