import fs from 'node:fs';

const replaceOne=(source,from,to,label)=>{if(!source.includes(from))throw new Error(`Run100 anchor missing: ${label}`);return source.replace(from,to)};

// Online routing: keep Reels on the existing `ai` route for compatibility and add a hidden contextual assistant route.
const onlineFile='src/cloud/OnlineApp.tsx';
let online=fs.readFileSync(onlineFile,'utf8');
if(!online.includes("import { SpatialReelsHub } from '../components/SpatialReelsHub';")){
  online=replaceOne(online,"import { AIAssistantScreen } from '../screens/AIAssistantScreen';","import { AIAssistantScreen } from '../screens/AIAssistantScreen';\nimport { SpatialReelsHub } from '../components/SpatialReelsHub';",'SpatialReelsHub import');
}
const searchRoute=`else if(tab==='search')screen=<ScreenErrorBoundary name="Search" resetKey={category}><SearchScreen key={category} initialCategory={category} listings={visible} favorites={m.favorites} onFavorite={toggle} onOpen={setSelected}/></ScreenErrorBoundary>`;
const searchRouteNew=`else if(tab==='search')screen=<ScreenErrorBoundary name="Search" resetKey={category}><SearchScreen key={category} initialCategory={category} listings={visible} favorites={m.favorites} onFavorite={toggle} onOpen={setSelected} onAskAI={()=>setTab('assistant')}/></ScreenErrorBoundary>`;
if(!online.includes("onAskAI={()=>setTab('assistant')}"))online=replaceOne(online,searchRoute,searchRouteNew,'Search assistant route');
const aiRoute=`else if(tab==='ai')screen=<ScreenErrorBoundary name="Reels" resetKey={tab}><AIAssistantScreen listings={m.listings} favorites={m.favorites} messagesCount={m.messages.length} offersCount={m.offers.length}/></ScreenErrorBoundary>;else screen=<ScreenErrorBoundary name="Settings" resetKey={tab}><ProductionAccountHub m={m} onOpen={setSelected}/></ScreenErrorBoundary>`;
const aiRouteNew=`else if(tab==='ai')screen=<ScreenErrorBoundary name="Reels" resetKey={tab}><SpatialReelsHub/></ScreenErrorBoundary>;else if(tab==='assistant')screen=<ScreenErrorBoundary name="ATEEK AI" resetKey={tab}><AIAssistantScreen/></ScreenErrorBoundary>;else screen=<ScreenErrorBoundary name="Settings" resetKey={tab}><ProductionAccountHub m={m} onOpen={setSelected}/></ScreenErrorBoundary>`;
if(!online.includes("tab==='assistant'"))online=replaceOne(online,aiRoute,aiRouteNew,'Reels/assistant route split');
fs.writeFileSync(onlineFile,online);

// Search: contextual AI entry, no floating overlay. Keep this transform idempotent and tolerant of search UX hardening.
const searchFile='src/screens/SearchScreen.tsx';
let search=fs.readFileSync(searchFile,'utf8');
const searchSig=`export function SearchScreen({listings,favorites,onFavorite,onOpen,initialCategory='all'}:{listings:Listing[];favorites:string[];onFavorite:(id:string)=>void;onOpen:(item:Listing)=>void;initialCategory?:string})`;
const searchSigNew=`export function SearchScreen({listings,favorites,onFavorite,onOpen,initialCategory='all',onAskAI}:{listings:Listing[];favorites:string[];onFavorite:(id:string)=>void;onOpen:(item:Listing)=>void;initialCategory?:string;onAskAI:()=>void})`;
if(!search.includes('onAskAI:()=>void'))search=replaceOne(search,searchSig,searchSigNew,'Search onAskAI signature');
if(!search.includes('accessibilityLabel="اسأل ATEEK AI"')){
  const usernameHintCandidates=[
    `{isUsernameQuery&&<Text accessibilityLiveRegion="polite" style={[styles.usernameHint,{color:colors.cyan}]}>`,
    `{query.trim().startsWith('@')&&<Text accessibilityLiveRegion="polite" style={[styles.usernameHint,{color:colors.cyan}]}>`,
  ];
  const usernameHint=usernameHintCandidates.find(anchor=>search.includes(anchor));
  if(!usernameHint)throw new Error('Run100 anchor missing: Search AI button');
  const aiSearchButton=`<Pressable accessibilityRole="button" accessibilityLabel="اسأل ATEEK AI" accessibilityHint="يفتح مساعد عتيك الذكي" onPress={onAskAI} style={[styles.aiAsk,{backgroundColor:colors.forestSoft,borderColor:colors.line}]}><Ionicons name="sparkles" size={18} color={colors.gold}/><Text style={[styles.aiAskText,{color:colors.ink}]}>اسأل ATEEK AI</Text></Pressable>\n      ${usernameHint}`;
  search=replaceOne(search,usernameHint,aiSearchButton,'Search AI button');
}
if(!search.includes('aiAsk:{')){
  search=replaceOne(search,"usernameHint:{fontSize:10,fontWeight:'900',marginTop:7},","aiAsk:{marginTop:9,minHeight:44,width:'100%',borderRadius:15,borderWidth:1,paddingHorizontal:13,flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:7},aiAskText:{fontSize:11,fontWeight:'900'},usernameHint:{fontSize:10,fontWeight:'900',marginTop:7},",'Search AI styles');
}
fs.writeFileSync(searchFile,search);

