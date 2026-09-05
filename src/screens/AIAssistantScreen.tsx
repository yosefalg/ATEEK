import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Listing } from '../types';
import { supabase } from '../cloud/client';

type Msg={id:string;role:'user'|'assistant';body:string};
type Props={listings:Listing[];favorites:string[];messagesCount:number;offersCount:number};
type FunctionErrorLike={message?:string;context?:Response};

const MAX_QUESTION_LENGTH=800;

async function readableFunctionError(error:unknown){
  const e=error as FunctionErrorLike;
  const fallback=e?.message||'تعذر الاتصال بخدمة الذكاء الاصطناعي';
  const response=e?.context;
  if(!response) return fallback;
  try{
    const body=await response.clone().json() as {message?:string;providerStatus?:number;providerCode?:string;providerType?:string;providerRequestId?:string|null;code?:string};
    const details=[body.providerStatus?`HTTP ${body.providerStatus}`:'',body.providerCode&&body.providerCode!=='unknown'?body.providerCode:'',body.providerType&&body.providerType!=='unknown'?body.providerType:'',body.code||''].filter(Boolean).join(' • ');
    return `${body.message||fallback}${details?` (${details})`:''}`;
  }catch{
    try{const text=await response.clone().text();return text||fallback}catch{return fallback}
  }
}

function median(values:number[]){
  if(!values.length)return 0;
  const sorted=[...values].sort((a,b)=>a-b),mid=Math.floor(sorted.length/2);
  return sorted.length%2?sorted[mid]!:Math.round((sorted[mid-1]!+sorted[mid]!)/2);
}

function formatIQD(value:number){
  return new Intl.NumberFormat('ar-IQ').format(Math.round(value))+' د.ع';
}

export function AIAssistantScreen({listings,favorites,messagesCount,offersCount}:Props){
  const [text,setText]=useState('');
  const [busy,setBusy]=useState(false);
  const [chat,setChat]=useState<Msg[]>([{id:'hello',role:'assistant',body:'مرحبًا، أنا مساعد عتيك الذكي. أستطيع تحليل السوق والأسعار ونشاط حسابك المتاح للتطبيق. لا ترسل كلمات مرور أو رموز تحقق أو معلومات مصرفية حساسة.'}]);
  const stats=useMemo(()=>{
    const active=listings.filter(x=>x.status==='active');
    const prices=active.map(x=>Number(x.price)).filter(x=>Number.isFinite(x)&&x>0);
    return {active:active.length,verified:active.filter(x=>x.verified).length,median:median(prices),favorites:favorites.length,messages:messagesCount,offers:offersCount};
  },[favorites.length,listings,messagesCount,offersCount]);

  const ask=async(raw:string)=>{
    const q=raw.trim().slice(0,MAX_QUESTION_LENGTH);
    if(!q||busy)return;
    const uid=Date.now()+'u';
    setChat(c=>[...c,{id:uid,role:'user',body:q}]);
    setText(''); setBusy(true);
    try{
      const market=listings.filter(x=>x.status!=='removed').slice(0,80).map(x=>({title:x.title,price:x.price,category:x.category,location:x.location,condition:x.condition,status:x.status,description:x.description,verified:x.verified,owner:x.owner}));
      const {data,error}=await supabase.functions.invoke('ateek-assistant',{body:{question:q,listings:market,favoritesCount:favorites.length,messagesCount,offersCount,marketSummary:{activeListings:stats.active,verifiedListings:stats.verified,medianPrice:stats.median}}});
      if(error)throw error;
      if(!data?.answer)throw new Error(data?.message||'لم يصل رد من خدمة الذكاء الاصطناعي');
      setChat(c=>[...c,{id:Date.now()+'a',role:'assistant',body:String(data.answer)}]);
    }catch(e){
      const message=await readableFunctionError(e);
      setChat(c=>[...c,{id:Date.now()+'e',role:'assistant',body:`تعذر إكمال الطلب الآن: ${message}`}]);
    }finally{setBusy(false);}
  };
  const send=()=>void ask(text);
  const chips=['لخص السوق الآن','قارن الأسعار الحالية','حلل أفضل فرص الشراء','حلل نشاط حسابي','ساعدني أسعّر إعلانًا','نصائح بيع وشراء آمنة'];
  return <View style={s.root}>
    <View style={s.hero}><View style={s.bot}><Ionicons name="sparkles" size={28} color={colors.gold}/></View><View style={{flex:1}}><Text style={s.title}>مساعد عتيك AI</Text><Text style={s.sub}>Gemini • تحليل السوق • قراءة نشاطك داخل عتيك</Text></View></View>
    <View style={s.metrics}>
      <Metric value={String(stats.active)} label="إعلان نشط" />
      <Metric value={String(stats.favorites)} label="مفضلة" />
      <Metric value={String(stats.offers)} label="عرض" />
      <Metric value={stats.median?formatIQD(stats.median):'—'} label="وسيط السوق" wide />
    </View>
    <FlatList data={chat} keyExtractor={x=>x.id} contentContainerStyle={s.chat} renderItem={({item})=><View style={[s.bubble,item.role==='user'?s.user:s.ai]}><Text style={[s.body,item.role==='user'&&{color:'#fff'}]}>{item.body}</Text></View>} ListFooterComponent={<><View style={s.chips}>{chips.map(x=><Pressable disabled={busy} key={x} onPress={()=>void ask(x)} style={[s.chip,busy&&{opacity:.55}]}><Text style={s.chipText}>{x}</Text></Pressable>)}</View>{busy?<View style={s.loading}><ActivityIndicator/><Text style={s.loadingText}>مساعد عتيك يحلل البيانات…</Text></View>:null}</>}/>
    <View style={s.composer}><Pressable accessibilityRole="button" accessibilityLabel="إرسال السؤال" disabled={busy||!text.trim()} onPress={send} style={[s.send,(busy||!text.trim())&&{opacity:.45}]}>{busy?<ActivityIndicator color="#fff"/>:<Ionicons name="arrow-up" size={22} color="#fff"/>}</Pressable><View style={{flex:1}}><TextInput editable={!busy} value={text} onChangeText={value=>setText(value.slice(0,MAX_QUESTION_LENGTH))} onSubmitEditing={send} placeholder="اسأل مساعد عتيك…" placeholderTextColor={colors.muted} style={s.input} textAlign="right" multiline maxLength={MAX_QUESTION_LENGTH}/><Text style={s.counter}>{text.length}/{MAX_QUESTION_LENGTH}</Text></View></View>
  </View>;
}

