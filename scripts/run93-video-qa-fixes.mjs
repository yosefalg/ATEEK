import fs from 'node:fs';

const replace=(source,from,to,label)=>{if(!source.includes(from))throw new Error(`Run93 video QA anchor missing: ${label}`);return source.replace(from,to)};

const dealFile='src/components/SpatialDealScreens.tsx';
let deal=fs.readFileSync(dealFile,'utf8');
deal=replace(deal,'SPATIAL DM HUB','مركز المحادثات','Arabic chat heading');
deal=replace(deal,'SPATIAL LISTING','تفاصيل الإعلان','Arabic listing heading');
deal=replace(deal,'Gemini Price Check','فحص السعر الذكي','Arabic AI action');
deal=replace(deal,
  "  messagesContent: { paddingHorizontal: 12, paddingVertical: 14, gap: 8 },",
  "  messagesContent: { flexGrow: 1, justifyContent: 'flex-end', paddingHorizontal: 12, paddingTop: 10, paddingBottom: 8, gap: 8 },",
  'bottom anchored message layout');
deal=replace(deal,
  "        <Pressable accessibilityRole=\"button\" accessibilityLabel=\"الملاحظات الصوتية غير مفعلة لهذه المحادثة\" disabled style={styles.composerIconDisabled}>\n          <Ionicons name=\"mic-outline\" size={20} color=\"#566071\" />\n        </Pressable>\n",
  '',
  'remove nonfunctional voice affordance');
fs.writeFileSync(dealFile,deal);

const appFile='src/cloud/OnlineApp.tsx';
let app=fs.readFileSync(appFile,'utf8');
app=replace(app,
  "opacity.value=0;scale.value=.97;y.value=10;opacity.value=withTiming(1,{duration:460});scale.value=withTiming(1,{duration:460});y.value=withTiming(0,{duration:460})",
  "opacity.value=1;scale.value=.985;y.value=6;scale.value=withTiming(1,{duration:260});y.value=withTiming(0,{duration:260})",
  'prevent blank transition frame');
fs.writeFileSync(appFile,app);

const profileFile='src/components/SpatialProfileAnalyticsHub.tsx';
let profile=fs.readFileSync(profileFile,'utf8');
profile=replace(profile,'ATEEK SOCIAL COMMAND CENTER','مركز حساب عتيك','Arabic profile hero');
profile=replace(profile,'Analytics Hub','تحليلات الحساب','Arabic analytics title');
profile=replace(profile,'Pro Merchant Hub','ملف البائع الاحترافي','Arabic merchant title');
fs.writeFileSync(profileFile,profile);

console.log('Run #93 video QA fixes applied: no blank navigation frame, bottom-anchored chat, hidden nonfunctional voice control, Arabic production headings.');