// Add listing: real OpenAI-backed copy improvement through the secure ai-chat Edge Function.
const addFile='src/screens/AddListingScreen.tsx';
let add=fs.readFileSync(addFile,'utf8');
if(!add.includes("import { callAiTask } from '../ai/aiClient';"))add=replaceOne(add,"import { supabase } from '../cloud/client';","import { supabase } from '../cloud/client';\nimport { callAiTask } from '../ai/aiClient';",'Add listing AI client import');
if(!add.includes('const [improving, setImproving]')){
  const improvingStateCandidates=[
    "  const [analyzing, setAnalyzing] = useState(false);\n  const [draftReady, setDraftReady] = useState(false);",
    "  const [analyzing, setAnalyzing] = useState(false);\n  const restored = useRef(false);",
  ];
  const improvingStateAnchor=improvingStateCandidates.find(anchor=>add.includes(anchor));
  if(!improvingStateAnchor)throw new Error('Run100 anchor missing: Add listing improving state');
  add=add.replace(
    improvingStateAnchor,
    improvingStateAnchor.replace(
      "  const [analyzing, setAnalyzing] = useState(false);",
      "  const [analyzing, setAnalyzing] = useState(false);\n  const [improving, setImproving] = useState(false);",
    ),
  );
}
if(!add.includes('!improving);'))add=replaceOne(add,"  const canPublish = Boolean(title.trim() && amount && image && !publishing && !analyzing);","  const canPublish = Boolean(title.trim() && amount && image && !publishing && !analyzing && !improving);",'Add listing publish guard');
add=add.replaceAll('if (publishing || analyzing) return;','if (publishing || analyzing || improving) return;');
if(!add.includes('const improveDescription = async')){
  const publishAnchor=`  const publish = async () => {`;
  const improve=`  const improveDescription = async () => {\n    if (publishing || analyzing || improving) return;\n    const source = description.trim() || [title.trim(), categories.find(item => item.id === category)?.label, location.trim()].filter(Boolean).join(' • ');\n    if (source.length < 3) { Alert.alert('تحسين الوصف', 'اكتب عنواناً أو وصفاً أولاً.'); return; }\n    setImproving(true);\n    try {\n      const result = await callAiTask<{ output?: string }>('improve_listing', \`العنوان: \${title.trim() || 'غير محدد'}\\nالقسم: \${categories.find(item => item.id === category)?.label || category}\\nالموقع: \${location.trim() || 'العراق'}\\nالوصف الحالي: \${source}\`);\n      const output = String(result?.output || '').trim();\n      if (!output) throw new Error('لم يرجع المساعد وصفاً صالحاً.');\n      setDescription(output.slice(0, 2000));\n    } catch (error) { Alert.alert('تعذّر تحسين الوصف', error instanceof Error ? error.message : 'حاول مرة أخرى لاحقاً.'); }\n    finally { setImproving(false); }\n  };\n\n`;
  add=replaceOne(add,publishAnchor,improve+publishAnchor,'Add listing improve function');
}
if(!add.includes("improving ? 'ATEEK AI يحسّن وصف الإعلان…'"))add=replaceOne(add,"  const busy = publishing || analyzing;\n  const statusText = analyzing ? 'مساعد عتيك يحلل الصورة…' : publishing ? 'يتم ضغط الصورة ورفع الإعلان بأمان…' : '';","  const busy = publishing || analyzing || improving;\n  const statusText = analyzing ? 'مساعد عتيك يحلل الصورة…' : improving ? 'ATEEK AI يحسّن وصف الإعلان…' : publishing ? 'يتم ضغط الصورة ورفع الإعلان بأمان…' : '';",'Add listing busy/status');
if(!add.includes('تحسين الوصف بواسطة ATEEK AI')){
  const descFieldCandidates=[
    `        <Field label="وصف السلعة" value={description} onChangeText={setDescription} placeholder="اذكر الحالة والعمر وأهم التفاصيل..." multiline />`,
    `        <Field label="وصف السلعة" value={description} onChangeText={setDescription} placeholder="اذكر الحالة والعمر وأهم التفاصيل..." multiline disabled={busy} />`,
  ];
  const descField=descFieldCandidates.find(anchor=>add.includes(anchor));
  if(!descField)throw new Error('Run100 anchor missing: Add listing improve UI');
  const descWithAi=`${descField}\n        <Pressable disabled={busy} style={[styles.aiAnalyze, busy && styles.disabled]} onPress={() => void improveDescription()} accessibilityRole="button" accessibilityLabel={improving ? 'جارٍ تحسين وصف الإعلان' : 'تحسين وصف الإعلان بواسطة ATEEK AI'} accessibilityState={{ disabled: busy, busy: improving }}>\n          {improving ? <ActivityIndicator size="small" color={colors.gold} /> : <Ionicons name="create-outline" size={20} color={colors.gold} importantForAccessibility="no" />}\n          <Text style={styles.aiAnalyzeText}>{improving ? 'جارٍ تحسين الوصف…' : 'تحسين الوصف بواسطة ATEEK AI'}</Text>\n        </Pressable>`;
  add=replaceOne(add,descField,descWithAi,'Add listing improve UI');
}
fs.writeFileSync(addFile,add);

for(const [file,needle] of [
  [onlineFile,"tab==='assistant'"],
  [searchFile,'اسأل ATEEK AI'],
  [addFile,"callAiTask<{ output?: string }>('improve_listing'"],
]){
  if(!fs.readFileSync(file,'utf8').includes(needle))throw new Error(`Run100 contract missing: ${file} -> ${needle}`);
}
console.log('Run #100 OpenAI AI Hub transform applied: dedicated assistant route, contextual search entry, and real listing-description improvement.');