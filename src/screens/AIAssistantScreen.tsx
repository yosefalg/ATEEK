import { useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../theme/colors';
import { Listing } from '../types';
import { supabase } from '../cloud/client';

type Msg={id:string;role:'user'|'assistant';body:string};
type Props={listings:Listing[];favorites:string[];messagesCount:number;offersCount:number};

export function AIAssistantScreen({listings,favorites,messagesCount,offersCount}:Props){
  const [text,setText]=useState('');
  const [busy,setBusy]=useState(false);
  const [chat,setChat]=useState<Msg[]>([{id:'hello',role:'assistant',body:'مرحبًا، أنا مساعد عتيك الذكي. أستخدم خدمة ذكاء اصطناعي سحابية لتحليل بيانات السوق المتاحة لك، ومقارنة الأسعار وتقديم إرشادات عملية. لا ترسل كلمات مرور أو رموز تحقق أو بيانات حساسة.'}]);

  const ask=async(q:string)=>{
    if(!q||busy)return;
    const uid=Date.now()+'u';
    setChat(c=>[...c,{id:uid,role:'user',body:q}]);
    setText(''); setBusy(true);
    try{
      const market=listings.filter(x=>x.status!=='removed').slice(0,80).map(x=>({title:x.title,price:x.price,category:x.category,location:x.location,condition:x.condition,status:x.status,description:x.description,verified:x.verified}));
      const {data,error}=await supabase.functions.invoke('ateek-assistant',{body:{question:q,listings:market,favoritesCount:favorites.length,messagesCount,offersCount}});
      if(error)throw new Error(error.message);
      if(!data?.answer)throw new Error(data?.message||'لم يصل رد من خدمة الذكاء الاصطناعي');
      setChat(c=>[...c,{id:Date.now()+'a',role:'assistant',body:String(data.answer)}]);
    }catch(e){
      const message=e instanceof Error?e.message:'تعذر الاتصال بخدمة الذكاء الاصطناعي';
      setChat(c=>[...c,{id:Date.now()+'e',role:'assistant',body:`تعذر إكمال الطلب الآن: ${message}. تحقق من الإنترنت وحاول مجددًا.`}]);
    }finally{setBusy(false);}
  };
  const send=()=>ask(text.trim());
  const chips=['لخص السوق','قارن الأسعار','حلل أفضل فرص الشراء','ساعدني أسعّر إعلانًا','نصائح بيع آمنة'];
  return <View style={s.root}>
    <View style={s.hero}><View style={s.bot}><Ionicons name="sparkles" size={28} color={colors.gold}/></View><View style={{flex:1}}><Text style={s.title}>مساعد عتيك AI</Text><Text style={s.sub}>ذكاء اصطناعي سحابي • تحليل السوق • مقارنة الأسعار</Text></View></View>
    <FlatList data={chat} keyExtractor={x=>x.id} contentContainerStyle={s.chat} renderItem={({item})=><View style={[s.bubble,item.role==='user'?s.user:s.ai]}><Text style={[s.body,item.role==='user'&&{color:'#fff'}]}>{item.body}</Text></View>} ListFooterComponent={<><View style={s.chips}>{chips.map(x=><Pressable disabled={busy} key={x} onPress={()=>ask(x)} style={[s.chip,busy&&{opacity:.55}]}><Text style={s.chipText}>{x}</Text></Pressable>)}</View>{busy?<View style={s.loading}><ActivityIndicator/><Text style={s.loadingText}>مساعد عتيك يحلل البيانات…</Text></View>:null}</>}/>
    <View style={s.composer}><Pressable accessibilityRole="button" disabled={busy} onPress={send} style={[s.send,busy&&{opacity:.55}]}>{busy?<ActivityIndicator color="#fff"/>:<Ionicons name="arrow-up" size={22} color="#fff"/>}</Pressable><TextInput editable={!busy} value={text} onChangeText={setText} onSubmitEditing={send} placeholder="اسأل مساعد عتيك…" placeholderTextColor={colors.muted} style={s.input} textAlign="right"/></View>
  </View>;
}

const s=StyleSheet.create({root:{flex:1,backgroundColor:colors.cream},hero:{margin:16,padding:16,borderRadius:22,backgroundColor:colors.forest,flexDirection:'row-reverse',alignItems:'center',gap:12},bot:{width:52,height:52,borderRadius:18,alignItems:'center',justifyContent:'center',backgroundColor:'rgba(216,169,78,.12)',borderWidth:1,borderColor:'rgba(216,169,78,.35)'},title:{fontSize:24,fontWeight:'900',color:'#fff',textAlign:'right'},sub:{fontSize:11,color:colors.goldSoft,textAlign:'right',marginTop:3},chat:{paddingHorizontal:16,paddingBottom:20,gap:10},bubble:{maxWidth:'88%',padding:13,borderRadius:18},user:{alignSelf:'flex-end',backgroundColor:colors.forest,borderBottomRightRadius:5},ai:{alignSelf:'flex-start',backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line,borderBottomLeftRadius:5},body:{fontSize:14,lineHeight:22,color:colors.ink,textAlign:'right'},chips:{flexDirection:'row-reverse',flexWrap:'wrap',gap:8,marginTop:8},chip:{paddingHorizontal:12,paddingVertical:8,borderRadius:999,backgroundColor:colors.paper,borderWidth:1,borderColor:colors.line},chipText:{fontSize:11,fontWeight:'700',color:colors.forest},loading:{marginTop:12,flexDirection:'row-reverse',alignItems:'center',gap:8},loadingText:{fontSize:12,color:colors.muted},composer:{flexDirection:'row',alignItems:'center',padding:12,borderTopWidth:1,borderTopColor:colors.line,backgroundColor:colors.paper,gap:8},input:{flex:1,minHeight:46,borderRadius:16,backgroundColor:colors.cream,paddingHorizontal:14,color:colors.ink},send:{width:46,height:46,borderRadius:16,backgroundColor:colors.forest,alignItems:'center',justifyContent:'center'}});
