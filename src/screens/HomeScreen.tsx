import { Ionicons } from '@expo/vector-icons';
import { useEffect,useMemo,useState } from 'react';
import { FlatList,Image,Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';
import { supabase } from '../cloud/client';
import { useAteekTheme } from '../theme/ThemeProvider';
import { Listing,TabId } from '../types';

type Reel={id:string;caption:string;thumbnail_url?:string|null;created_at:string};
type Props={listings:Listing[];favorites:string[];onFavorite:(id:string)=>void;onOpen:(item:Listing)=>void;onNavigate:(tab:TabId)=>void;notificationCount:number;unreadChats:number;activeListings:number;profile?:Record<string,any>|null};

const money=(value:number)=>new Intl.NumberFormat('ar-IQ').format(Math.max(0,Math.round(value)))+' د.ع';
const greeting=()=>{const h=new Date().getHours();return h<12?'صباح الخير':h<18?'مساء الخير':'مساء الخير'};

export function HomeScreen({listings,favorites,onFavorite,onOpen,onNavigate,notificationCount,unreadChats,activeListings,profile}:Props){
  const{colors,lowData}=useAteekTheme();
  const[reels,setReels]=useState<Reel[]>([]),[reelCount,setReelCount]=useState(0);
  useEffect(()=>{let alive=true;const load=async()=>{const[r,c]=await Promise.all([supabase.from('reels').select('id,caption,thumbnail_url,created_at').eq('status','active').order('created_at',{ascending:false}).limit(3),supabase.from('reels').select('id',{count:'exact',head:true}).eq('status','active')]);if(!alive)return;if(!r.error)setReels((r.data??[]) as Reel[]);if(!c.error)setReelCount(c.count??0)};void load().catch(()=>{});const ch=supabase.channel('home-run77-reels').on('postgres_changes',{event:'*',schema:'public',table:'reels'},()=>void load()).subscribe();return()=>{alive=false;void supabase.removeChannel(ch)}},[]);
  const latestListings=useMemo(()=>listings.slice().sort((a,b)=>b.createdAt-a.createdAt).slice(0,5),[listings]);
  const displayName=String(profile?.name||profile?.display_name||'صديق عتيك').trim();
  const quick=[
    {label:'ريلز',value:reelCount,icon:'play-circle-outline' as const,tab:'ai' as TabId},
    {label:'الإعلانات',value:activeListings,icon:'grid-outline' as const,tab:'search' as TabId},
    {label:'بحث',value:null,icon:'sparkles-outline' as const,tab:'search' as TabId},
    {label:'محادثات',value:unreadChats,icon:'chatbubble-ellipses-outline' as const,tab:'chats' as TabId},
  ];
  return <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <View style={s.topBar}>
      <View style={s.brandCell}><Text style={[s.brand,{color:colors.gold}]}>ATEEK</Text></View>
      <View style={s.centerCell}><Pressable accessibilityRole="button" accessibilityLabel={notificationCount>0?`الإشعارات، ${notificationCount} غير مقروءة`:'الإشعارات'} accessibilityHint="يفتح مركز الإشعارات" onPress={()=>onNavigate('notifications')} style={[s.iconButton,{borderColor:colors.line,backgroundColor:colors.glass}]}><Ionicons name="notifications-outline" size={24} color={colors.ink}/>{notificationCount>0&&<View style={s.badge}><Text style={s.badgeText}>{Math.min(notificationCount,99)}</Text></View>}</Pressable></View>
      <View style={s.profileCell}><Pressable accessibilityRole="button" accessibilityLabel="الحساب" accessibilityHint="يفتح ملفك وإعدادات الحساب" onPress={()=>onNavigate('profile')} style={[s.avatar,{borderColor:colors.line,backgroundColor:colors.glass}]}>{profile?.avatar_url?<Image source={{uri:String(profile.avatar_url)}} style={StyleSheet.absoluteFill}/>:<Ionicons name="person" size={24} color={colors.gold}/>}</Pressable></View>
    </View>

    <View style={s.welcome}><Text style={[s.greeting,{color:colors.muted}]}>{greeting()}</Text><Text numberOfLines={1} style={[s.name,{color:colors.ink}]}>{displayName}</Text></View>

    <View style={s.quickGrid}>{quick.map(q=><Pressable key={q.label} accessibilityRole="button" accessibilityLabel={q.value!=null?`${q.label}، ${q.value}`:q.label} accessibilityHint={`يفتح ${q.label}`} onPress={()=>onNavigate(q.tab)} style={[s.quickCard,{backgroundColor:colors.glass,borderColor:colors.line}]}><View style={[s.quickIcon,{borderColor:colors.line}]}><Ionicons name={q.icon} size={28} color={colors.gold}/></View><View style={s.quickCopy}><Text style={[s.quickLabel,{color:colors.ink}]}>{q.label}</Text>{q.value!=null&&<Text style={[s.quickValue,{color:colors.muted}]}>{q.value}</Text>}</View></Pressable>)}</View>

    <View style={s.sectionHeader}><Text style={[s.sectionTitle,{color:colors.ink}]}>أحدث الإعلانات</Text><Pressable accessibilityRole="button" onPress={()=>onNavigate('search')} accessibilityLabel="عرض كل الإعلانات" accessibilityHint="يفتح البحث والإعلانات"><Ionicons name="arrow-back" size={20} color={colors.gold}/></Pressable></View>
    <FlatList horizontal inverted data={latestListings} keyExtractor={x=>x.id} showsHorizontalScrollIndicator={false} initialNumToRender={lowData?2:4} maxToRenderPerBatch={lowData?2:4} contentContainerStyle={s.horizontal} renderItem={({item})=>{const isFavorite=favorites.includes(item.id);return <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}، ${money(item.price)}`} accessibilityHint="يفتح تفاصيل الإعلان" onPress={()=>onOpen(item)} style={[s.listingCard,{backgroundColor:colors.glass,borderColor:colors.line}]}>{item.image?<Image source={{uri:item.image}} style={s.listingImage}/>:<View style={[s.listingImage,s.placeholder]}><Ionicons name="image-outline" size={28} color={colors.muted}/></View>}<View style={s.listingBody}><Text numberOfLines={1} style={[s.listingTitle,{color:colors.ink}]}>{item.title}</Text><Text style={[s.price,{color:colors.gold}]}>{money(item.price)}</Text><Pressable accessibilityRole="button" accessibilityLabel={isFavorite?'إزالة من المفضلة':'إضافة إلى المفضلة'} accessibilityState={{selected:isFavorite}} hitSlop={10} onPress={event=>{event.stopPropagation();onFavorite(item.id)}} style={s.favorite}><Ionicons name={isFavorite?'heart':'heart-outline'} size={20} color={isFavorite?'#FF7B86':colors.muted}/></Pressable></View></Pressable>}} ListEmptyComponent={<View style={[s.empty,{borderColor:colors.line}]}><Text style={[s.emptyText,{color:colors.muted}]}>لا توجد إعلانات حالياً</Text></View>}/>

    <View style={s.sectionHeader}><Text style={[s.sectionTitle,{color:colors.ink}]}>أحدث الريلز</Text><Pressable accessibilityRole="button" onPress={()=>onNavigate('ai')} accessibilityLabel="فتح الريلز" accessibilityHint="يفتح أحدث الريلز"><Ionicons name="play-circle-outline" size={24} color={colors.gold}/></Pressable></View>
    <FlatList horizontal inverted data={reels} keyExtractor={x=>x.id} showsHorizontalScrollIndicator={false} initialNumToRender={lowData?1:3} maxToRenderPerBatch={lowData?1:3} contentContainerStyle={s.horizontal} renderItem={({item})=><Pressable accessibilityRole="button" accessibilityLabel={item.caption||'ريل'} accessibilityHint="يفتح الريلز" onPress={()=>onNavigate('ai')} style={[s.reelCard,{backgroundColor:colors.glass,borderColor:colors.line}]}>{item.thumbnail_url?<Image source={{uri:item.thumbnail_url}} style={s.reelImage}/>:<View style={[s.reelImage,s.placeholder]}><Ionicons name="play" size={30} color={colors.gold}/></View>}<Text numberOfLines={2} style={[s.reelCaption,{color:colors.ink}]}>{item.caption||'ريل جديد'}</Text></Pressable>} ListEmptyComponent={<View style={[s.empty,{borderColor:colors.line}]}><Text style={[s.emptyText,{color:colors.muted}]}>لا توجد ريلز حالياً</Text></View>}/>
  </ScrollView>;
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:'transparent'},content:{paddingHorizontal:24,paddingTop:10,paddingBottom:28,gap:12},
  topBar:{minHeight:58,flexDirection:'row',alignItems:'center'},brandCell:{flex:1,alignItems:'flex-start'},centerCell:{flex:1,alignItems:'center'},profileCell:{flex:1,alignItems:'flex-end'},brand:{fontFamily:'System',fontSize:24,fontWeight:'900',letterSpacing:1.4},
  iconButton:{width:44,height:44,borderRadius:20,borderWidth:1,alignItems:'center',justifyContent:'center'},avatar:{width:44,height:44,borderRadius:22,borderWidth:1,alignItems:'center',justifyContent:'center',overflow:'hidden'},badge:{position:'absolute',right:-4,top:-4,minWidth:18,height:18,borderRadius:9,paddingHorizontal:4,alignItems:'center',justifyContent:'center',backgroundColor:'#FF7B86'},badgeText:{fontFamily:'System',fontSize:9,fontWeight:'900',color:'#FFFFFF'},
  welcome:{paddingVertical:8},greeting:{fontFamily:'System',fontSize:13,textAlign:'right'},name:{fontFamily:'System',fontSize:24,fontWeight:'800',textAlign:'right',marginTop:2},
  quickGrid:{flexDirection:'row-reverse',flexWrap:'wrap',gap:12},quickCard:{width:'48%',minHeight:112,borderRadius:20,borderWidth:1,padding:16,justifyContent:'space-between'},quickIcon:{width:44,height:44,borderRadius:16,borderWidth:1,alignItems:'center',justifyContent:'center'},quickCopy:{alignItems:'flex-end'},quickLabel:{fontFamily:'System',fontSize:14,fontWeight:'800'},quickValue:{fontFamily:'System',fontSize:12,fontWeight:'700',marginTop:3},
  sectionHeader:{marginTop:8,minHeight:36,flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between'},sectionTitle:{fontFamily:'System',fontSize:17,fontWeight:'900',textAlign:'right'},horizontal:{gap:12,paddingVertical:4},
  listingCard:{width:218,borderRadius:20,borderWidth:1,overflow:'hidden'},listingImage:{width:'100%',height:132},placeholder:{alignItems:'center',justifyContent:'center'},listingBody:{padding:12,minHeight:88},listingTitle:{fontFamily:'System',fontSize:13,fontWeight:'800',textAlign:'right',paddingLeft:28},price:{fontFamily:'System',fontSize:13,fontWeight:'900',textAlign:'right',marginTop:6},favorite:{position:'absolute',left:10,top:10},
  reelCard:{width:150,borderRadius:20,borderWidth:1,overflow:'hidden'},reelImage:{width:'100%',height:184},reelCaption:{fontFamily:'System',fontSize:11,fontWeight:'700',textAlign:'right',lineHeight:17,padding:12,minHeight:54},
  empty:{width:190,height:92,borderRadius:20,borderWidth:1,alignItems:'center',justifyContent:'center'},emptyText:{fontFamily:'System',fontSize:12},
});