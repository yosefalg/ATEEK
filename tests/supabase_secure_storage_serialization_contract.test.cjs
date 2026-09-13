const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/cloud/client.ts', 'utf8');

test('Supabase SecureStore session operations are serialized across version swaps and cleanup', () => {
  assert.match(source, /let storageOperation: Promise<void> = Promise\.resolve\(\);/);
  assert.match(source, /async function serializeStorage<T>\(task: \(\) => Promise<T>\): Promise<T>/);
  assert.match(source, /storageOperation = run\.then\(\(\) => \{\}, \(\) => \{\}\);/);
  assert.match(source, /async getItem\(key: string\) \{\s*return serializeStorage\(async \(\) => \{/s);
  assert.match(source, /async setItem\(key: string, value: string\) \{\s*return serializeStorage\(async \(\) => \{/s);
  assert.match(source, /async removeItem\(key: string\) \{\s*return serializeStorage\(async \(\) => \{/s);
});

test('session storage keeps atomic publish ordering before stale chunk cleanup', () => {
  const writeChunk = source.indexOf("SecureStore.setItemAsync(key + '.' + version + '.' + i");
  const publishIndex = source.indexOf('SecureStore.setItemAsync(key, JSON.stringify({version,count}))');
  const cleanupOld = source.indexOf("SecureStore.deleteItemAsync(key + '.' + old.version + '.' + i)", publishIndex);
  assert.ok(writeChunk >= 0 && publishIndex > writeChunk && cleanupOld > publishIndex);
});

test('logical session removal is not failed by best-effort stale chunk cleanup', () => {
  assert.match(source, /await SecureStore\.deleteItemAsync\(key\);\s*if \(old\) for \(let i=0;i<old\.count;i\+\+\) await SecureStore\.deleteItemAsync\(key \+ '\.' \+ old\.version \+ '\.' \+ i\)\.catch\(\(\) => \{\}\);/s);
  assert.match(source, /auth: \{ storage, persistSession: true, autoRefreshToken: true, detectSessionInUrl: false, lock: processLock \}/);
});

test('session storage preserves the Storage contract for empty string values', () => {
  assert.match(source, /const count = Math\.max\(1, Math\.ceil\(value\.length \/ 500\)\);/);
  assert.match(source, /if \(typeof v\.version !== 'string' \|\| !Number\.isInteger\(v\.count\) \|\| v\.count < 1 \|\| v\.count > 100\)/);
});

test('failed session writes roll back newly written SecureStore chunks before surfacing the error', () => {
  assert.match(source, /let written = 0;\s*try \{/s);
  assert.match(source, /written = i \+ 1;/);
  assert.match(source, /catch \(error\) \{\s*for \(let i=0;i<written;i\+\+\) await SecureStore\.deleteItemAsync\(key \+ '\.' \+ version \+ '\.' \+ i\)\.catch\(\(\) => \{\}\);\s*throw error;\s*\}/s);
});
