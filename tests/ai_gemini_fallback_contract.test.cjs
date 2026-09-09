const fs = require('node:fs');
const test = require('node:test');
const assert = require('node:assert/strict');

const transform = fs.readFileSync('scripts/run173-ai-gemini-fallback-hardening.mjs', 'utf8');
const chain = fs.readFileSync('scripts/run77-reels-transform.mjs', 'utf8');

test('general ATEEK AI falls back to protected assistant on upstream outages', () => {
  assert.match(transform, /xhr\.status === 404 \|\| xhr\.status >= 500/);
  assert.match(transform, /invokeProtectedAssistant\(message, emit\)/);
});

test('AI task modes fall back to protected Gemini when OpenAI endpoint is unavailable', () => {
  assert.match(transform, /async function invokeProtectedTask<T>/);
  assert.match(transform, /supabase\.functions\.invoke\('ateek-assistant'/);
  assert.match(transform, /improve_listing:/);
  assert.match(transform, /listing_analysis:/);
  assert.match(transform, /suggest_replies:/);
  assert.match(transform, /return await invokeProtectedTask<T>\(mode, clean\)/);
});

test('fallback does not bypass explicit daily/content limits and is in production transform chain', () => {
  assert.doesNotMatch(transform, /DAILY_LIMIT_REACHED.*invokeProtectedTask/s);
  assert.doesNotMatch(transform, /CONTENT_BLOCKED.*invokeProtectedTask/s);
  assert.match(chain, /run173-ai-gemini-fallback-hardening\.mjs/);
});
