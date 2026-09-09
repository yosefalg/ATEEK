import fs from 'node:fs';

const file = 'src/ai/aiClient.ts';
let s = fs.readFileSync(file, 'utf8');

const replace = (from, to, label) => {
  if (!s.includes(from)) throw new Error(`Run175 AI anchor missing: ${label}`);
  s = s.replace(from, to);
};

replace(
  `  const response = await (async () => {\n    try {\n      return await fetch(\`${'${PROJECT_URL}'}/functions/v1/ai-chat\`, {\n        method: 'POST',\n        headers,\n        signal: controller.signal,\n        body: JSON.stringify({ mode, message: clean }),\n      });\n    } catch (error) {\n      if (error instanceof Error && error.name === 'AbortError') throw new Error('انتهت مهلة طلب الذكاء الاصطناعي. حاول مجددًا.');\n      throw new Error('تعذّر الاتصال بخدمة الذكاء الاصطناعي الآن.');\n    } finally {\n      clearTimeout(timeout);\n    }\n  })();`,
  `  const response = await fetch(\`${'${PROJECT_URL}'}/functions/v1/ai-chat\`, {\n    method: 'POST',\n    headers,\n    signal: controller.signal,\n    body: JSON.stringify({ mode, message: clean }),\n  }).catch(() => null).finally(() => clearTimeout(timeout));\n  if (!response) return await invokeProtectedTask<T>(mode, clean);`,
  'task network fallback',
);

fs.writeFileSync(file, s);
for (const needle of [
  ".catch(() => null).finally(() => clearTimeout(timeout))",
  "if (!response) return await invokeProtectedTask<T>(mode, clean);",
]) {
  if (!s.includes(needle)) throw new Error(`Run175 AI contract missing: ${needle}`);
}
console.log('Run #175 AI task reliability applied: network failures and request timeouts fall back to protected Gemini task handling.');
