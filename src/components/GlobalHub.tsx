import { Ionicons } from '@expo/vector-icons';
import { useEffect,useState } from 'react';
import { ActivityIndicator,Modal,Pressable,ScrollView,StyleSheet,Text,TextInput,View } from 'react-native';
import Animated,{useAnimatedStyle,useSharedValue,withSpring} from 'react-native-reanimated';
import { supabase } from '../cloud/client';
import { flushOfflineQueue,queueLength } from '../cloud/resilientAction';
import { haptics } from '../system/haptics';
import { useAteekTheme } from '../theme/ThemeProvider';

type MarketRow={id:string;title:string;description:string;category:string;price:number;location:string;condition:string;status:string};

async function marketSnapshot(limit:number):Promise<MarketRow[]>{
  const {data,error}=await supabase.from('ateek_listings').select('id,title,description,category,price,location,condition,status').eq('status','active').order('created_at',{ascending:false}).limit(limit);
  if(error)throw error;
  return (data??[]).map((x:any)=>({...x,price:Number(x.price)}));
}

export function GlobalHub(){
  const {colors,locale,setLocale,isRTL,t,lowData}=useAteekTheme();
  const [open,setOpen]=useState(false),[busy,setBusy]=useState(false),[answer,setAnswer]=useState(''),[title,setTitle]=useState(''),[category,setCategory]=useState(''),[condition,setCondition]=useState(''),[online,setOnline]=useState(0),[pending,setPending]=useState(0);
  const scale=useSharedValue(1);
  const fabStyle=useAnimatedStyle(()=>({transform:[{scale:scale.value}]}));
  useEffect(()=>{void queueLength().then(setPending);},[open]);
  useEffect(()=>{let channel:ReturnType<typeof supabase.channel>|null=null;let alive=true;void supabase.auth.getSession().then(({data})=>{if(!alive||!data.session)return;const uid=data.session.user.id;channel=supabase.channel('ateek-global-presence',{config:{presence:{key:uid}}});channel.on('presence',{event:'sync'},()=>{const state=channel?.presenceState()??{};setOnline(Object.keys(state).length);});channel.subscribe(status=>{if(status==='SUBSCRIBED')void channel?.track({user_id:uid,online_at:new Date().toISOString()});});});return()=>{alive=false;if(channel)void supabase.removeChannel(channel);};},[]);
  const pressFab=()=>{haptics.medium();scale.value=.86;setTimeout(()=>{scale.value=withSpring(1,{damping:13,stiffness:210});},80);setOpen(true);};
  const ask=async(kind:'price'|'description')=>{if(busy||!title.trim())return;haptics.light();setBusy(true);setAnswer('');try{const rows=await marketSnapshot(lowData?35:80);const q=kind==='price'?`أنت خبير تسعير في سوق عتيك العراقي. المنتج: ${title.trim()}. الفئة: ${category.trim()||'غير محددة'}. الحالة: ${condition.trim()||'غير محددة'}. اعتماداً فقط على بيانات السوق المرسلة لك، اقترح نطاق سعر عادل بالدينار العراقي مع تقدير تقريبي بالدولار، واشرح أسباب التقدير باختصار ولا تختلق إعلانات غير موجودة.`:`اكتب وصف إعلان احترافي وجذاب وقصير لمنتج بعنوان: ${title.trim()}، الفئة: ${category.trim()||'غير محددة'}، الحالة: ${condition.trim()||'غير محددة'}. لا تخترع مواصفات لم يذكرها المستخدم، واكتب النص المناسب لسوق عتيك بالعراق.`;const {data,error}=await supabase.functions.invoke('ateek-assistant',{body:{question:q,listings:rows,favoritesCount:0,messagesCount:0,offersCount:0,marketSummary:{activeListings:rows.length}}});if(error)throw error;const text=String(data?.answer||'');if(!text)throw new Error('لم يصل رد من المساعد');setAnswer(text);haptics.success();}catch(e:any){setAnswer(e?.message||'تعذّر تنفيذ الطلب الآن');haptics.error();}finally{setBusy(false);}};
  const flush=async()=>{haptics.light();const r=await flushOfflineQueue();setPending(r.pending);if(r.sent)haptics.success();};
  return <>
    <Animated.View style={[s.fab,{backgroundColor:colors.gold,borderColor:colors.line},fabStyle]}><Pressable accessibilityRole="button" accessibilityLabel={t('globalHub')} onPress={pressFab} style={s.fabPress}><Ionicons name="globe-outline" size={21} color={colors.forest}/></Pressable></Animated.View>
    <Modal visible={open} animationType="fade" transparent onRequestClose={()=>setOpen(false)}>
      <View style={[s.backdrop,{backgroundColor:colors.overlay}]}>
        <View style={[s.sheet,{backgroundColor:colors.surface,borderColor:colors.line,direction:isRTL?'rtl':'ltr'}]}>
          <View style={s.top}><Pressable accessibilityLabel={t('close')} onPress={()=>setOpen(false)} style={[s.icon,{backgroundColor:colors.glass}]}><Ionicons name="close" size={22} color={colors.ink}/></Pressable><View style={{flex:1}}><Text style={[s.title,{color:colors.ink,textAlign:isRTL?'right':'left'}]}>{t('globalHub')}</Text><Text style={[s.sub,{color:colors.muted,textAlign:isRTL?'right':'left'}]}>{t('globalSub')}</Text></View></View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
            <View style={[s.status,{backgroundColor:colors.glass,borderColor:colors.line}]}><Stat icon="people-outline" value={String(online)} label={t('onlineNow')} color={colors.cyan}/><Stat icon="cloud-offline-outline" value={String(pending)} label={t('queued')} color={colors.gold}/></View>
            <Text style={[s.heading,{color:colors.ink,textAlign:isRTL?'right':'left'}]}>{t('language')}</Text>
            <View style={s.row}>{(['ar','en','tr','fa'] as const).map(x=><Pressable key={x} onPress={()=>{haptics.tap();setLocale(x)}} style={[s.pill,{backgroundColor:locale===x?colors.gold:colors.glass,borderColor:locale===x?colors.gold:colors.line}]}><Text style={{color:locale===x?colors.forest:colors.ink,fontWeight:'900'}}>{x==='ar'?'العربية':x==='en'?'English':x==='tr'?'Türkçe':'فارسی'}</Text></Pressable>)}</View>
            <Text style={[s.heading,{color:colors.ink,textAlign:isRTL?'right':'left'}]}>{t('aiSeller')}</Text>
            <TextInput value={title} onChangeText={setTitle} placeholder={t('productTitle')} placeholderTextColor={colors.muted} style={[s.input,{color:colors.ink,backgroundColor:colors.glass,borderColor:colors.line,textAlign:isRTL?'right':'left'}]}/>
            <View style={s.row}><TextInput value={category} onChangeText={setCategory} placeholder={t('category')} placeholderTextColor={colors.muted} style={[s.input,s.half,{color:colors.ink,backgroundColor:colors.glass,borderColor:colors.line,textAlign:isRTL?'right':'left'}]}/><TextInput value={condition} onChangeText={setCondition} placeholder={t('condition')} placeholderTextColor={colors.muted} style={[s.input,s.half,{color:colors.ink,backgroundColor:colors.glass,borderColor:colors.line,textAlign:isRTL?'right':'left'}]}/></View>
            <View style={s.row}><Pressable disabled={busy||!title.trim()} onPress={()=>void ask('price')} style={[s.action,{backgroundColor:colors.gold},(busy||!title.trim())&&s.disabled]}><Ionicons name="pricetag-outline" size={18} color={colors.forest}/><Text style={[s.actionText,{color:colors.forest}]}>{t('fairPrice')}</Text></Pressable><Pressable disabled={busy||!title.trim()} onPress={()=>void ask('description')} style={[s.action,{backgroundColor:colors.glass,borderColor:colors.line,borderWidth:1},(busy||!title.trim())&&s.disabled]}><Ionicons name="sparkles-outline" size={18} color={colors.cyan}/><Text style={[s.actionText,{color:colors.ink}]}>{t('autoDescription')}</Text></Pressable></View>
            {busy?<View style={[s.result,{backgroundColor:colors.glass,borderColor:colors.line}]}><ActivityIndicator color={colors.gold}/><Text style={{color:colors.muted}}>{t('analyzing')}</Text></View>:!!answer&&<View style={[s.result,{backgroundColor:colors.glass,borderColor:colors.line}]}><Text selectable style={[s.answer,{color:colors.ink,textAlign:isRTL?'right':'left'}]}>{answer}</Text></View>}
            <Text style={[s.heading,{color:colors.ink,textAlign:isRTL?'right':'left'}]}>{t('resilience')}</Text>
            <Pressable onPress={()=>void flush()} style={[s.queueButton,{borderColor:colors.line,backgroundColor:colors.glass}]}><Ionicons name="sync-outline" size={19} color={colors.cyan}/><Text style={{color:colors.ink,fontWeight:'800'}}>{t('retryQueue')}</Text></Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}
