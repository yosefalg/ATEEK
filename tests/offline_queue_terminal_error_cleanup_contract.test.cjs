const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/cloud/resilientAction.ts', 'utf8');

test('offline flush records terminal business errors instead of throwing before cleanup', () => {
  assert.match(source, /let terminalError:unknown;/);
  assert.match(source, /terminalError=e;\s*break;/s);
  assert.doesNotMatch(source, /catch\(e\)\{if\(looksNetworkError\(e\)\)break;\s*throw e;/s);
});

test('confirmed sent rows are persisted away before a terminal error is rethrown', () => {
  const cleanupIndex = source.indexOf('if(sentIds.size)');
  const throwIndex = source.indexOf('if(terminalError)throw terminalError;');
  assert.ok(cleanupIndex >= 0, 'sent row cleanup missing');
  assert.ok(throwIndex > cleanupIndex, 'terminal error must be thrown only after confirmed rows are removed');
  assert.match(source, /current\.filter\(row=>!sentIds\.has\(row\.id\)\)/);
});

test('network failures still stop replay without converting them into terminal business errors', () => {
  assert.match(source, /if\(looksNetworkError\(e\)\)break;\s*terminalError=e;/s);
});
