import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Listing } from '../types';

type Msg={id:string;role:'user'|'assistant';body:string};
type Props={listings:Listing[];favorites:string[];messagesCount:number;offersCount:number};

const money=(n:number)=>new Intl.NumberFormat('ar-IQ').format(Math.round(n))+' د.ع';

export function AIAssistantScreen({listings,favorites,messagesCount,offersCount}:Props){
  const [text,setText]=useState('');
  const [chat,setChat]=useState<Msg[]>([{id:'hello',role:'assistant',body:'مرحبًا، أنا مساعد عتيك الذكي. أستطيع تحليل السوق الحالي داخل التطبيق، تلخيص إعلاناتك، مقارنة الأسعار واقتراح خطوات للبيع والشراء بدون إرسال كلمة مرورك لأي جهة.'}]);
  const stats=useMemo(()=>{
    const active=listings.filter(x=>x.status==='active');
    const avg=active.length?active.reduce((s,x)=>s+x.price,0)/active.length:0;
    const min=active.length?Math.min(...active.map(x=>x.price)):0;
    const max=active.length?Math.max(...active.map(x=>x.price)):0;
    return {active,avg,min,max};
  },[listings]);
  const answer=(q:string)=>{
    const s=q.trim().toLowerCase();
    if(!s)return '';
    if(/(لخص|ملخص|السوق|احصائ|إحصائ)/.test(s))return `يوجد الآن ${stats.active.length} إعلانًا نشطًا. متوسط السعر ${money(stats.avg)}، وأقل سعر ${money(stats.min)} وأعلى سعر ${money(stats.max)}. لديك ${favorites.length} عناصر في المفضلة، ${messagesCount} رسالة و${offersCount} عرضًا مسجلًا.`;
    if(/(سعر|اسعار|أسعار|مقارن)/.test(s)){
      const sorted=[...stats.active].sort((a,b)=>a.price-b.price).slice(0,5);
      return sorted.length?'أرخص الإعلانات الحالية:\n'+sorted.map((x,i)=>`${i+1}. ${x.title} — ${money(x.price)}`).join('\n'):'لا توجد إعلانات نشطة كافية للمقارنة الآن.';
    }
    if(/(بيع|اعلان|إعلان|أبيع)/.test(s))return 'لرفع فرصة البيع: استخدم صورة واضحة بإضاءة جيدة، عنوانًا يذكر النوع والحالة، وصفًا صادقًا للعيوب، وسعرًا قريبًا من متوسط السوق. لا ترسل عربونًا أو بيانات حساسة خارج المحادثة.';
    if(/(شراء|اشتري|أشتري)/.test(s))return 'قبل الشراء: قارن 3 إعلانات على الأقل، راجع حالة السلعة والصور، تفاوض داخل المحادثة، وافحص السلعة فعليًا قبل الدفع. السعر المنخفض جدًا مقارنة بالسوق إشارة تستحق التحقق.';
    if(/(امان|أمان|احتيال|نصب)/.test(s))return 'علامات الخطر: استعجال الدفع، طلب تحويل خارج المنصة، رفض الفحص، صور مسروقة أو وصف متناقض. استخدم الإبلاغ والحظر عند الشك ولا تشارك رمز التحقق أو كلمة المرور.';
    return `أستطيع مساعدتك بأفضل شكل في: تلخيص السوق، مقارنة الأسعار، تحسين إعلان للبيع، نصائح الشراء، أو الأمان. اكتب مثلًا: «لخص السوق» أو «قارن الأسعار».`;
  };
  const send=()=>{const q=text.trim();if(!q)return;const a=answer(q);setChat(c=>[...c,{id:Date.now()+'u',role:'user',body:q},{id:Date.now()+'a',role:'assistant',body:a}]);setText('');};
  const chips=['لخص السوق','قارن الأسعار','ساعدني أبيع','نصائح شراء','تجنب الاحتيال'];
  return <View style={s.root}>
    <View style={s.hero}><View style={s.bot}><Ionicons name="sparkles" size={28} color={colors.gold}/></View><View style={{flex:1}}><Text style={s.title}>ATEEK AI</Text><Text style={s.sub}>مساعد السوق الذكي • يعمل على بيانات عتيك الحالية</Text></View></View>
    <FlatList data={chat} keyExtractor={x=>x.id} contentContainerStyle={s.chat} renderItem={({item})=><View style={[s.bubble,item.role==='user'?s.user:s.ai]}><Text style={[s.body,item.role==='user'&&{color:'#fff'}]}>{item.body}</Text></View>} ListFooterComponent={<View style={s.chips}>{chips.map(x=><Pressable key={x} onPress={()=>{const a=answer(x);setChat(c=>[...c,{id:Date.now()+x,role:'user',body:x},{id:Date.now()+x+'a',role:'assistant',body:a}]);}} style={s.chip}><Text style={s.chipText}>{x}</Text></Pressable>)}</View>}/>
    <View style={s.composer}><Pressable accessibilityRole="button" onPress={send} style={s.send}><Ionicons name="arrow-up" size={22} color="#fff"/></Pressable><TextInput value={text} onChangeText={setText} onSubmitEditing={send} placeholder="اسأل مساعد عتيك…" placeholderTextColor={colors.muted} style={s.input} textAlign="right"/></View>
  </View>;
}

const s=StyleSheet.create({root:{flex:1,backgroundColor:colors.cream},hero:{margin:16,padding:16,borderRadius:22,backgroundColor:colors.forest,flexDirection:'row-reverse',alignItems:'center',gap:12},bot:{width:52,height:52,borderRadius:18,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(216,169,78,.12)',borderWidth:1,borderColor:'rgba(216,169,78,.35)'},title:{fontSize:24,fontWeight:'900',color:'#fff',textAlign:'right'},sub:{fontSize:11,color:colors.goldSoft,textAlign:'right',marginTop:3},chat:{paddingHorizontal:16,paddingBottom:20,gap:10},bubble:{maxWidth:'88%',padding:13,borderRadius:18},user:{alignSelf:'flex-end',backgroundColor:colors.forest,borderBottomRightRadius:5},ai:{alignSelf:'flex-start',backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderBottomLeftRadius:5},body:{fontSize:14,lineHeight:22,color:colors.ink,textAlign:'right'},chips:{flexDirection:'row-reverse',flexWrap:'wrap',gap:8,marginTop:8},chip:{paddingHorizontal:12,paddingVertical:8,borderRadius:999,backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line},chipText:{fontSize:11,fontWeight:'700',color:colors.forest},composer:{flexDirection:'row',alignItems:'center',padding:12,borderTopWidth:1,borderTopColor:colors.line,backgroundColor:colors.paper,gap:8},input:{flex:1,minHeight:46,borderRadius:16,backgroundColor:colors.cream,paddingHorizontal:14,color:colors.ink},send:{width:46,height:46,borderRadius:16,backgroundColor:colors.forest,alignItems:'center',justifyContent:'center'}});
