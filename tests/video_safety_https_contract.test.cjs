const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(process.cwd(), 'src/services/videoSafety.ts'), 'utf8');

test('Cloudinary 720 optimization reuses the hardened HTTPS parser', () => {
  assert.match(source, /export function cloudinary720\(uri: string\) \{\s*const u = parseHttps\(uri\);/s);
  assert.match(source, /if \(!u \|\| u\.hostname\.toLowerCase\(\) !== 'res\.cloudinary\.com' \|\| !u\.pathname\.includes\('\/video\/upload\/'\)\) return null;/);
});

test('shared reel media parser rejects insecure, credential-bearing, and local-network URLs', () => {
  assert.match(source, /u\.protocol !== 'https:' \|\| !u\.hostname \|\| u\.username \|\| u\.password/);
  assert.match(source, /if \(isLocalNetworkHost\(u\.hostname\)\) return null;/);
  assert.match(source, /host === 'localhost'/);
  assert.match(source, /isPrivateIpv4\(host\) \|\|\s*isPrivateIpv6\(host\)/s);
});

test('shared reel media parser rejects explicit non-standard HTTPS ports', () => {
  assert.match(source, /if \(u\.port && u\.port !== '443'\) return null;/);
});

test('IPv4 safety rejects non-public protocol and documentation address blocks without overblocking adjacent public space', () => {
  assert.match(source, /a === 192 && b === 0 && \(c === 0 \|\| c === 2\)/);
  assert.match(source, /a === 198 && \(b === 18 \|\| b === 19\)/);
  assert.match(source, /a === 198 && b === 51 && c === 100/);
  assert.doesNotMatch(source, /b === 18 \|\| b === 19 \|\| b === 51/);
  assert.match(source, /a === 203 && b === 0 && c === 113/);
});

test('IPv6 safety fails closed for mapped IPv4, multicast, deprecated site-local, and documentation literals', () => {
  assert.match(source, /if \(normalized\.startsWith\('::ffff:'\)\) return true;/);
  assert.match(source, /if \(normalized\.startsWith\('ff'\)\) return true;/);
  assert.match(source, /if \(\/\^fe\[cdef\]\/\.test\(normalized\)\) return true;/);
  assert.match(source, /normalized === '2001:db8::' \|\| normalized\.startsWith\('2001:db8:'\)/);
});

test('local hostname safety canonicalizes DNS root dots and localdomain aliases', () => {
  assert.match(source, /replace\(\/\\\.\$\/, ''\)/);
  assert.match(source, /host === 'localdomain'/);
  assert.match(source, /host\.endsWith\('\.localdomain'\)/);
});

test('reserved DNS namespaces cannot be used as reel media origins', () => {
  assert.match(source, /isReservedHostname\(host\)/);
  assert.match(source, /host === 'home\.arpa'/);
  assert.match(source, /host\.endsWith\('\.home\.arpa'\)/);
  assert.match(source, /host === 'test'/);
  assert.match(source, /host\.endsWith\('\.test'\)/);
  assert.match(source, /host === 'invalid'/);
  assert.match(source, /host\.endsWith\('\.invalid'\)/);
  assert.match(source, /host === 'example'/);
  assert.match(source, /host\.endsWith\('\.example'\)/);
});