function Stat({icon,value,label,color}:{icon:keyof typeof Ionicons.glyphMap;value:string;label:string;color:string}){return <View style={s.stat}><Ionicons name={icon} size={18} color={color}/><Text style={[s.statValue,{color}]}>{value}</Text><Text style={s.statLabel}>{label}</Text></View>}
const s=StyleSheet.create({fab:{position:'absolute',left:12,top:46,width:44,height:44,borderRadius:22,borderWidth:1,elevation:12,zIndex:30,overflow:'hidden'},fabPress:{flex:1,alignItems:'center',justifyContent:'center'},backdrop:{flex:1,justifyContent:'flex-end'},sheet:{maxHeight:'88%',borderTopLeftRadius:30,borderTopRightRadius:30,borderWidth:1,paddingTop:14,overflow:'hidden'},top:{flexDirection:'row',alignItems:'center',gap:12,paddingHorizontal:18,paddingBottom:12},icon:{width:40,height:40,borderRadius:20,alignItems:'center',justifyContent:'center'},title:{fontSize:24,fontWeight:'900'},sub:{fontSize:11,marginTop:2},scroll:{padding:18,paddingTop:4,paddingBottom:34,gap:13},status:{flexDirection:'row',borderWidth:1,borderRadius:22,padding:12,gap:12},stat:{flex:1,alignItems:'center',gap:3},statValue:{fontWeight:'900',fontSize:18},statLabel:{fontSize:10,color:'#8C9A94'},heading:{fontSize:15,fontWeight:'900',marginTop:4},row:{flexDirection:'row',gap:8,flexWrap:'wrap'},pill:{minHeight:40,paddingHorizontal:14,borderRadius:14,borderWidth:1,alignItems:'center',justifyContent:'center'},input:{minHeight:50,borderRadius:16,borderWidth:1,paddingHorizontal:14,fontSize:14},half:{flex:1,minWidth:130},action:{flex:1,minWidth:145,minHeight:50,borderRadius:16,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:7,paddingHorizontal:10},actionText:{fontWeight:'900',fontSize:12},disabled:{opacity:.45},result:{borderWidth:1,borderRadius:18,padding:15,gap:10,alignItems:'center'},answer:{fontSize:14,lineHeight:23,width:'100%'},queueButton:{minHeight:50,borderRadius:16,borderWidth:1,alignItems:'center',justifyContent:'center',flexDirection:'row',gap:8}});
