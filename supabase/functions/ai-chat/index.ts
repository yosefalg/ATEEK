import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") || "gpt-5.6-sol";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const DAILY_LIMIT = Math.max(1, Math.min(200, Number(Deno.env.get("AI_CHAT_DAILY_LIMIT") || 50)));
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};
const jsonHeaders = { ...cors, "content-type": "application/json; charset=utf-8" };
const sseHeaders = { ...cors, "content-type": "text/event-stream; charset=utf-8", "cache-control": "no-cache", connection: "keep-alive" };

type AiMessage = { role: "user" | "assistant"; body: string };
type Mode = "chat" | "antique_expert" | "iraq_guide" | "marketplace" | "improve_listing" | "suggest_replies" | "listing_analysis";

function cleanText(value: unknown, max = 8000) {
  return String(value ?? "").replace(/\u0000/g, "").trim().slice(0, max);
}
function promptFor(mode: Mode) {
  const base = "أنت ATEEK AI، مساعد عتيك داخل سوق اجتماعي عراقي. أجب بالعربية الواضحة ما لم يطلب المستخدم لغة أخرى. لا تدّعِ رؤية بيانات أو أسعار أو حسابات لم تُرسل لك. فرّق بين الحقائق والتقدير، واذكر عدم اليقين عند تقدير الأسعار. لا تطلب كلمات مرور أو مفاتيح أو بيانات دفع.";
  if (mode === "antique_expert") return base + " ركّز كخبير تحف ومقتنيات: اشرح السمات المرئية/المذكورة، مؤشرات الأصالة، عوامل التسعير، وما يحتاج فحصاً بشرياً. لا تجزم بالأصالة من صورة أو وصف فقط.";
  if (mode === "iraq_guide") return base + " اعمل كمرشد عملي داخل العراق مع مراعاة اختلاف المحافظات، ووضّح عندما تحتاج المعلومة إلى تحقق حديث.";
  if (mode === "marketplace") return base + " ركّز على البيع والشراء، تحسين الإعلان، التفاوض، كشف الإشارات المريبة، وصياغة ردود مهذبة ومختصرة.";
  if (mode === "improve_listing") return base + " حسّن وصف الإعلان فقط. أعد نصاً جذاباً ومهنياً بلا مبالغة ولا اختلاق مواصفات، وبحد أقصى 700 حرف.";
  if (mode === "suggest_replies") return base + " اقترح ثلاثة ردود قصيرة مختلفة النبرة للمحادثة التجارية. أعد JSON فقط بالشكل {\"replies\":[\"...\",\"...\",\"...\"]}.";
  if (mode === "listing_analysis") return base + " حلل إعلان السوق بناءً حصراً على البيانات والسياق المرسلين. اشرح السعر المعلن، نطاقاً تقريبياً إن أمكن من البيانات، عوامل الرفع والخفض، وإشارات المخاطرة. لا تخترع أسعار سوق أو مصادر خارجية ولا تجزم بالأصالة.";
  return base;
}
function bearer(req: Request) {
  const value = req.headers.get("authorization") || "";
  return value.toLowerCase().startsWith("bearer ") ? value : "";
}
async function getUser(req: Request) {
  const auth = bearer(req);
  if (!auth || !SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/user`, { headers: { authorization: auth, apikey: SUPABASE_ANON_KEY } });
  if (!response.ok) return null;
  const user = await response.json();
  return user?.id ? { id: String(user.id), auth } : null;
}
function restHeaders(auth: string, prefer?: string) {
  return {
    authorization: auth,
    apikey: SUPABASE_ANON_KEY,
    "content-type": "application/json",
    ...(prefer ? { prefer } : {}),
  };
}
async function countToday(userId: string, auth: string) {
  const start = new Date(); start.setUTCHours(0, 0, 0, 0);
  const url = `${SUPABASE_URL}/rest/v1/ateek_ai_messages?select=id&user_id=eq.${encodeURIComponent(userId)}&role=eq.user&created_at=gte.${encodeURIComponent(start.toISOString())}&limit=1`;
  const r = await fetch(url, { headers: restHeaders(auth, "count=exact") });
  if (!r.ok) return 0;
  const range = r.headers.get("content-range") || "";
  const total = Number(range.split("/")[1]);
  return Number.isFinite(total) ? total : 0;
}
async function ensureThread(threadId: unknown, userId: string, auth: string, titleSeed: string) {
  const candidate = cleanText(threadId, 80);
  if (candidate) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/ateek_ai_threads?select=id&id=eq.${encodeURIComponent(candidate)}&user_id=eq.${encodeURIComponent(userId)}&limit=1`, { headers: restHeaders(auth) });
    const rows = r.ok ? await r.json() : [];
    if (Array.isArray(rows) && rows[0]?.id) return String(rows[0].id);
  }
  const created = await fetch(`${SUPABASE_URL}/rest/v1/ateek_ai_threads?select=id`, {
    method: "POST", headers: restHeaders(auth, "return=representation"),
    body: JSON.stringify({ user_id: userId, title: titleSeed.slice(0, 70) || "محادثة جديدة" }),
  });
  if (!created.ok) throw new Error("THREAD_CREATE_FAILED");
  const rows = await created.json();
  if (!rows?.[0]?.id) throw new Error("THREAD_CREATE_FAILED");
  return String(rows[0].id);
}
async function insertMessage(threadId: string, userId: string, auth: string, role: "user" | "assistant", body: string) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/ateek_ai_messages`, {
    method: "POST", headers: restHeaders(auth, "return=minimal"),
    body: JSON.stringify({ thread_id: threadId, user_id: userId, role, body }),
  });
  if (!r.ok) throw new Error("MESSAGE_STORE_FAILED");
  await fetch(`${SUPABASE_URL}/rest/v1/ateek_ai_threads?id=eq.${encodeURIComponent(threadId)}&user_id=eq.${encodeURIComponent(userId)}`, {
    method: "PATCH", headers: restHeaders(auth, "return=minimal"), body: JSON.stringify({ updated_at: new Date().toISOString() }),
  }).catch(() => {});
}
async function history(threadId: string, userId: string, auth: string): Promise<AiMessage[]> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/ateek_ai_messages?select=role,body&thread_id=eq.${encodeURIComponent(threadId)}&user_id=eq.${encodeURIComponent(userId)}&order=created_at.desc&limit=20`, { headers: restHeaders(auth) });
  if (!r.ok) return [];
  const rows = await r.json();
  return (Array.isArray(rows) ? rows : []).reverse().map((row: any) => ({ role: row.role === "assistant" ? "assistant" : "user", body: cleanText(row.body, 12000) }));
}
async function moderate(text: string) {
  if (!OPENAI_KEY) return { ok: false, reason: "OPENAI_NOT_CONFIGURED" } as const;
  const r = await fetch("https://api.openai.com/v1/moderations", {
    method: "POST",
    headers: { authorization: `Bearer ${OPENAI_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: "omni-moderation-latest", input: text }),
  });
  if (!r.ok) return { ok: false, reason: "MODERATION_UPSTREAM_ERROR" } as const;
  const j = await r.json();
  return j?.results?.[0]?.flagged ? { ok: false, reason: "CONTENT_BLOCKED" } as const : { ok: true } as const;
}
function extractOutput(json: any) {
  if (typeof json?.output_text === "string") return json.output_text.trim();
  const out = Array.isArray(json?.output) ? json.output : [];
  return out.flatMap((item: any) => Array.isArray(item?.content) ? item.content : []).filter((part: any) => part?.type === "output_text").map((part: any) => String(part.text || "")).join("").trim();
}
function openAiBody(messages: AiMessage[], mode: Mode, stream: boolean) {
  return {
    model: OPENAI_MODEL,
    instructions: promptFor(mode),
    input: messages.map(m => ({ role: m.role, content: m.body })),
    max_output_tokens: mode === "suggest_replies" ? 700 : mode === "improve_listing" ? 1200 : mode === "listing_analysis" ? 1800 : 4096,
    stream,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED" }), { status: 405, headers: jsonHeaders });
  if (!OPENAI_KEY) return new Response(JSON.stringify({ error: "OPENAI_NOT_CONFIGURED" }), { status: 503, headers: jsonHeaders });
  const user = await getUser(req);
  if (!user) return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), { status: 401, headers: jsonHeaders });
  try {
    const body = await req.json();
    const allowedModes = ["chat","antique_expert","iraq_guide","marketplace","improve_listing","suggest_replies","listing_analysis"] as const;
    const requested = String(body?.mode);
    const mode = (allowedModes as readonly string[]).includes(requested) ? requested as Mode : "chat";
    const message = cleanText(body?.message, 8000);
    if (!message) return new Response(JSON.stringify({ error: "MESSAGE_REQUIRED" }), { status: 400, headers: jsonHeaders });

    const moderation = await moderate(message);
    if (!moderation.ok) return new Response(JSON.stringify({ error: moderation.reason }), { status: moderation.reason === "CONTENT_BLOCKED" ? 400 : 502, headers: jsonHeaders });

    if (mode === "chat" || mode === "antique_expert" || mode === "iraq_guide" || mode === "marketplace") {
      const used = await countToday(user.id, user.auth);
      if (used >= DAILY_LIMIT) return new Response(JSON.stringify({ error: "DAILY_LIMIT_REACHED", limit: DAILY_LIMIT }), { status: 429, headers: jsonHeaders });
      const threadId = await ensureThread(body?.threadId, user.id, user.auth, message);
      await insertMessage(threadId, user.id, user.auth, "user", message);
      const messages = await history(threadId, user.id, user.auth);
      const upstream = await fetch("https://api.openai.com/v1/responses", {
        method: "POST",
        headers: { authorization: `Bearer ${OPENAI_KEY}`, "content-type": "application/json" },
        body: JSON.stringify(openAiBody(messages, mode, true)),
      });
      if (!upstream.ok || !upstream.body) {
        const detail = (await upstream.text()).slice(0, 500);
        return new Response(JSON.stringify({ error: "OPENAI_UPSTREAM_ERROR", status: upstream.status, detail }), { status: 502, headers: jsonHeaders });
      }
      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();
      void (async () => {
        let assistant = "";
        let buffer = "";
        const reader = upstream.body!.getReader();
        const decoder = new TextDecoder();
        const send = (payload: unknown) => writer.write(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
        try {
          await send({ type: "meta", threadId, model: OPENAI_MODEL, limit: DAILY_LIMIT, remaining: Math.max(0, DAILY_LIMIT - used - 1) });
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const blocks = buffer.split("\n\n");
            buffer = blocks.pop() || "";
            for (const block of blocks) {
              const line = block.split("\n").find(x => x.startsWith("data:"));
              if (!line) continue;
              const raw = line.slice(5).trim();
              if (!raw || raw === "[DONE]") continue;
              let event: any; try { event = JSON.parse(raw); } catch { continue; }
              if (event?.type === "response.output_text.delta" && typeof event.delta === "string") {
                assistant += event.delta;
                await send({ type: "delta", delta: event.delta });
              } else if (event?.type === "response.failed" || event?.type === "error") {
                await send({ type: "error", message: "تعذّر إكمال الرد الآن." });
              }
            }
          }
          const finalText = assistant.trim();
          if (finalText) await insertMessage(threadId, user.id, user.auth, "assistant", finalText);
          await send({ type: "done", threadId });
        } catch (error) {
          try { await send({ type: "error", message: String(error).slice(0, 300) }); } catch {}
        } finally {
          try { await writer.close(); } catch {}
        }
      })();
      return new Response(readable, { headers: sseHeaders });
    }

    const upstream = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: { authorization: `Bearer ${OPENAI_KEY}`, "content-type": "application/json" },
      body: JSON.stringify(openAiBody([{ role: "user", body: message }], mode, false)),
    });
    if (!upstream.ok) return new Response(JSON.stringify({ error: "OPENAI_UPSTREAM_ERROR", status: upstream.status }), { status: 502, headers: jsonHeaders });
    const json = await upstream.json();
    const output = extractOutput(json);
    if (mode === "suggest_replies") {
      let replies: string[] = [];
      try { const parsed = JSON.parse(output); replies = Array.isArray(parsed?.replies) ? parsed.replies.map((x: unknown) => cleanText(x, 300)).filter(Boolean).slice(0, 3) : []; } catch {}
      return new Response(JSON.stringify({ replies, model: OPENAI_MODEL }), { headers: jsonHeaders });
    }
    return new Response(JSON.stringify({ output, model: OPENAI_MODEL }), { headers: jsonHeaders });
  } catch (error) {
    return new Response(JSON.stringify({ error: "BAD_REQUEST", message: String(error).slice(0, 500) }), { status: 400, headers: jsonHeaders });
  }
});
