import fs from 'node:fs';

const file='src/components/SpatialDealScreens.tsx';
let s=fs.readFileSync(file,'utf8');
const replace=(from,to,label)=>{if(!s.includes(from))throw new Error(`Run101 AI anchor missing: ${label}`);s=s.replace(from,to)};

if(!s.includes("import { callAiTask } from '../ai/aiClient';")){
  replace("import { haptics } from '../system/haptics';","import { haptics } from '../system/haptics';\nimport { callAiTask } from '../ai/aiClient';",'AI client import');
}

// Smart reply suggestions: generated from the latest real messages, never auto-sent.
replace(
  "  const [typing, setTyping] = useState(false);\n  const [mediaBusy, setMediaBusy] = useState(false);",
  "  const [typing, setTyping] = useState(false);\n  const [mediaBusy, setMediaBusy] = useState(false);\n  const [suggestBusy, setSuggestBusy] = useState(false);\n  const [suggestions, setSuggestions] = useState<string[]>([]);",
  'suggest reply state',
);

const sendOfferAnchor="  const sendOffer = () => {";
const suggestFn=`  const suggestReplies = async () => {\n    if (!thread || suggestBusy || busy) return;\n    const context = threadMessages.slice(-10).map((message) => {\n      const mine = message.sender_id === m.user.id;\n      const raw = String(message.body ?? '');\n      const bodyText = parseImageMessage(raw) ? '[صورة]' : raw.slice(0, 600);\n      return (mine ? 'أنا: ' : 'الطرف الآخر: ') + bodyText;\n    }).filter(Boolean).join('\\n');\n    if (!context.trim()) { Alert.alert('اقتراح رد', 'لا توجد رسائل كافية لاقتراح رد بعد.'); return; }\n    setSuggestBusy(true);\n    try {\n      const result = await callAiTask<{ replies?: string[] }>('suggest_replies', context, 5 * 60 * 1000);\n      const next = Array.isArray(result?.replies) ? result.replies.map((x) => String(x).trim()).filter(Boolean).slice(0, 3) : [];\n      if (!next.length) throw new Error('لم يصل اقتراح صالح.');\n      setSuggestions(next);\n    } catch (error) {\n      Alert.alert('تعذّر اقتراح الرد', error instanceof Error ? error.message : 'حاول مرة أخرى.');\n    } finally { setSuggestBusy(false); }\n  };\n\n`;
replace(sendOfferAnchor,suggestFn+sendOfferAnchor,'suggest reply action');

replace(
  "      <View style={styles.composerDock}>",
  "      <View style={styles.suggestionArea}>\n        <Pressable accessibilityRole=\"button\" accessibilityLabel=\"اقتراح رد بواسطة ATEEK AI\" disabled={suggestBusy || busy} onPress={() => void suggestReplies()} style={[styles.suggestButton,(suggestBusy || busy) && styles.disabled]}>\n          <Ionicons name=\"sparkles-outline\" size={16} color={GOLD} />\n          <Text style={styles.suggestButtonText}>{suggestBusy ? 'جارٍ الاقتراح…' : 'اقتراح رد'}</Text>\n        </Pressable>\n        {!!suggestions.length && <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.suggestionChips}>{suggestions.map((reply,index)=><Pressable key={`${index}-${reply}`} accessibilityRole=\"button\" accessibilityLabel={`استخدام الرد المقترح ${index+1}`} onPress={()=>{setBody(reply);setSuggestions([])}} style={styles.suggestionChip}><Text numberOfLines={2} style={styles.suggestionText}>{reply}</Text></Pressable>)}</ScrollView>}\n      </View>\n      <View style={styles.composerDock}>",
  'suggest reply UI',
);

// Replace the legacy listing-specific assistant call with secure OpenAI-backed task mode.
const aiStart=s.indexOf('  const askGemini = async () => {');
const aiEnd=s.indexOf('\n\n  const openChat = async',aiStart);
if(aiStart<0||aiEnd<0)throw new Error('Run101 AI anchor missing: legacy listing AI function');
const listingAi=`  const analyzeListingAI = async () => {\n    if (aiBusy) return;\n    setAiBusy(true);\n    setAiAnswer('');\n    haptics.medium();\n    try {\n      const comparable = m.listings.filter((x) => x.id !== item.id && x.category === item.category && x.status === 'active').slice(0, 12).map((x) => ({ title:x.title,price:x.price,condition:x.condition,location:x.location }));\n      const prompt = JSON.stringify({ listing:{ title:item.title,price:item.price,category:item.category,condition:item.condition,location:item.location,description:item.description }, comparable });\n      const data = await callAiTask<{ output?: string }>('listing_analysis', prompt, 30 * 60 * 1000);\n      if (!data?.output) throw new Error('لم يصل تحليل صالح من ATEEK AI.');\n      setAiAnswer(formatAiForArabic(String(data.output)));\n    } catch (error) {\n      const message = error instanceof Error ? error.message : String(error);\n      void supabase.rpc('ateek_client_error_log', { p_scope: 'listing_price_ai', p_entity_id: item.id, p_message: message.slice(0, 1200) });\n      setAiAnswer(`تعذر إكمال التقييم الآن: ${message}`);\n    } finally { setAiBusy(false); }\n  };`;
s=s.slice(0,aiStart)+listingAi+s.slice(aiEnd);