function Metric({value,label,wide=false}:{value:string;label:string;wide?:boolean}){
  return <View style={[s.metric,wide&&s.metricWide]}><Text numberOfLines={1} style={s.metricValue}>{value}</Text><Text style={s.metricLabel}>{label}</Text></View>;
}

const s=StyleSheet.create({root:{flex:1,backgroundColor:colors.cream},hero:{margin:16,marginBottom:8,padding:16,borderRadius:22,backgroundColor:colors.forest,flexDirection:'row-reverse',alignItems:'center',gap:12},bot:{width:52,height:52,borderRadius:18,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(216,169,78,.12)',borderWidth:1,borderColor:'rgba(216,169,78,.35)'},title:{fontSize:24,fontWeight:'900',color:'#fff',textAlign:'right'},sub:{fontSize:11,color:colors.goldSoft,textAlign:'right',marginTop:3},metrics:{marginHorizontal:16,marginBottom:8,flexDirection:'row-reverse',flexWrap:'wrap',gap:8},metric:{minWidth:72,flexGrow:1,backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderRadius:16,paddingHorizontal:10,paddingVertical:9,alignItems:'center'},metricWide:{minWidth:130},metricValue:{fontSize:14,fontWeight:'900',color:colors.forest},metricLabel:{fontSize:9,color:colors.muted,marginTop:2},chat:{paddingHorizontal:16,paddingBottom:20,gap:10},bubble:{maxWidth:'88%',padding:13,borderRadius:18},user:{alignSelf:'flex-end',backgroundColor:colors.forest,borderBottomRightRadius:5},ai:{alignSelf:'flex-start',backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderBottomLeftRadius:5},body:{fontSize:14,lineHeight:22,color:colors.ink,textAlign:'right'},chips:{flexDirection:'row-reverse',flexWrap:'wrap',gap:8,marginTop:8},chip:{paddingHorizontal:12,paddingVertical:8,borderRadius:999,backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line},chipText:{fontSize:11,fontWeight:'700',color:colors.forest},loading:{marginTop:12,flexDirection:'row-reverse',alignItems:'center',gap:8},loadingText:{fontSize:12,color:colors.muted},composer:{flexDirection:'row',alignItems:'flex-end',padding:12,borderTopWidth:1,borderTopColor:colors.line,backgroundColor:colors.paper,gap:8},input:{minHeight:46,maxHeight:112,borderRadius:16,backgroundColor:colors.cream,paddingHorizontal:14,paddingTop:13,paddingBottom:13,color:colors.ink},counter:{fontSize:9,color:colors.muted,textAlign:'right',marginTop:3,marginRight:4},send:{width:46,height:46,borderRadius:16,backgroundColor:colors.forest,alignItems:'center',justifyContent:'center'}});
