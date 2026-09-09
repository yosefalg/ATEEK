import fs from 'node:fs';

const file='src/ai/aiClient.ts';
let s=fs.readFileSync(file,'utf8');
const replace=(from,to,label)=>{if(!s.includes(from))throw new Error(`Run173 AI anchor missing: ${label}`);s=s.replace(from,to)};

if(!s.includes('async function invokeProtectedTask<T>')){
  const anchor=`export async function streamAiReply({ message, threadId, mode = 'chat', onEvent }: StreamArgs) {`;
  const helper=`async function invokeProtectedTask<T>(mode: AiTaskMode, message: string): Promise<T> {\n  const instructions: Record<AiTaskMode, string> = {\n    improve_listing: 'حسّن وصف الإعلان التالي بالعربية بوضوح وبدون اختلاق معلومات. أعد الوصف المحسن فقط.',\n    listing_analysis: 'حلل الإعلان التالي كمساعد سوق عراقي. اذكر الملاحظات العملية والمخاطر بوضوح ولا تدّع معلومات غير موجودة. أعد التحليل فقط.',\n    suggest_replies: 'اقترح ثلاثة ردود عربية قصيرة وطبيعية على المحادثة التالية. ضع كل رد في سطر مستقل فقط، ولا ترسل أي شيء نيابة عن المستخدم.',\n  };\n  const { data, error } = await supabase.functions.invoke('ateek-assistant', {\n    body: { question: instructions[mode] + '\\\\n\\\\n' + message.trim().slice(0, 3000), listings: [], favoritesCount: 0, messagesCount: 0, offersCount: 0 },\n  });\n  if (error) throw new Error(error.message || 'تعذّر الاتصال بمساعد عتيك.');\n  const answer = typeof data?.answer === 'string' ? data.answer.trim() : '';\n  if (!answer) throw new Error(data?.message || 'لم يصل رد من مساعد عتيك.');\n  if (mode === 'suggest_replies') {\n    const replies = answer.split(/\\\\n+/).map((item: string) => item.replace(/^\\\\s*(?:[-•*]|\\\\d+[.)-]?)\\\\s*/, '').trim()).filter(Boolean).slice(0, 3);\n    if (!replies.length) throw new Error('لم يصل اقتراح رد صالح من مساعد عتيك.');\n    return { replies } as T;\n  }\n  return { output: answer } as T;\n}\n\n`;
  replace(anchor,helper+anchor,'protected task fallback helper');
}

replace(
  `if (xhr.status === 404 || parsed?.error === 'OPENAI_NOT_CONFIGURED') {`,
  `if (xhr.status === 404 || xhr.status >= 500 || parsed?.error === 'OPENAI_NOT_CONFIGURED') {`,
  'assistant fallback on upstream outage',
);
replace(
  `if (json?.error === 'OPENAI_NOT_CONFIGURED') throw new Error('خدمة OpenAI غير مهيأة على الخادم بعد.');`,
  `if (json?.error === 'OPENAI_NOT_CONFIGURED' || response.status === 404 || response.status >= 500) return await invokeProtectedTask<T>(mode, clean);`,
  'task fallback to protected Gemini assistant',
);

fs.writeFileSync(file,s);
for(const needle of [
  'async function invokeProtectedTask<T>',
  "xhr.status === 404 || xhr.status >= 500 || parsed?.error === 'OPENAI_NOT_CONFIGURED'",
  "return await invokeProtectedTask<T>(mode, clean)",
]) if(!s.includes(needle))throw new Error(`Run173 AI contract missing: ${needle}`);
console.log('Run #173 AI fallback hardening applied: protected Gemini fallback covers assistant upstream outages and OpenAI-unavailable task modes.');