// Put listing AI in the content flow, not as a floating overlay that covers content.
const floatingStart=s.indexOf('      <Pressable\n        accessibilityRole="button"\n        accessibilityLabel="فحص السعر بمساعد عتيك"');
const floatingEnd=floatingStart>=0?s.indexOf('      </Pressable>',floatingStart):-1;
if(floatingStart<0||floatingEnd<0)throw new Error('Run101 AI anchor missing: floating listing AI button');
s=s.slice(0,floatingStart)+s.slice(floatingEnd+'      </Pressable>\n'.length);

replace(
  "        <View style={styles.descriptionCard}>\n          <Text style={styles.sectionEyebrow}>الوصف</Text>\n          <Text style={styles.descriptionText}>{item.description || 'لم يضف البائع وصفًا لهذا الإعلان.'}</Text>\n        </View>",
  "        <View style={styles.descriptionCard}>\n          <Text style={styles.sectionEyebrow}>الوصف</Text>\n          <Text style={styles.descriptionText}>{item.description || 'لم يضف البائع وصفًا لهذا الإعلان.'}</Text>\n          <Pressable accessibilityRole=\"button\" accessibilityLabel=\"تحليل الإعلان بواسطة ATEEK AI\" onPress={()=>{setAiOpen(true);if(!aiAnswer)void analyzeListingAI()}} style={styles.inlineAiAction}>\n            <Ionicons name=\"sparkles-outline\" size={17} color={GOLD}/><Text style={styles.inlineAiActionText}>تحليل الإعلان بواسطة ATEEK AI</Text>\n          </Pressable>\n        </View>",
  'inline listing AI action',
);

s=s.replaceAll('void askGemini()','void analyzeListingAI()');
s=s.replaceAll('Gemini عبر Edge Function الحالية','OpenAI عبر Edge Function آمنة');
s=s.replaceAll('Gemini Price Check','ATEEK AI');

replace(
  "  composerDock: { margin: 10, marginTop: 6, padding: 8, borderRadius: 22, borderWidth: 1, borderColor: '#343C49', backgroundColor: '#11151D', flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingBottom: Platform.OS === 'android' ? 10 : 8 },",
  "  suggestionArea:{marginHorizontal:10,marginTop:5,gap:7},suggestButton:{alignSelf:'flex-end',minHeight:38,borderRadius:13,borderWidth:1,borderColor:LINE,backgroundColor:TITANIUM,paddingHorizontal:11,flexDirection:'row-reverse',alignItems:'center',gap:6},suggestButtonText:{color:INK,fontSize:10,fontWeight:'900'},suggestionChips:{gap:7,paddingBottom:2},suggestionChip:{maxWidth:250,minHeight:42,borderRadius:14,borderWidth:1,borderColor:'#3A424F',backgroundColor:'#121720',paddingHorizontal:11,paddingVertical:8,justifyContent:'center'},suggestionText:{color:'#DDE3EB',fontSize:11,lineHeight:17,textAlign:'right'},\n  composerDock: { margin: 10, marginTop: 6, padding: 8, borderRadius: 22, borderWidth: 1, borderColor: '#343C49', backgroundColor: '#11151D', flexDirection: 'row', alignItems: 'flex-end', gap: 6, paddingBottom: Platform.OS === 'android' ? 10 : 8 },",
  'suggest reply styles',
);
replace(
  "  descriptionText: { color: '#D7DCE4', fontSize: 14, lineHeight: 24, textAlign: 'right' },",
  "  descriptionText: { color: '#D7DCE4', fontSize: 14, lineHeight: 24, textAlign: 'right' },\n  inlineAiAction:{minHeight:46,marginTop:14,borderRadius:15,borderWidth:1,borderColor:'#4A4030',backgroundColor:'#18150F',paddingHorizontal:12,flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:7},inlineAiActionText:{color:GOLD,fontSize:11,fontWeight:'900'},",
  'inline AI styles',
);

fs.writeFileSync(file,s);
for(const needle of ["callAiTask<{ replies?: string[] }>('suggest_replies'","callAiTask<{ output?: string }>('listing_analysis'",'تحليل الإعلان بواسطة ATEEK AI']){
  if(!s.includes(needle))throw new Error(`Run101 contract missing: ${needle}`);
}
if(s.includes('accessibilityLabel="فحص السعر بمساعد عتيك"'))throw new Error('Run101 floating AI affordance still present');
console.log('Run #101 contextual AI applied: smart reply suggestions and inline OpenAI listing analysis without floating overlay.');
