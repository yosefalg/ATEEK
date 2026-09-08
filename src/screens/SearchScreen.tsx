import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { useEffect,useMemo,useState } from 'react';
import { Alert,FlatList,Pressable,StyleSheet,Text,TextInput,View } from 'react-native';
import { supabase } from '../cloud/client';
import { EmptyState } from '../components/EmptyState';
import { ListingCard } from '../components/ListingCard';
import { categories } from '../data/seed';
import { openSpatialProfile } from '../social/spatialSocialBus';
import { useAteekTheme } from '../theme/ThemeProvider';
import { Listing } from '../types';

type Saved={q:string;category:string};
type Sort='newest'|'nearest'|'most_viewed';
const HISTORY='ateek.search.history.v1',SAVED='ateek.search.saved.v1',SORT='ateek.listing.sort';
const categoryOptions=[{id:'all',label:'الكل'},...categories];
const sortOptions:[Sort,string,keyof typeof Ionicons.glyphMap][]=[
  ['newest','الأحدث','time-outline'],
  ['most_viewed','الأكثر مشاهدة','eye-outline'],
  ['nearest','الأقرب','navigate-outline'],
];
const distance=(a:number,b:number,c:number,d:number)=>{const r=6371,to=(x:number)=>x*Math.PI/180,dl=to(c-a),dn=to(d-b),h=Math.sin(dl/2)**2+Math.cos(to(a))*Math.cos(to(c))*Math.sin(dn/2)**2;return 2*r*Math.asin(Math.sqrt(h));};
const normalize=(value:string)=>value.trim().toLocaleLowerCase('ar');
const searchable=(x:Listing)=>normalize(`${x.title} ${x.location} ${x.description}`);
const parseStringArray=(raw:string|null)=>{if(!raw)return[];try{const value=JSON.parse(raw);return Array.isArray(value)?value.filter((x):x is string=>typeof x==='string').slice(0,8):[]}catch{return[]}};
const parseSaved=(raw:string|null)=>{if(!raw)return[];try{const value=JSON.parse(raw);return Array.isArray(value)?value.filter((x):x is Saved=>!!x&&typeof x.q==='string'&&typeof x.category==='string').slice(0,12):[]}catch{return[]}};

