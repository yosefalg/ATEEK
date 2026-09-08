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

test('ATEEK AI never leaves a successful HTTP stream permanently busy when the terminal SSE event is missing', () => {
  assert.match(source, /let terminalSeen = false;/);
  assert.match(source, /event\.type === 'done' \|\| event\.type === 'error'/);
  assert.match(source, /if \(!terminalSeen\) emit\(\{ type: 'error', message: 'انقطع بث الرد قبل اكتماله\. حاول الإرسال مجددًا\.' \}\);/);
});

test('ATEEK AI cancellation suppresses late fallback events and aborts the active request', () => {
  assert.match(source, /let cancelled = false;/);
  assert.match(source, /if \(cancelled\) return;/);
  assert.match(source, /if \(fallbackStarted \|\| finished \|\| cancelled\) return;/);
  assert.match(source, /cancelled = true;\s*finished = true;\s*try \{ xhr\.abort\(\); \} catch \{\}/s);
});
