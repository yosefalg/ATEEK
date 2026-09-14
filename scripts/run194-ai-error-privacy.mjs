import fs from 'node:fs';

const file = 'src/ai/aiClient.ts';
let s = fs.readFileSync(file, 'utf8');

const replaceAll = (from, to, minimum, label) => {
  const count = s.split(from).length - 1;
  if (count < minimum) throw new Error(`Run194 AI privacy anchor missing: ${label} (found ${count}, need ${minimum})`);
  s = s.split(from).join(to);
};
const replace = (from, to, label) => {
  if (!s.includes(from)) throw new Error(`Run194 AI privacy anchor missing: ${label}`);
  s = s.replace(from, to);
};

replaceAll(
  "if (error) throw new Error(error.message || 'تعذّر الاتصال بمساعد عتيك.');",
  "if (error) throw new Error('تعذّر الاتصال بمساعد عتيك الآن. حاول مجددًا.');",
  2,
  'protected assistant backend error sanitization',
);
replaceAll(
  "if (!answer) throw new Error(data?.message || 'لم يصل رد من مساعد عتيك.');",
  "if (!answer) throw new Error('لم يصل رد صالح من مساعد عتيك. حاول مجددًا.');",
  2,
  'protected assistant empty response sanitization',
);
replace(
  "if (!finished && !cancelled) emit({ type: 'error', message: error instanceof Error ? error.message : 'تعذّر الاتصال بخدمة ATEEK AI.' });",
  "if (!finished && !cancelled) emit({ type: 'error', message: 'تعذّر الاتصال بخدمة ATEEK AI الآن. حاول مجددًا.' });",
  'fallback exception sanitization',
);
replace(
  "      else if (typeof parsed?.message === 'string' && parsed.message.trim()) messageText = parsed.message;\n",
  '',
  'stream backend message sanitization',
);
replace(
  "    if (typeof json?.message === 'string' && json.message.trim()) throw new Error(json.message);\n",
  '',
  'task backend message sanitization',
);

fs.writeFileSync(file, s);

for (const forbidden of [
  "throw new Error(error.message || 'تعذّر الاتصال بمساعد عتيك.')",
  "throw new Error(data?.message || 'لم يصل رد من مساعد عتيك.')",
  "message: error instanceof Error ? error.message",
  'messageText = parsed.message',
  'throw new Error(json.message)',
]) {
  if (s.includes(forbidden)) throw new Error(`Run194 AI privacy contract failed: ${forbidden}`);
}
for (const required of [
  "if (parsed?.error === 'DAILY_LIMIT_REACHED') messageText = 'وصلت إلى حد استخدام المساعد لهذا اليوم.';",
  "else if (parsed?.error === 'CONTENT_BLOCKED') messageText = 'تعذّر إرسال هذا المحتوى وفق ضوابط الأمان.';",
  "if (json?.error === 'DAILY_LIMIT_REACHED') throw new Error('وصلت إلى حد استخدام المساعد لهذا اليوم.');",
  "if (json?.error === 'CONTENT_BLOCKED') throw new Error('تعذّر معالجة هذا المحتوى وفق ضوابط الأمان.');",
  "return await invokeProtectedTask<T>(mode, clean)",
]) {
  if (!s.includes(required)) throw new Error(`Run194 AI privacy contract missing: ${required}`);
}

console.log('Run #194 AI privacy hardening applied: backend exception details are hidden while known safe product errors and protected Gemini fallbacks remain intact.');
