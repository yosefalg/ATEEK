import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, BackHandler, FlatList, KeyboardAvoidingView, Modal, Platform, Pressable, SafeAreaView, ScrollView, StatusBar as NativeStatusBar, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Session } from '@supabase/supabase-js';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImageManipulator from 'expo-image-manipulator';
import { decode } from 'base64-arraybuffer';
import { action, supabase } from './client';
import { Cloud, useCloud } from './useCloud';
import { Listing, TabId } from '../types';
import { HomeScreen } from '../screens/HomeScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { AddListingScreen } from '../screens/AddListingScreen';
import { BottomNav } from '../components/BottomNav';
import { ListingCard } from '../components/ListingCard';
import { EmptyState } from '../components/EmptyState';
import { colors } from '../theme/colors';
import { formatPrice } from '../data/seed';
import { parsePrice } from '../utils/money';

function Button({title,onPress,disabled=false}:{title:string;onPress:()=>void;disabled?:boolean}) {
  return <Pressable accessibilityRole="button" accessibilityState={{disabled}} disabled={disabled} onPress={onPress} style={[s.button,disabled&&{opacity:.45}]}><Text style={s.buttonText}>{title}</Text></Pressable>;
}
function Input(props: React.ComponentProps<typeof TextInput>) {return <TextInput placeholderTextColor={colors.muted} {...props} style={[s.input,props.style]} />;}
async function attempt(fn:()=>Promise<unknown>) {try {await fn();}catch(e:any){Alert.alert('تعذّر إكمال العملية',e.message || 'تحقق من اتصال الإنترنت.');}}
export default function OnlineApp() {
  const [session,setSession]=useState<Session|null>(null),[ready,setReady]=useState(false),[error,setError]=useState('');
  useEffect(()=>{
    let alive=true;
    supabase.auth.getSession().then(({data,error})=>{if(!alive)return; if(error)setError(error.message);setSession(data.session);setReady(true);}).catch(()=>{if(alive){setError('تعذّر قراءة الجلسة. أغلق التطبيق وافتحه مجددًا.');setReady(true);}});
    const {data}=supabase.auth.onAuthStateChange((_event,next)=>{if(alive)setSession(next);});
    return ()=>{alive=false;data.subscription.unsubscribe();};
  },[]);
  return <SafeAreaView style={s.root}><StatusBar style="light" />{!ready?<ActivityIndicator color={colors.gold} style={{flex:1}}/>:session?<Market key={session.user.id} session={session}/>:<Auth initialError={error}/>}</SafeAreaView>;
}
function Auth({initialError}:{initialError:string}) {
  const [register,setRegister]=useState(false),[email,setEmail]=useState(''),[password,setPassword]=useState(''),[name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(initialError);
  const submit=async()=>{
    if(busy)return;
    if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())||password.length<10||(register&&!name.trim())) {setError('أدخل بريدًا صحيحًا وكلمة مرور من 10 أحرف واسمًا عند التسجيل.');return;}
    setBusy(true);setError('');
    try {
      if(register) {
        const {data,error}=await supabase.auth.signUp({email:email.trim(),password,options:{data:{name:name.trim()}}});
        if(error)throw error;
        if(!data.session){setRegister(false);setError('تحقق من بريدك وافتح رسالة التأكيد، ثم عد وسجّل الدخول.');}
      } else {const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});if(error)throw error;}
    }catch(e:any){setError(e.message || 'تعذّر الاتصال');}finally{setBusy(false);}
  };
  return <KeyboardAvoidingView style={s.surface} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView contentContainerStyle={[s.page,{paddingTop:45}]} keyboardShouldPersistTaps="handled">
    <View style={s.brand}><Text style={{fontSize:64,color:colors.gold,fontWeight:'900'}}>عتيك</Text><Text style={{color:colors.goldSoft}}>كل شيء له قيمة</Text></View>
    <Text style={s.title}>{register?'أهلًا بك في عتيك':'سوقك يبدأ من هنا'}</Text><Text style={s.note}>بيع وشراء • تفاوض مباشر • حسابك معك</Text>
    {register&&<Input accessibilityLabel="الاسم" placeholder="اسمك" value={name} onChangeText={setName} maxLength={60}/>}
    <Input accessibilityLabel="البريد الإلكتروني" placeholder="البريد الإلكتروني" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoCorrect={false} maxLength={254}/>
    <Input accessibilityLabel="كلمة المرور" placeholder="كلمة المرور" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" maxLength={128}/>
    {!!error&&<Text accessibilityRole="alert" style={s.error}>{error}</Text>}
    <Button title={busy?'جارٍ الاتصال…':register?'إنشاء حساب':'دخول'} onPress={()=>void submit()} disabled={busy}/>
    <Button title={register?'عندي حساب بالفعل':'إنشاء حساب جديد'} onPress={()=>{setRegister(!register);setError('');}} disabled={busy}/>
    <Text style={s.note}>باستخدام عتيك توافق على عدم نشر سلع محظورة أو صور لا تملكها. صور الإعلانات عامة، والمحادثات خاصة بأطرافها. افحص السلعة قبل الدفع؛ عتيك لا يتولى الدفع أو الشحن.</Text>
  </ScrollView></KeyboardAvoidingView>;
}
function Market({session}:{session:Session}) {
  const m=useCloud(session);
  const [tab,setTab]=useState<TabId>('home'),[selected,setSelected]=useState<Listing|null>(null),[category,setCategory]=useState('all'),[thread,setThread]=useState<string|null>(null),[notice,setNotice]=useState(false);
  const [profileName,setProfileName]=useState(String(session.user.user_metadata.name||'')),[initializing,setInitializing]=useState(false);
  const mine=m.profiles.find(x=>x.id===session.user.id);
  useEffect(()=>{const sub=BackHandler.addEventListener('hardwareBackPress',()=>{if(notice){setNotice(false);return true;}if(selected){setSelected(null);return true;}if(thread){setThread(null);return true;}if(tab!=='home'){setTab('home');return true;}return false;});return()=>sub.remove();},[selected,notice,thread,tab]);
  const toggle=(id:string)=>void attempt(()=>m.mutate('favorite',{id,saved:!m.favorites.includes(id)}));
  const start=async(item:Listing)=>{const result=await m.mutate('thread',{listing_id:item.id});setThread(result.id!);setSelected(null);setTab('chats');};
  const add=async(item:Listing)=>{
    const compressed=await ImageManipulator.manipulateAsync(item.image,[{resize:{width:1400}}],{compress:.75,format:ImageManipulator.SaveFormat.JPEG});
    const base64=await FileSystem.readAsStringAsync(compressed.uri,{encoding:FileSystem.EncodingType.Base64});
    const image= session.user.id+'/'+Date.now()+'-'+Math.random().toString(36).slice(2)+'.jpg';
    const {error}=await supabase.storage.from('ateek-images').upload(image,decode(base64),{contentType:'image/jpeg',upsert:false});if(error)throw error;
    await m.mutate('listing',{...item,image});
  };
  if(m.loading)return <View style={s.surface}><ActivityIndicator color={colors.forest} style={{flex:1}}/></View>;
  if(!mine&&!m.error)return <ScrollView style={s.surface} contentContainerStyle={s.page}><Text style={s.title}>أكمل ملفك</Text><Input value={profileName} onChangeText={setProfileName} placeholder="اسم العرض" maxLength={60}/><Button title="حفظ ومتابعة" disabled={initializing} onPress={()=>void attempt(async()=>{setInitializing(true);try{await m.mutate('profile',{name:profileName});}finally{setInitializing(false);}})}/><Button title="تسجيل خروج" onPress={()=>void attempt(()=>supabase.auth.signOut())}/></ScrollView>;
  const visible=m.listings.filter(x=>x.status==='active'&&!m.blocks.some(b=>b.blocked_id===x.sellerId));
  return <View style={s.surface}>
    {!!m.error&&<Pressable onPress={()=>void m.refresh()}><Text style={s.error}>{m.error} — اضغط لإعادة المحاولة</Text></Pressable>}
    <View style={{flex:1}}>
    {tab==='home'?<HomeScreen listings={visible} favorites={m.favorites} onFavorite={toggle} onOpen={setSelected} onSearch={c=>{setCategory(c??'all');setTab('search');}} onNotifications={()=>setNotice(true)}/>:
     tab==='search'?<SearchScreen key={category} initialCategory={category} listings={visible} favorites={m.favorites} onFavorite={toggle} onOpen={setSelected}/>:
     tab==='add'?<AddListingScreen onAdd={add} onDone={()=>setTab('home')}/>:
     tab==='chats'?<Chats m={m} thread={thread} setThread={setThread}/>:
     <Account m={m} onOpen={setSelected}/>}
    </View>
    <BottomNav active={tab} onChange={setTab}/>
    <Modal visible={!!selected} animationType="slide" onRequestClose={()=>setSelected(null)}>{selected&&<Details key={selected.id} item={m.listings.find(x=>x.id===selected.id)??selected} m={m} close={()=>setSelected(null)} start={start}/>}</Modal>
    <Modal visible={notice} animationType="slide" onRequestClose={()=>setNotice(false)}><SafeAreaView style={s.surface}><ScrollView contentContainerStyle={s.page}><Text style={s.title}>الإشعارات</Text><Text style={s.note}>تتحدث داخل التطبيق أثناء اتصاله.</Text><Button title="رجوع" onPress={()=>setNotice(false)}/><Button title="تحديد الكل كمقروء" onPress={()=>void attempt(()=>m.mutate('read',{}))}/>{!m.notifications.length&&<EmptyState icon="notifications-outline" title="لا توجد إشعارات" body="ستظهر الرسائل والعروض الجديدة هنا."/>}{m.notifications.map(n=><Pressable key={n.id} style={s.card} onPress={()=>{setThread(n.thread_id);setTab('chats');setNotice(false);}}><Text style={s.heading}>{n.is_read?'':'● '}{n.title}</Text><Text style={s.note}>{new Date(n.created_at).toLocaleString('ar-IQ')}</Text></Pressable>)}</ScrollView></SafeAreaView></Modal>
  </View>;
}
function Details({item,m,close,start}:{item:Listing;m:Cloud;close:()=>void;start:(x:Listing)=>Promise<void>}) {
  const [report,setReport]=useState(''),[reporting,setReporting]=useState(false),[busy,setBusy]=useState(false);
  const reviews=m.reviews.filter(x=>x.target_id===item.sellerId), average=reviews.length?(reviews.reduce((s,x)=>s+x.stars,0)/reviews.length).toFixed(1):null;
  return <SafeAreaView style={s.surface}><ScrollView contentContainerStyle={s.page}>
    <Button title="رجوع" onPress={close}/><View style={{flexDirection:'row',justifyContent:'center'}}><ListingCard item={item} favorite={m.favorites.includes(item.id)} onFavorite={()=>void attempt(()=>m.mutate('favorite',{id:item.id,saved:!m.favorites.includes(item.id)}))} onPress={()=>{}}/></View>
    <Text style={s.title}>{item.title}</Text><Text style={s.price}>{formatPrice(item.price)}</Text><Text style={s.note}>{item.location} • {item.condition} • {item.status==='active'?'متاح':item.status==='sold'?'تم الاتفاق عليه':'محذوف'}</Text>
    <Text style={s.heading}>وصف السلعة</Text><Text style={s.body}>{item.description}</Text><Text style={s.heading}>{item.seller}</Text><Text style={s.note}>{average?'★ '+average+' من '+reviews.length+' تقييم':'لا توجد تقييمات بعد'}</Text>
    {!item.owner&&item.status==='active'&&<Button title="مراسلة البائع والتفاوض" disabled={busy} onPress={()=>void attempt(async()=>{setBusy(true);try{await start(item);}finally{setBusy(false);}})}/>}
    {!item.owner&&<><Button title="الإبلاغ عن الإعلان" onPress={()=>setReporting(!reporting)}/>{reporting&&<><Input placeholder="سبب الإبلاغ" value={report} onChangeText={setReport} maxLength={1000}/><Button title="إرسال البلاغ" onPress={()=>void attempt(async()=>{await m.mutate('report',{id:item.id,reason:report});setReporting(false);Alert.alert('استُلم البلاغ','حُفظ للمراجعة الإدارية.');})}/></>}<Button title="حظر البائع" onPress={()=>Alert.alert('حظر هذا المستخدم؟','ستُمنع الرسائل والعروض بينكما.',[{text:'إلغاء'},{text:'حظر',style:'destructive',onPress:()=>void attempt(async()=>{await m.mutate('block',{id:item.sellerId,blocked:true});close();})}])}/></>}
    {reviews.map(r=><View style={s.card} key={r.id}><Text style={s.heading}>{'★'.repeat(r.stars)}</Text><Text style={s.body}>{r.body}</Text></View>)}
  </ScrollView></SafeAreaView>;
}
function Chats({m,thread,setThread}:{m:Cloud;thread:string|null;setThread:(id:string|null)=>void}) {
  const [body,setBody]=useState(''),[price,setPrice]=useState(''),[busy,setBusy]=useState(false);
  const t=m.threads.find(x=>x.id===thread),listing=m.listings.find(x=>x.id===t?.listing_id);
  const send=(name:string,payload:Record<string,unknown>)=>void attempt(async()=>{if(busy)return;setBusy(true);try{await m.mutate(name,payload);if(name==='message')setBody('');if(name==='offer')setPrice('');}finally{setBusy(false);}});
  if(!thread)return <FlatList contentContainerStyle={s.page} data={m.threads} keyExtractor={x=>x.id} ListHeaderComponent={<Text style={s.title}>المحادثات</Text>} ListEmptyComponent={<EmptyState icon="chatbubble-outline" title="لا توجد محادثات" body="اختر سلعة وابدأ التفاوض مع البائع."/>} renderItem={({item})=><Pressable style={s.card} onPress={()=>setThread(item.id)}><Text style={s.heading}>{m.listings.find(x=>x.id===item.listing_id)?.title??'إعلان سابق'}</Text><Text style={s.note}>{m.messages.filter(x=>x.thread_id===item.id).slice(-1)[0]?.body??'ابدأ المحادثة'}</Text></Pressable>}/>;
  return <KeyboardAvoidingView style={{flex:1}} behavior={Platform.OS==='ios'?'padding':undefined}><ScrollView contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
    <Button title="رجوع للمحادثات" onPress={()=>setThread(null)}/><Text style={s.title}>{listing?.title??'المحادثة'}</Text>
    {m.messages.filter(x=>x.thread_id===thread).map(x=><View key={x.id} style={[s.card,{backgroundColor:x.sender_id===m.user.id?colors.goldSoft:colors.paper}]}><Text style={s.body}>{x.body}</Text><Text style={s.note}>{x.sender_id===m.user.id?'أنت':'الطرف الآخر'} • {new Date(x.created_at).toLocaleTimeString('ar-IQ')}</Text></View>)}
    <Input accessibilityLabel="الرسالة" placeholder="اكتب رسالتك…" value={body} onChangeText={setBody} maxLength={2000} multiline/><Button title="إرسال" disabled={busy||!body.trim()} onPress={()=>send('message',{thread_id:thread,body})}/>
    <Text style={s.heading}>العروض والتفاوض</Text><Input placeholder="عرضك بالدينار العراقي" value={price} onChangeText={setPrice} keyboardType="number-pad"/><Button title="إرسال عرض / سعر مقابل" disabled={busy} onPress={()=>{const value=parsePrice(price);if(!value)return Alert.alert('أدخل سعرًا صحيحًا');send('offer',{thread_id:thread,amount:value});}}/>
    {m.offers.filter(x=>x.thread_id===thread).map(o=><View key={o.id} style={s.card}><Text style={s.price}>{formatPrice(Number(o.amount))}</Text><Text style={s.note}>{({pending:'بانتظار الرد',accepted:'متفق عليه',rejected:'مرفوض',superseded:'استُبدل بعرض جديد',completed:'صفقة مكتملة'} as Record<string,string>)[o.status]} • {o.author_id===m.user.id?'عرضك':'عرض الطرف الآخر'}</Text>
      {o.status==='pending'&&o.author_id!==m.user.id&&<><Button title="قبول العرض" disabled={busy} onPress={()=>Alert.alert('تأكيد الاتفاق؟','سيصبح الإعلان غير متاح للعروض الجديدة.',[{text:'إلغاء'},{text:'قبول',onPress:()=>send('respond',{offer_id:o.id,status:'accepted'})}])}/><Button title="رفض" disabled={busy} onPress={()=>send('respond',{offer_id:o.id,status:'rejected'})}/></>}
      {o.status==='accepted'&&t?.buyer_id===m.user.id&&<Button title="تأكيد استلام السلعة" disabled={busy} onPress={()=>Alert.alert('استلمت السلعة؟','أكّد فقط بعد استلامها وفحصها.',[{text:'إلغاء'},{text:'نعم، استلمتها',onPress:()=>send('complete',{offer_id:o.id})}])}/>}
      {o.status==='completed'&&!m.reviews.some(r=>r.offer_id===o.id&&r.author_id===m.user.id)&&<Review m={m} offerId={o.id}/>}
    </View>)}
  </ScrollView></KeyboardAvoidingView>;
}
function Review({m,offerId}:{m:Cloud;offerId:string}) {
  const [stars,setStars]=useState(5),[body,setBody]=useState(''),[busy,setBusy]=useState(false);
  return <View style={{gap:10}}><Text style={s.heading}>قيّم تجربتك</Text><View style={{flexDirection:'row',gap:9}}>{[1,2,3,4,5].map(n=><Pressable key={n} accessibilityLabel={n+' نجوم'} onPress={()=>setStars(n)}><Text style={{fontSize:30,color:colors.gold}}>{n<=stars?'★':'☆'}</Text></Pressable>)}</View><Input value={body} onChangeText={setBody} placeholder="تعليقك (اختياري)" maxLength={1000}/><Button title="نشر التقييم" disabled={busy} onPress={()=>void attempt(async()=>{setBusy(true);try{await m.mutate('review',{offer_id:offerId,stars,body});}finally{setBusy(false);}})}/></View>;
}
function Account({m,onOpen}:{m:Cloud;onOpen:(x:Listing)=>void}) {
  const [section,setSection]=useState('إعلاناتي'),[name,setName]=useState(m.profiles.find(x=>x.id===m.user.id)?.name??'');
  const items=section==='المفضلة'?m.listings.filter(x=>m.favorites.includes(x.id)):m.listings.filter(x=>x.owner&&x.status!=='removed');
  return <ScrollView contentContainerStyle={s.page}><Text style={s.title}>حسابي</Text><Text style={s.note}>{m.user.email}</Text><View style={{flexDirection:'row-reverse',gap:8,flexWrap:'wrap'}}>{['إعلاناتي','المفضلة','الإعدادات'].map(t=><Button key={t} title={t} onPress={()=>setSection(t)}/>)}</View>
    {section==='الإعدادات'?<><Input value={name} onChangeText={setName} maxLength={60} placeholder="اسم العرض"/><Button title="حفظ الاسم" onPress={()=>void attempt(()=>m.mutate('profile',{name}))}/><Text style={s.heading}>المستخدمون المحظورون</Text>{m.blocks.map(b=><Button key={b.blocked_id} title={'إلغاء حظر '+(m.profiles.find(p=>p.id===b.blocked_id)?.name??'مستخدم')} onPress={()=>void attempt(()=>m.mutate('block',{id:b.blocked_id,blocked:false}))}/>)}<Text style={s.note}>صور الإعلانات عامة. المحادثات والعروض متاحة للمشاركين فقط. تستخدم بيانات حسابك لتشغيل السوق؛ لا توجد بوابة دفع أو ضمان مالي في عتيك.</Text><Button title="تسجيل الخروج" onPress={()=>void attempt(async()=>{const {error}=await supabase.auth.signOut();if(error)throw error;})}/></>:
    <>{!items.length&&<EmptyState icon="cube-outline" title="لا توجد عناصر" body="أضف إعلانًا أو احفظ سلعة في المفضلة."/>}{items.map(x=><View key={x.id} style={s.card}><Pressable onPress={()=>onOpen(x)}><Text style={s.heading}>{x.title}</Text><Text style={s.price}>{formatPrice(x.price)}</Text></Pressable>{section==='إعلاناتي'&&<Button title="حذف الإعلان" onPress={()=>Alert.alert('حذف الإعلان؟','سيختفي من السوق.',[{text:'إلغاء'},{text:'حذف',style:'destructive',onPress:()=>void attempt(()=>m.mutate('remove',{id:x.id}))}])}/>}</View>)}</>}
  </ScrollView>;
}
const s=StyleSheet.create({
  root:{flex:1,backgroundColor:colors.forest,paddingTop:Platform.OS==='android'?NativeStatusBar.currentHeight:0},surface:{flex:1,backgroundColor:colors.cream},
  page:{padding:18,gap:14,paddingBottom:35},title:{fontSize:26,fontWeight:'900',textAlign:'right',color:colors.forest},heading:{fontSize:17,fontWeight:'800',textAlign:'right',color:colors.ink},
  note:{fontSize:12,color:colors.muted,textAlign:'right',lineHeight:22},body:{fontSize:15,textAlign:'right',color:colors.ink,lineHeight:26},
  input:{backgroundColor:colors.paper,borderRadius:15,borderWidth:1,borderColor:colors.line,padding:14,textAlign:'right',minHeight:52,color:colors.ink},
  button:{backgroundColor:colors.gold,borderRadius:16,padding:14,alignItems:'center',minHeight:48},buttonText:{fontWeight:'800',color:colors.forest},price:{fontSize:21,fontWeight:'900',color:colors.success,textAlign:'right'},
  card:{backgroundColor:colors.paper,borderRadius:19,padding:16,gap:10,borderWidth:1,borderColor:colors.line,marginVertical:5},
  brand:{backgroundColor:colors.forest,borderRadius:30,alignItems:'center',padding:22,marginBottom:15},error:{backgroundColor:'#ffe5df',color:'#8b271a',padding:12,textAlign:'right',lineHeight:22}
});
