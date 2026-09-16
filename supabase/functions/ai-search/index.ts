import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const OPENAI_KEY = Deno.env.get("OPENAI_API_KEY");
const OPENAI_MODEL = Deno.env.get("OPENAI_FAST_MODEL") || Deno.env.get("OPENAI_MODEL") || "gpt-5.6-sol";
const GEMINI_KEY = Deno.env.get("GEMINI_API_KEY");
const GEMINI_MODEL = Deno.env.get("GEMINI_MODEL") || "gemini-3.6-flash";
const headers = { "content-type": "application/json; charset=utf-8", "access-control-allow-origin": "*", "access-control-allow-headers": "authorization, apikey, content-type" };

function cleanTerms(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  return input.map(v => String(v).trim()).filter(Boolean).slice(0, 8);
}
function extractOutput(json: any) {
  if (typeof json?.output_text === "string") return json.output_text.trim();
  return (Array.isArray(json?.output) ? json.output : []).flatMap((item: any) => Array.isArray(item?.content) ? item.content : []).filter((part: any) => part?.type === "output_text").map((part: any) => String(part.text || "")).join("").trim();
}
function parseObject(raw: string) {
  const stripped = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  try { return JSON.parse(stripped); } catch { return {}; }
}
async function openAi(prompt: string) {
  if (!OPENAI_KEY) return null;
  const r = await fetch("https://api.openai.com/v1/responses", {
    method: "POST", headers: { authorization: `Bearer ${OPENAI_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({ model: OPENAI_MODEL, instructions: "أنت محرك توسيع بحث لسوق عتيك العراقي. أعد JSON صالحاً فقط دون Markdown.", input: prompt, max_output_tokens: 500 }),
  });
  if (!r.ok) throw new Error(`OPENAI_${r.status}`);
  return extractOutput(await r.json());
}
async function gemini(prompt: string) {
  if (!GEMINI_KEY) return null;
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_KEY}`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { responseMimeType: "application/json", temperature: 0.2, maxOutputTokens: 300 } }),
  });
  if (!r.ok) throw new Error(`GEMINI_${r.status}`);
  const j = await r.json();
  return String(j?.candidates?.[0]?.content?.parts?.[0]?.text || "{}");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST") return new Response(JSON.stringify({ error: "METHOD_NOT_ALLOWED" }), { status: 405, headers });
  try {
    const { text, categories } = await req.json();
    const q = String(text || "").trim().slice(0, 500);
    if (q.length < 2) return new Response(JSON.stringify({ error: "QUERY_TOO_SHORT" }), { status: 400, headers });
    if (!OPENAI_KEY && !GEMINI_KEY) return new Response(JSON.stringify({ error: "AI_NOT_CONFIGURED" }), { status: 503, headers });
    const prompt = `حوّل وصف المستخدم إلى بحث سوق مختصر وآمن. أعد JSON فقط بالشكل {"query":"...","terms":["..."],"category":null}. لا تخترع حقولاً. terms كلمات عربية/إنجليزية مناسبة للبحث ilike. اختر category فقط من الأقسام المتاحة أو null. الأقسام: ${JSON.stringify(categories || [])}. النص: ${q}`;
    let raw = "{}", provider = "openai";
    try { raw = await openAi(prompt) || "{}"; }
    catch { provider = "gemini-fallback"; raw = await gemini(prompt) || "{}"; }
    const parsed: any = parseObject(raw);
    const terms = cleanTerms(parsed.terms);
    const allowed = new Set((Array.isArray(categories) ? categories : []).map((x: any) => String(x?.id || x)).filter(Boolean));
    const candidate = parsed.category == null ? null : String(parsed.category);
    const category = candidate && allowed.has(candidate) ? candidate : null;
    return new Response(JSON.stringify({ query: String(parsed.query || q).slice(0, 300), terms, category, provider, model: provider === "openai" ? OPENAI_MODEL : GEMINI_MODEL }), { headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: "BAD_REQUEST", message: String(e).slice(0, 300) }), { status: 400, headers });
  }
});
