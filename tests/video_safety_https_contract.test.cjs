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
