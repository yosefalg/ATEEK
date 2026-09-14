const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');

const source = fs.readFileSync('src/ai/aiClient.ts', 'utf8');

test('AI client does not expose arbitrary backend exception details', () => {
  assert.doesNotMatch(source, /throw new Error\(error\.message \|\| 'تعذّر الاتصال بمساعد عتيك\.'\)/);
  assert.doesNotMatch(source, /throw new Error\(data\?\.message \|\| 'لم يصل رد من مساعد عتيك\.'\)/);
  assert.doesNotMatch(source, /message: error instanceof Error \? error\.message/);
  assert.doesNotMatch(source, /messageText = parsed\.message/);
  assert.doesNotMatch(source, /throw new Error\(json\.message\)/);
  assert.match(source, /تعذّر الاتصال بمساعد عتيك الآن\. حاول مجددًا\./);
  assert.match(source, /لم يصل رد صالح من مساعد عتيك\. حاول مجددًا\./);
});

test('AI client preserves safe product errors and protected fallback behavior', () => {
  assert.match(source, /DAILY_LIMIT_REACHED/);
  assert.match(source, /CONTENT_BLOCKED/);
  assert.match(source, /invokeProtectedAssistant/);
  assert.match(source, /invokeProtectedTask<T>/);
  assert.match(source, /return await invokeProtectedTask<T>\(mode, clean\)/);
  assert.match(source, /Authorization: `Bearer \$\{data\.session\.access_token\}`/);
});
