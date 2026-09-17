const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(process.cwd(), 'src/components/ScreenErrorBoundary.tsx'), 'utf8');

test('runtime telemetry remains bounded before leaving the device', () => {
  assert.match(source, /\.join\(['"]\\n['"]\)\.slice\(0,\s*1200\)/);
  assert.match(source, /signature\s*=\s*[^;]+\.slice\(0,\s*500\)/);
});

test('runtime telemetry uses the protected server RPC instead of direct table writes', () => {
  assert.match(source, /supabase\.rpc\(['"]ateek_client_error_log['"]/);
  assert.doesNotMatch(source, /\.from\(['"][^'"]*error[^'"]*['"]\)\.(insert|upsert)\(/i);
});

test('runtime telemetry is deduplicated and reporting failures cannot break recovery UI', () => {
  assert.match(source, /TELEMETRY_DEDUPE_MS\s*=\s*30_000/);
  assert.match(source, /if\s*\(duplicate\)\s*return/);
  assert.match(source, /catch\s*\{\s*\/\/ Error reporting must never interfere with recovery UI\./s);
});

test('telemetry does not attach session credentials or auth tokens', () => {
  assert.doesNotMatch(source, /getSession\s*\(/);
  assert.doesNotMatch(source, /access_token|refresh_token|authorization\s*:/i);
});
