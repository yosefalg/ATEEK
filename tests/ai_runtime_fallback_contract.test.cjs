const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/ai/aiClient.ts', 'utf8');

test('ATEEK AI keeps the protected Gemini assistant as a real runtime fallback', () => {
  assert.match(source, /supabase\.functions\.invoke\('ateek-assistant'/);
  assert.match(source, /xhr\.status === 404 \|\| parsed\?\.error === 'OPENAI_NOT_CONFIGURED'/);
  assert.match(source, /onEvent\(\{ type: 'delta', delta: answer \}\)/);
  assert.match(source, /onEvent\(\{ type: 'done' \}\)/);
});

test('ATEEK AI fallback does not bypass explicit safety or daily-limit responses', () => {
  assert.match(source, /DAILY_LIMIT_REACHED/);
  assert.match(source, /CONTENT_BLOCKED/);
});
