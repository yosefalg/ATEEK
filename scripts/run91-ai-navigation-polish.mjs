import fs from 'node:fs';

const replace=(source,from,to,label)=>{if(!source.includes(from))throw new Error(`Run91 polish anchor missing: ${label}`);return source.replace(from,to)};

const dealFile='src/components/SpatialDealScreens.tsx';
let deal=fs.readFileSync(dealFile,'utf8');
deal=replace(deal,
  "const DANGER = '#FF7B86';\n\ntype AnyRow = Record<string, any>;",
  "const DANGER = '#FF7B86';\n\nfunction formatAiForArabic(value: string) {\n  return value\n    .replace(/\\*\\*(.*?)\\*\\*/g, '$1')\n    .replace(/^#{1,6}\\s+/gm, '')\n    .replace(/^\\s*[-*]\\s+/gm, '• ')\n    .replace(/`([^`]+)`/g, '$1')\n    .replace(/\\n{3,}/g, '\\n\\n')\n    .trim();\n}\n\ntype AnyRow = Record<string, any>;",
  'AI Arabic formatter');
deal=replace(deal,
  "      setAiAnswer(String(data.answer));",
  "      setAiAnswer(formatAiForArabic(String(data.answer)));",
  'formatted AI response');
deal=replace(deal,
  "      setAiAnswer(`تعذر إكمال التقييم الآن: ${String(error?.message ?? error)}`);",
  "      const message = String(error?.message ?? error);\n      void supabase.rpc('ateek_client_error_log', { p_scope: 'listing_price_ai', p_entity_id: item.id, p_message: message.slice(0, 1200) });\n      setAiAnswer(`تعذر إكمال التقييم الآن: ${message}`);",
  'AI failure telemetry');
fs.writeFileSync(dealFile,deal);

const appFile='src/cloud/OnlineApp.tsx';
let app=fs.readFileSync(appFile,'utf8');
app=replace(app,
  "opacity.value=0;scale.value=.85;y.value=24;opacity.value=withTiming(1,{duration:300});scale.value=withTiming(1,{duration:300});y.value=withTiming(0,{duration:300})",
  "opacity.value=0;scale.value=.97;y.value=10;opacity.value=withTiming(1,{duration:460});scale.value=withTiming(1,{duration:460});y.value=withTiming(0,{duration:460})",
  'smooth cinematic navigation');
fs.writeFileSync(appFile,app);

console.log('Run #91 AI/navigation polish applied: Arabic-safe AI text, telemetry and smoother transitions.');
