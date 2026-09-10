const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/cloud/resilientAction.ts', 'utf8');

test('offline queue serializes enqueue mutations so parallel actions cannot overwrite each other', () => {
  assert.match(source, /let queueMutation:Promise<void>=Promise\.resolve\(\)/);
  assert.match(source, /async function mutateQueue<T>/);
  assert.match(source, /await mutateQueue\(async\(\)=>\{const rows=await readQueue\(\);await writeQueue\(coalesceQueue\(rows,row\)\);\}\)/);
  assert.match(source, /function coalesceQueue\(rows:QueueItem\[],incoming:QueueItem\)/);
});

test('offline flush removes only confirmed sent ids from the latest queue snapshot', () => {
  assert.match(source, /const sentIds=new Set<string>\(\)/);
  assert.match(source, /sentIds\.add\(row\.id\)/);
  assert.match(source, /const current=await readQueue\(\)/);
  assert.match(source, /current\.filter\(row=>!sentIds\.has\(row\.id\)\)/);
  assert.doesNotMatch(source, /await writeQueue\(pending\)/);
});

test('offline flush stops on connectivity failure without converting it into a terminal business error', () => {
  assert.match(source, /catch\(e\)\{\s*if\(looksNetworkError\(e\)\)break;\s*terminalError=e;\s*break;\s*\}/s);
  assert.match(source, /if\(terminalError\)throw terminalError/);
});

test('offline flush fails closed on non-network replay errors while cleaning confirmed work first', () => {
  const catchIndex = source.indexOf('catch(e){\n        if(looksNetworkError(e))break;\n        terminalError=e;\n        break;');
  const cleanupIndex = source.indexOf('if(sentIds.size){');
  const throwIndex = source.indexOf('if(terminalError)throw terminalError;');
  assert.ok(catchIndex >= 0, 'terminal replay error must stop ordered replay');
  assert.ok(cleanupIndex > catchIndex, 'confirmed action cleanup must run after replay stops');
  assert.ok(throwIndex > cleanupIndex, 'terminal error must be rethrown only after confirmed cleanup');
});

test('persisted offline queue accepts only known queueable action names and object payloads', () => {
  assert.match(source, /function isQueueItem\(value:unknown\):value is QueueItem/);
  assert.match(source, /QUEUEABLE\.has\(value\.name\)/);
  assert.match(source, /isRecord\(value\.payload\)/);
  assert.match(source, /parsed\.filter\(isQueueItem\)/);
});

test('persisted offline queue rejects malformed identity and timestamps before replay', () => {
  assert.match(source, /typeof value\.id==='string'&&value\.id\.length>0/);
  assert.match(source, /typeof value\.createdAt==='number'&&Number\.isFinite\(value\.createdAt\)/);
});

test('malformed persisted queue self-heals without deleting data on a storage read failure', () => {
  assert.match(source, /try\{raw=await AsyncStorage\.getItem\(KEY\);\}catch\{return\[\];\}/);
  assert.match(source, /if\(!Array\.isArray\(parsed\)\)\{\s*await AsyncStorage\.removeItem\(KEY\)\.catch\(\(\)=>\{\}\);\s*return\[\];\s*\}/s);
  assert.match(source, /if\(rows\.length!==parsed\.length\)\{\s*await AsyncStorage\.setItem\(KEY,JSON\.stringify\(compactQueueForStorage\(rows\)\)\)\.catch\(\(\)=>\{\}\);\s*\}/s);
  assert.match(source, /catch\{\s*await AsyncStorage\.removeItem\(KEY\)\.catch\(\(\)=>\{\}\);\s*return\[\];\s*\}/s);
});