export function SearchScreen({listings,favorites,onFavorite,onOpen,initialCategory='all'}:{listings:Listing[];favorites:string[];onFavorite:(id:string)=>void;onOpen:(item:Listing)=>void;initialCategory?:string}){
  const{colors,lowData}=useAteekTheme();
  const[query,setQuery]=useState(''),[category,setCategory]=useState(initialCategory),[history,setHistory]=useState<string[]>([]),[saved,setSaved]=useState<Saved[]>([]),[near,setNear]=useState<{lat:number;lon:number}|null>(null),[sort,setSort]=useState<Sort>('newest'),[userBusy,setUserBusy]=useState(false),[locationBusy,setLocationBusy]=useState(false);

  useEffect(()=>{setCategory(initialCategory)},[initialCategory]);

  useEffect(()=>{let alive=true;void AsyncStorage.multiGet([HISTORY,SAVED,SORT]).then(async entries=>{
    if(!alive)return;
    const values=new Map(entries),h=values.get(HISTORY)??null,v=values.get(SAVED)??null,o=values.get(SORT)??null;
    setHistory(parseStringArray(h));setSaved(parseSaved(v));
    if(o==='newest'||o==='nearest'||o==='most_viewed')setSort(o);
    if(o==='nearest'){
      try{const p=await Location.getForegroundPermissionsAsync();if(alive&&p.status==='granted'){const x=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});if(alive)setNear({lat:x.coords.latitude,lon:x.coords.longitude})}}
      catch{if(alive)setSort('newest')}
    }
  }).catch(()=>{});return()=>{alive=false}},[]);

  const persistSort=async(next:Sort)=>{setSort(next);try{await AsyncStorage.setItem(SORT,next)}catch{}};
  const commitHistory=async(q:string)=>{const x=q.trim();if(x.length<2)return;const next=[x,...history.filter(v=>v!==x)].slice(0,8);setHistory(next);try{await AsyncStorage.setItem(HISTORY,JSON.stringify(next))}catch{}};
  const openUsername=async()=>{
    const raw=query.trim();if(!raw.startsWith('@'))return false;if(userBusy)return true;
    const name=raw.slice(1);if(!/^[A-Za-z0-9_]{3,24}$/.test(name)){Alert.alert('المعرف غير صالح','اكتب المعرف بصيغة @username.');return true}
    setUserBusy(true);
    try{const{data,error}=await supabase.rpc('ateek_profile_by_username',{p_username:name});if(error)throw error;const row=Array.isArray(data)?data[0]:data;if(!row?.id){Alert.alert('غير موجود','لم يتم العثور على هذا المستخدم.');return true}await commitHistory(raw);openSpatialProfile(String(row.id));return true}
    catch(e:any){Alert.alert('تعذر البحث',e.message||'تعذر فتح البروفايل.');return true}
    finally{setUserBusy(false)}
  };
  const submit=async()=>{if(await openUsername())return;await commitHistory(query)};
  const saveSearch=async()=>{const x=query.trim();if(x.startsWith('@'))return Alert.alert('البروفايل','بحث @username يفتح البروفايل مباشرة ولا يحتاج حفظًا.');if(!x&&category==='all')return Alert.alert('البحث المحفوظ','اكتب كلمة أو اختر قسمًا أولًا.');const next=[{q:x,category},...saved.filter(v=>v.q!==x||v.category!==category)].slice(0,12);setSaved(next);try{await AsyncStorage.setItem(SAVED,JSON.stringify(next));Alert.alert('تم الحفظ','سيبقى هذا البحث محفوظًا على جهازك وتظهر مطابقاته الجديدة داخل شاشة البحث.')}catch{Alert.alert('تعذر الحفظ','تعذر حفظ البحث على هذا الجهاز الآن.')}};
  const nearest=async()=>{if(locationBusy)return;setLocationBusy(true);try{const p=await Location.requestForegroundPermissionsAsync();if(p.status!=='granted'){Alert.alert('الموقع','يمكنك تفعيل إذن الموقع لفرز الإعلانات التي أضاف أصحابها موقعًا جغرافيًا.');return}const x=await Location.getCurrentPositionAsync({accuracy:Location.Accuracy.Balanced});setNear({lat:x.coords.latitude,lon:x.coords.longitude});await persistSort('nearest')}catch(e:any){Alert.alert('تعذر تحديد الموقع',e?.message||'تحقق من خدمة الموقع وحاول مرة أخرى.')}finally{setLocationBusy(false)}};
  const chooseSort=async(next:Sort)=>{if(next==='nearest'){await nearest();return}await persistSort(next)};

  const favoriteIds=useMemo(()=>new Set(favorites),[favorites]);
  const searchableListings=useMemo(()=>listings.map(item=>({item,text:searchable(item)})),[listings]);
  const filtered=useMemo(()=>{
    if(query.trim().startsWith('@'))return[];
    const q=normalize(query);
    const arr=searchableListings.filter(({item,text})=>(category==='all'||item.category===category)&&text.includes(q)).map(({item})=>item);
    if(sort==='nearest'&&near)return[...arr].sort((x,y)=>{const dx=x.latitude!=null&&x.longitude!=null?distance(near.lat,near.lon,x.latitude,x.longitude):Infinity,dy=y.latitude!=null&&y.longitude!=null?distance(near.lat,near.lon,y.latitude,y.longitude):Infinity;return dx-dy||y.createdAt-x.createdAt});
    if(sort==='most_viewed')return[...arr].sort((x,y)=>Number(y.viewsToday||0)-Number(x.viewsToday||0)||y.createdAt-x.createdAt);
    return[...arr].sort((x,y)=>y.createdAt-x.createdAt);
  },[searchableListings,category,query,near,sort]);
  const savedMatches=useMemo(()=>saved.reduce((n,s)=>{const q=normalize(s.q);return n+searchableListings.filter(({item,text})=>(s.category==='all'||item.category===s.category)&&text.includes(q)).length},0),[saved,searchableListings]);
  const isUsernameQuery=query.trim().startsWith('@');

  return <View style={styles.root}>
    <View style={[styles.header,{backgroundColor:colors.glassStrong,borderBottomColor:colors.line}]}>
      <Text style={[styles.title,{color:colors.ink}]}>اكتشف بذكاء</Text>
      <Text style={[styles.subtitle,{color:colors.goldSoft}]}>سلع • أقرب موقع • @username مباشر</Text>
      <View style={[styles.search,{backgroundColor:colors.glass,borderColor:colors.line}]}>
        <Pressable accessibilityRole="button" accessibilityLabel="حفظ البحث الحالي" accessibilityHint="يحفظ عبارة البحث والقسم على هذا الجهاز" hitSlop={8} onPress={()=>void saveSearch()}><Ionicons name="bookmark-outline" size={21} color={colors.gold}/></Pressable>
        <TextInput accessibilityLabel="حقل البحث" accessibilityHint="ابحث عن سلعة أو اكتب معرف مستخدم يبدأ بعلامة @" autoFocus value={query} onChangeText={setQuery} onSubmitEditing={()=>void submit()} placeholder="سلعة أو @username" placeholderTextColor={colors.muted} autoCapitalize="none" returnKeyType="search" style={[styles.input,{color:colors.ink}]}/>
        <Pressable accessibilityRole="button" accessibilityLabel="تنفيذ البحث" accessibilityState={{busy:userBusy,disabled:userBusy}} disabled={userBusy} hitSlop={8} onPress={()=>void submit()}><Ionicons name={isUsernameQuery?'person-circle-outline':'search'} size={22} color={isUsernameQuery?colors.cyan:colors.muted}/></Pressable>
      </View>
      {isUsernameQuery&&<Text accessibilityLiveRegion="polite" style={[styles.usernameHint,{color:colors.cyan}]}>{userBusy?'جارٍ فتح البروفايل…':'اضغط بحث لفتح البروفايل العام مباشرة'}</Text>}
      <View accessibilityRole="toolbar" accessibilityLabel="ترتيب نتائج البحث" style={styles.sortRow}>{sortOptions.map(([id,label,icon])=>{const active=sort===id&&(id!=='nearest'||!!near);const busy=id==='nearest'&&locationBusy;return <Pressable key={id} accessibilityRole="button" accessibilityLabel={`ترتيب حسب ${label}`} accessibilityState={{selected:active,busy}} disabled={busy} onPress={()=>void chooseSort(id)} style={[styles.sortChip,{backgroundColor:active?colors.accent:colors.glass,borderColor:active?colors.accent:colors.line}]}><Ionicons name={icon} size={15} color={active?colors.ink:colors.muted}/><Text style={[styles.sortText,{color:active?colors.ink:colors.muted}]}>{busy?'جارٍ التحديد…':label}</Text></Pressable>})}</View>
      <Text style={[styles.alertText,{color:colors.muted}]}>{saved.length?`${saved.length} بحث محفوظ • ${savedMatches} مطابقة`:'لا توجد عمليات بحث محفوظة'}</Text>
      {!isUsernameQuery&&<Text accessibilityRole="text" accessibilityLabel={`عدد نتائج البحث ${filtered.length}`} style={[styles.resultCount,{color:colors.muted}]}>{filtered.length} نتيجة</Text>}
    </View>

    {!!history.length&&<View style={styles.history}><Text style={[styles.smallTitle,{color:colors.muted}]}>بحثت مؤخرًا</Text><FlatList horizontal inverted data={history} keyExtractor={x=>x} showsHorizontalScrollIndicator={false} renderItem={({item})=><Pressable accessibilityRole="button" accessibilityLabel={`إعادة البحث عن ${item}`} onPress={()=>setQuery(item)} style={[styles.historyChip,{backgroundColor:colors.glass,borderColor:colors.line}]}><Text style={[styles.chipText,{color:colors.ink}]}>{item}</Text></Pressable>}/></View>}
    <View style={styles.chips}><FlatList horizontal inverted showsHorizontalScrollIndicator={false} data={categoryOptions} keyExtractor={x=>x.id} renderItem={({item})=><Pressable accessibilityRole="button" accessibilityLabel={`قسم ${item.label}`} accessibilityState={{selected:category===item.id}} onPress={()=>setCategory(item.id)} style={[styles.chip,{backgroundColor:category===item.id?colors.gold:colors.glass,borderColor:category===item.id?colors.gold:colors.line}]}><Text style={[styles.chipText,{color:category===item.id?colors.forest:colors.muted}]}>{item.label}</Text></Pressable>}/></View>
    <FlatList accessibilityLabel={`نتائج البحث، ${filtered.length} نتيجة`} data={filtered} keyExtractor={x=>x.id} numColumns={2} initialNumToRender={lowData?4:8} maxToRenderPerBatch={lowData?4:8} windowSize={lowData?3:6} removeClippedSubviews columnWrapperStyle={styles.row} contentContainerStyle={styles.results} keyboardShouldPersistTaps="handled" ListEmptyComponent={isUsernameQuery?<EmptyState icon="person-circle-outline" title="بحث بروفايل" body="اكتب @username واضغط بحث لفتح الحساب مباشرة"/>:<EmptyState icon="search-outline" title="لم نجد نتائج" body="جرّب كلمة أخرى أو اختر قسمًا مختلفًا"/>} renderItem={({item})=><ListingCard item={item} favorite={favoriteIds.has(item.id)} onFavorite={()=>onFavorite(item.id)} onPress={()=>{void commitHistory(query);onOpen(item);}}/>}/>
  </View>;
}

