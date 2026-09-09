import AsyncStorage from '@react-native-async-storage/async-storage';
import { PROJECT_URL, PUBLIC_KEY, supabase } from '../cloud/client';

export type AiMode = 'chat' | 'antique_expert' | 'iraq_guide' | 'marketplace';
export type AiTaskMode = 'improve_listing' | 'suggest_replies' | 'listing_analysis';
export type AiStreamEvent =
  | { type: 'meta'; threadId?: string; model?: string; limit?: number; remaining?: number }
  | { type: 'delta'; delta: string }
  | { type: 'done'; threadId?: string }
  | { type: 'error'; message?: string };

type StreamArgs = {
  message: string;
  threadId?: string | null;
  mode?: AiMode;
  onEvent: (event: AiStreamEvent) => void;
};

async function authHeaders() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('يلزم تسجيل الدخول لاستخدام ATEEK AI.');
  return {
    Authorization: `Bearer ${data.session.access_token}`,
    apikey: PUBLIC_KEY,
    'Content-Type': 'application/json',
  };
}

function safeJson(value: string) {
  try { return JSON.parse(value) as AiStreamEvent; } catch { return null; }
}

async function invokeProtectedAssistant(message: string, onEvent: (event: AiStreamEvent) => void) {
  const { data, error } = await supabase.functions.invoke('ateek-assistant', {
    body: {
      question: message.trim(),
      listings: [],
      favoritesCount: 0,
      messagesCount: 0,
      offersCount: 0,
    },
  });
  if (error) throw new Error(error.message || 'تعذّر الاتصال بمساعد عتيك.');
  const answer = typeof data?.answer === 'string' ? data.answer.trim() : '';
  if (!answer) throw new Error(data?.message || 'لم يصل رد من مساعد عتيك.');
  onEvent({ type: 'meta', model: typeof data?.model === 'string' ? data.model : 'Gemini' });
  onEvent({ type: 'delta', delta: answer });
  onEvent({ type: 'done' });
}

export async function streamAiReply({ message, threadId, mode = 'chat', onEvent }: StreamArgs) {
  const headers = await authHeaders();
  const xhr = new XMLHttpRequest();
  let consumed = 0;
  let buffer = '';
  let finished = false;
  let fallbackStarted = false;
  let terminalSeen = false;
  let cancelled = false;
  const url = `${PROJECT_URL}/functions/v1/ai-chat`;

  const emit = (event: AiStreamEvent) => {
    if (cancelled) return;
    if (event.type === 'done' || event.type === 'error') terminalSeen = true;
    onEvent(event);
  };

  const runFallback = async () => {
    if (fallbackStarted || finished || cancelled) return;
    fallbackStarted = true;
    try {
      await invokeProtectedAssistant(message, emit);
      finished = true;
    } catch (error) {
      if (!finished && !cancelled) emit({ type: 'error', message: error instanceof Error ? error.message : 'تعذّر الاتصال بخدمة ATEEK AI.' });
      finished = true;
    }
  };

  const consume = () => {
    const chunk = xhr.responseText.slice(consumed);
    consumed = xhr.responseText.length;
    if (!chunk) return;
    buffer += chunk.replace(/\r\n/g, '\n');
    const blocks = buffer.split('\n\n');
    buffer = blocks.pop() ?? '';
    for (const block of blocks) {
      const line = block.split('\n').find(item => item.startsWith('data:'));
      if (!line) continue;
      const parsed = safeJson(line.slice(5).trim());
      if (parsed) emit(parsed);
    }
  };

  xhr.open('POST', url, true);
  Object.entries(headers).forEach(([key, value]) => xhr.setRequestHeader(key, value));
  xhr.setRequestHeader('Accept', 'text/event-stream');
  xhr.onprogress = consume;
  xhr.onload = () => {
    consume();
    if (finished || cancelled) return;
    if (xhr.status < 200 || xhr.status >= 300) {
      let parsed: any = null;
      try { parsed = JSON.parse(xhr.responseText); } catch {}
      if (xhr.status === 404 || parsed?.error === 'OPENAI_NOT_CONFIGURED') {
        void runFallback();
        return;
      }
      finished = true;
      let messageText = 'تعذّر الاتصال بالمساعد الآن.';
      if (parsed?.error === 'DAILY_LIMIT_REACHED') messageText = 'وصلت إلى حد استخدام المساعد لهذا اليوم.';
      else if (parsed?.error === 'CONTENT_BLOCKED') messageText = 'تعذّر إرسال هذا المحتوى وفق ضوابط الأمان.';
      else if (typeof parsed?.message === 'string' && parsed.message.trim()) messageText = parsed.message;
      emit({ type: 'error', message: messageText });
      return;
    }
    finished = true;
    if (!terminalSeen) emit({ type: 'error', message: 'انقطع بث الرد قبل اكتماله. حاول الإرسال مجددًا.' });
  };
  xhr.onerror = () => {
    if (!finished && !cancelled) void runFallback();
  };
  xhr.ontimeout = () => {
    if (!finished && !cancelled) void runFallback();
  };
  xhr.timeout = 120000;
  xhr.send(JSON.stringify({ message: message.trim(), threadId: threadId || undefined, mode }));
  return () => {
    cancelled = true;
    finished = true;
    try { xhr.abort(); } catch {}
  };
}

const CACHE_PREFIX = 'ateek.ai.task.v1.';
function cacheKey(mode: AiTaskMode, message: string) {
  let hash = 2166136261;
  const input = `${mode}:${message}`;
  for (let i = 0; i < input.length; i++) { hash ^= input.charCodeAt(i); hash = Math.imul(hash, 16777619); }
  return CACHE_PREFIX + (hash >>> 0).toString(36);
}

export async function callAiTask<T = { output?: string; replies?: string[] }>(mode: AiTaskMode, message: string, ttlMs = 24 * 60 * 60 * 1000): Promise<T> {
  const clean = message.trim();
  if (!clean) throw new Error('لا يوجد نص لإرساله إلى المساعد.');
  const key = cacheKey(mode, clean);
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw) {
      const cached = JSON.parse(raw) as { at: number; value: T };
      if (Date.now() - cached.at < ttlMs) return cached.value;
      void AsyncStorage.removeItem(key);
    }
  } catch {}

  const headers = await authHeaders();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  const response = await (async () => {
    try {
      return await fetch(`${PROJECT_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers,
        signal: controller.signal,
        body: JSON.stringify({ mode, message: clean }),
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') throw new Error('انتهت مهلة طلب الذكاء الاصطناعي. حاول مجددًا.');
      throw new Error('تعذّر الاتصال بخدمة الذكاء الاصطناعي الآن.');
    } finally {
      clearTimeout(timeout);
    }
  })();
  const json = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (json?.error === 'OPENAI_NOT_CONFIGURED') throw new Error('خدمة OpenAI غير مهيأة على الخادم بعد.');
    if (json?.error === 'DAILY_LIMIT_REACHED') throw new Error('وصلت إلى حد استخدام المساعد لهذا اليوم.');
    if (json?.error === 'CONTENT_BLOCKED') throw new Error('تعذّر معالجة هذا المحتوى وفق ضوابط الأمان.');
    if (typeof json?.message === 'string' && json.message.trim()) throw new Error(json.message);
    throw new Error('تعذّر إكمال طلب الذكاء الاصطناعي الآن.');
  }
  try { await AsyncStorage.setItem(key, JSON.stringify({ at: Date.now(), value: json })); } catch {}
  return json as T;
}
