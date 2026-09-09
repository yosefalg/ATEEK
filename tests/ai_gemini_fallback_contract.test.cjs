const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const transform = fs.readFileSync('scripts/run173-ai-gemini-fallback-hardening.mjs', 'utf8');
const source = fs.readFileSync('src/ai/aiClient.ts', 'utf8');
const chain = fs.readFileSync('scripts/run77-reels-transform.mjs', 'utf8');

test('general ATEEK AI falls back to protected assistant on upstream outages', () => {
  assert.match(transform, /xhr\.status === 404 \|\| xhr\.status >= 500/);
  assert.match(source, /await invokeProtectedAssistant\(message, emit\)/);
});

test('AI task modes fall back to protected Gemini when OpenAI endpoint is unavailable', () => {
  assert.match(source, /async function invokeProtectedTask<T>/);
  assert.match(source, /supabase\.functions\.invoke\('ateek-assistant'/);
  assert.match(source, /improve_listing:/);
  assert.match(source, /listing_analysis:/);
  assert.match(source, /suggest_replies:/);
  assert.match(source, /return await invokeProtectedTask<T>\(mode, clean\)/);
});

test('fallback does not bypass explicit daily/content limits and is in production transform chain', () => {
  assert.match(source, /json\?\.error === 'DAILY_LIMIT_REACHED'/);
  assert.match(source, /json\?\.error === 'CONTENT_BLOCKED'/);
  assert.match(chain, /run173-ai-gemini-fallback-hardening\.mjs/);
});
