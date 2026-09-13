const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.join(process.cwd(), 'src/services/videoSafety.ts'),
  'utf8',
);

test('reel media guard rejects full protocol-assignment and deprecated relay IPv4 ranges', () => {
  assert.match(source, /\(a === 192 && b === 0\)/);
  assert.match(source, /\(a === 192 && b === 88\)/);
});

test('reel media guard keeps private, benchmark, documentation, and multicast ranges blocked', () => {
  assert.match(source, /\(a === 192 && b === 168\)/);
  assert.match(source, /\(a === 198 && \(b === 18 \|\| b === 19\)\)/);
  assert.match(source, /\(a === 198 && b === 51\)/);
  assert.match(source, /\(a === 203 && b === 0\)/);
  assert.match(source, /a >= 224/);
});

test('all accepted reel media URLs still pass through the local-network guard', () => {
  assert.match(source, /if \(isLocalNetworkHost\(u\.hostname\)\) return null;/);
  assert.match(source, /if \(u\.protocol !== 'https:'[\s\S]*?return null;/);
  assert.match(source, /if \(u\.port && u\.port !== '443'\) return null;/);
});
