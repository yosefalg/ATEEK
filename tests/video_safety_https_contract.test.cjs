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

test('IPv6 safety fails closed for mapped IPv4, multicast, and deprecated site-local literals', () => {
  assert.match(source, /if \(normalized\.startsWith\('::ffff:'\)\) return true;/);
  assert.match(source, /if \(normalized\.startsWith\('ff'\)\) return true;/);
  assert.match(source, /if \(\/\^fe\[cdef\]\/\.test\(normalized\)\) return true;/);
});

test('local hostname safety canonicalizes DNS root dots and localdomain aliases', () => {
  assert.match(source, /replace\(\/\\\.\$\/, ''\)/);
  assert.match(source, /host === 'localdomain'/);
  assert.match(source, /host\.endsWith\('\.localdomain'\)/);
});