const styles=StyleSheet.create({
  root:{flex:1,backgroundColor:'transparent'},header:{padding:20,paddingTop:24,alignItems:'flex-end',borderBottomWidth:1},title:{fontSize:28,fontWeight:'900'},subtitle:{fontSize:12,marginTop:3},
  search:{marginTop:17,width:'100%',height:56,borderRadius:20,flexDirection:'row',alignItems:'center',paddingHorizontal:14,gap:10,borderWidth:1},input:{flex:1,textAlign:'right',writingDirection:'rtl'},usernameHint:{fontSize:10,fontWeight:'900',marginTop:7},
  sortRow:{width:'100%',marginTop:11,flexDirection:'row-reverse',gap:7},sortChip:{minHeight:38,flex:1,borderRadius:13,borderWidth:1,paddingHorizontal:8,flexDirection:'row-reverse',alignItems:'center',justifyContent:'center',gap:5},sortText:{fontSize:10,fontWeight:'900'},alertText:{fontSize:9,width:'100%',textAlign:'right',marginTop:8},resultCount:{fontSize:10,fontWeight:'800',width:'100%',textAlign:'right',marginTop:4},
  history:{paddingHorizontal:14,paddingTop:10},smallTitle:{textAlign:'right',fontSize:10,marginBottom:7},historyChip:{minHeight:38,paddingHorizontal:12,paddingVertical:7,borderRadius:999,marginHorizontal:4,borderWidth:1,justifyContent:'center'},chips:{height:61,paddingVertical:11,paddingHorizontal:10},chip:{paddingHorizontal:16,height:38,justifyContent:'center',borderRadius:14,borderWidth:1,marginHorizontal:4},chipText:{fontSize:12,fontWeight:'800'},results:{padding:16,paddingTop:4},row:{justifyContent:'space-between'}
});
