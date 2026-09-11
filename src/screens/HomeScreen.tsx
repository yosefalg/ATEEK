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
const firstNonEmpty=(...values:unknown[])=>values.map(value=>String(value??'').trim()).find(Boolean)??'';

export function HomeScreen({listings,favorites,onFavorite,onOpen,onNavigate,notificationCount,unreadChats,activeListings,profile}:Props){
  const{colors,lowData}=useAteekTheme();
  const[reels,setReels]=useState<Reel[]>([]),[reelCount,setReelCount]=useState(0);
  const[failedImageUrls,setFailedImageUrls]=useState(()=>new Set<string>());
  const markImageFailed=(uri:string)=>setFailedImageUrls(current=>{
    if(current.has(uri))return current;
    const next=new Set(current);
    next.add(uri);
    return next;
  });
  useEffect(()=>{
    let alive=true,loading=false,refreshQueued=false;
    const load=async()=>{
      if(loading){refreshQueued=true;return}
      loading=true;
      try{
        const[r,c]=await Promise.all([
          supabase.from('reels').select('id,caption,thumbnail_url,created_at').eq('status','active').order('created_at',{ascending:false}).limit(3),
          supabase.from('reels').select('id',{count:'exact',head:true}).eq('status','active'),
        ]);
        if(!alive)return;
        if(!r.error)setReels((r.data??[]) as Reel[]);
        if(!c.error)setReelCount(c.count??0);
      }finally{
        loading=false;
        if(alive&&refreshQueued){refreshQueued=false;safeLoad()}
      }
    };
    const safeLoad=()=>void load().catch(()=>{});
    safeLoad();
    const ch=supabase.channel('home-run77-reels').on('postgres_changes',{event:'*',schema:'public',table:'reels'},safeLoad).subscribe();
    return()=>{alive=false;refreshQueued=false;void supabase.removeChannel(ch).catch(()=>{})};
  },[]);
  const latestListings=useMemo(()=>listings.slice().sort((a,b)=>b.createdAt-a.createdAt).slice(0,5),[listings]);
  const favoriteIds=useMemo(()=>new Set(favorites),[favorites]);
  const displayName=firstNonEmpty(profile?.name,profile?.display_name,'صديق عتيك');
  const profileAvatar=firstNonEmpty(profile?.avatar_url);
  const quick=[
    {label:'ريلز',value:reelCount,icon:'play-circle-outline' as const,tab:'ai' as TabId},
    {label:'إعلاناتي',value:activeListings,icon:'grid-outline' as const,tab:'search' as TabId},
    {label:'اكتشف',value:null,icon:'search-outline' as const,tab:'search' as TabId},
    {label:'رسائل',value:unreadChats,icon:'chatbubble-ellipses-outline' as const,tab:'chats' as TabId},
  ];
  return <ScrollView style={s.root} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>
    <View style={s.topBar}>
      <View style={s.brandCell}><View><Text style={[s.brand,{color:colors.gold}]}>عتيك</Text><Text style={[s.brandSub,{color:colors.muted}]}>سوقك الذكي</Text></View></View>
      <View style={s.centerCell}><Pressable accessibilityRole="button" accessibilityLabel={notificationCount>0?`الإشعارات، ${notificationCount} غير مقروءة`:'الإشعارات'} accessibilityHint="يفتح مركز الإشعارات" onPress={()=>onNavigate('notifications')} style={[s.iconButton,{borderColor:colors.line,backgroundColor:colors.glass}]}><Ionicons name="notifications-outline" size={23} color={colors.ink}/>{notificationCount>0&&<View style={[s.badge,{backgroundColor:colors.danger}]}><Text style={s.badgeText}>{Math.min(notificationCount,99)}</Text></View>}</Pressable></View>
      <View style={s.profileCell}><Pressable accessibilityRole="button" accessibilityLabel="الحساب" accessibilityHint="يفتح ملفك وإعدادات الحساب" onPress={()=>onNavigate('profile')} style={[s.avatar,{borderColor:colors.line,backgroundColor:colors.glass}]}>{profileAvatar&&!failedImageUrls.has(profileAvatar)?<Image accessible={false} source={{uri:profileAvatar}} style={StyleSheet.absoluteFill} onError={()=>markImageFailed(profileAvatar)}/>:<Ionicons name="person" size={24} color={colors.gold}/>}</Pressable></View>
    </View>

    <View style={[s.hero,{backgroundColor:colors.glassStrong,borderColor:colors.line}]}><View style={s.heroText}><Text style={[s.greeting,{color:colors.muted}]}>{greeting()}</Text><Text numberOfLines={1} style={[s.name,{color:colors.ink}]}>{displayName}</Text><Text style={[s.heroNote,{color:colors.muted}]}>تابع السوق، رسائلك، وإعلاناتك من مكان واحد.</Text></View><View style={[s.heroOrb,{backgroundColor:colors.forestSoft,borderColor:colors.line}]}><Ionicons name="sparkles" size={25} color={colors.gold}/></View></View>

    <View style={s.quickGrid}>{quick.map(q=><Pressable key={q.label} accessibilityRole="button" accessibilityLabel={q.value!=null?`${q.label}، ${q.value}`:q.label} accessibilityHint={`يفتح ${q.label}`} onPress={()=>onNavigate(q.tab)} style={[s.quickCard,{backgroundColor:colors.glass,borderColor:colors.line}]}><View style={[s.quickIcon,{borderColor:colors.line,backgroundColor:colors.forestSoft}]}><Ionicons name={q.icon} size={26} color={colors.gold}/></View><View style={s.quickCopy}><Text style={[s.quickLabel,{color:colors.ink}]}>{q.label}</Text>{q.value!=null&&<Text style={[s.quickValue,{color:colors.muted}]}>{q.value}</Text>}</View></Pressable>)}</View>

    <View style={s.sectionHeader}><Text style={[s.sectionTitle,{color:colors.ink}]}>أحدث الإعلانات</Text><Pressable accessibilityRole="button" onPress={()=>onNavigate('search')} accessibilityLabel="عرض كل الإعلانات" accessibilityHint="يفتح البحث والإعلانات" style={[s.sectionAction,{borderColor:colors.line}]}><Text style={[s.sectionActionText,{color:colors.gold}]}>عرض الكل</Text><Ionicons name="arrow-back" size={17} color={colors.gold}/></Pressable></View>
    <FlatList horizontal inverted data={latestListings} keyExtractor={x=>x.id} showsHorizontalScrollIndicator={false} initialNumToRender={lowData?2:4} maxToRenderPerBatch={lowData?2:4} contentContainerStyle={s.horizontal} renderItem={({item})=>{const isFavorite=favoriteIds.has(item.id),image=firstNonEmpty(item.image);return <Pressable accessibilityRole="button" accessibilityLabel={`${item.title}، ${money(item.price)}`} accessibilityHint="يفتح تفاصيل الإعلان" onPress={()=>onOpen(item)} style={[s.listingCard,{backgroundColor:colors.glass,borderColor:colors.line}]}>{image&&!failedImageUrls.has(image)?<Image accessible={false} source={{uri:image}} style={s.listingImage} onError={()=>markImageFailed(image)}/>:<View style={[s.listingImage,s.placeholder,{backgroundColor:colors.forestSoft}]}><Ionicons name="image-outline" size={28} color={colors.muted}/></View>}<View style={s.listingBody}><Text numberOfLines={1} style={[s.listingTitle,{color:colors.ink}]}>{item.title}</Text><Text style={[s.price,{color:colors.gold}]}>{money(item.price)}</Text><Pressable accessibilityRole="button" accessibilityLabel={isFavorite?'إزالة من المفضلة':'إضافة إلى المفضلة'} accessibilityState={{selected:isFavorite}} hitSlop={10} onPress={event=>{event.stopPropagation();onFavorite(item.id)}} style={[s.favorite,{backgroundColor:colors.glassStrong}]}><Ionicons name={isFavorite?'heart':'heart-outline'} size={19} color={isFavorite?colors.danger:colors.muted}/></Pressable></View></Pressable>}} ListEmptyComponent={<View style={[s.empty,{borderColor:colors.line,backgroundColor:colors.glass}]}><Text style={[s.emptyText,{color:colors.muted}]}>لا توجد إعلانات حالياً</Text></View>}/>

    <View style={s.sectionHeader}><Text style={[s.sectionTitle,{color:colors.ink}]}>أحدث الريلز</Text><Pressable accessibilityRole="button" onPress={()=>onNavigate('ai')} accessibilityLabel="فتح الريلز" accessibilityHint="يفتح أحدث الريلز" style={[s.sectionAction,{borderColor:colors.line}]}><Text style={[s.sectionActionText,{color:colors.gold}]}>مشاهدة</Text><Ionicons name="play-circle-outline" size={18} color={colors.gold}/></Pressable></View>
    <FlatList horizontal inverted data={reels} keyExtractor={x=>x.id} showsHorizontalScrollIndicator={false} initialNumToRender={lowData?1:3} maxToRenderPerBatch={lowData?1:3} contentContainerStyle={s.horizontal} renderItem={({item})=>{const thumbnail=firstNonEmpty(item.thumbnail_url);return <Pressable accessibilityRole="button" accessibilityLabel={item.caption||'ريل'} accessibilityHint="يفتح الريلز" onPress={()=>onNavigate('ai')} style={[s.reelCard,{backgroundColor:colors.glass,borderColor:colors.line}]}>{thumbnail&&!failedImageUrls.has(thumbnail)?<Image accessible={false} source={{uri:thumbnail}} style={s.reelImage} onError={()=>markImageFailed(thumbnail)}/>:<View style={[s.reelImage,s.placeholder,{backgroundColor:colors.forestSoft}]}><Ionicons name="play" size={30} color={colors.gold}/></View>}<Text numberOfLines={2} style={[s.reelCaption,{color:colors.ink}]}>{item.caption||'ريل جديد'}</Text></Pressable>}} ListEmptyComponent={<View style={[s.empty,{borderColor:colors.line,backgroundColor:colors.glass}]}><Text style={[s.emptyText,{color:colors.muted}]}>لا توجد ريلز حالياً</Text></View>}/>
  </ScrollView>;
}

const s=StyleSheet.create({
  root:{flex:1,backgroundColor:'transparent'},content:{paddingHorizontal:20,paddingTop:10,paddingBottom:30,gap:14},
  topBar:{minHeight:62,flexDirection:'row',alignItems:'center'},brandCell:{flex:1,alignItems:'flex-start'},centerCell:{flex:1,alignItems:'center'},profileCell:{flex:1,alignItems:'flex-end'},brand:{fontFamily:'System',fontSize:26,fontWeight:'900',letterSpacing:.4},brandSub:{fontFamily:'System',fontSize:9,fontWeight:'700',marginTop:-2},
  iconButton:{width:44,height:44,borderRadius:18,borderWidth:1,alignItems:'center',justifyContent:'center'},avatar:{width:44,height:44,borderRadius:18,borderWidth:1,alignItems:'center',justifyContent:'center',overflow:'hidden'},badge:{position:'absolute',right:-4,top:-4,minWidth:18,height:18,borderRadius:9,paddingHorizontal:4,alignItems:'center',justifyContent:'center'},badgeText:{fontFamily:'System',fontSize:9,fontWeight:'900',color:'#FFFFFF'},
  hero:{minHeight:124,borderRadius:24,borderWidth:1,padding:18,flexDirection:'row-reverse',alignItems:'center',gap:14},heroText:{flex:1},greeting:{fontFamily:'System',fontSize:12,textAlign:'right'},name:{fontFamily:'System',fontSize:24,fontWeight:'900',textAlign:'right',marginTop:2},heroNote:{fontFamily:'System',fontSize:11,textAlign:'right',lineHeight:18,marginTop:5},heroOrb:{width:56,height:56,borderRadius:20,borderWidth:1,alignItems:'center',justifyContent:'center'},
  quickGrid:{flexDirection:'row-reverse',flexWrap:'wrap',gap:10},quickCard:{width:'48.5%',minHeight:104,borderRadius:20,borderWidth:1,padding:14,justifyContent:'space-between'},quickIcon:{width:42,height:42,borderRadius:15,borderWidth:1,alignItems:'center',justifyContent:'center'},quickCopy:{alignItems:'flex-end'},quickLabel:{fontFamily:'System',fontSize:13,fontWeight:'900'},quickValue:{fontFamily:'System',fontSize:11,fontWeight:'700',marginTop:2},
  sectionHeader:{marginTop:6,minHeight:38,flexDirection:'row-reverse',alignItems:'center',justifyContent:'space-between'},sectionTitle:{fontFamily:'System',fontSize:17,fontWeight:'900',textAlign:'right'},sectionAction:{minHeight:32,borderRadius:12,borderWidth:1,paddingHorizontal:9,flexDirection:'row-reverse',alignItems:'center',gap:4},sectionActionText:{fontFamily:'System',fontSize:10,fontWeight:'800'},horizontal:{gap:12,paddingVertical:4},
  listingCard:{width:218,borderRadius:20,borderWidth:1,overflow:'hidden'},listingImage:{width:'100%',height:132},placeholder:{alignItems:'center',justifyContent:'center'},listingBody:{padding:12,minHeight:88},listingTitle:{fontFamily:'System',fontSize:13,fontWeight:'800',textAlign:'right',paddingLeft:28},price:{fontFamily:'System',fontSize:13,fontWeight:'900',textAlign:'right',marginTop:6},favorite:{position:'absolute',left:9,top:9,width:30,height:30,borderRadius:12,alignItems:'center',justifyContent:'center'},
  reelCard:{width:150,borderRadius:20,borderWidth:1,overflow:'hidden'},reelImage:{width:'100%',height:184},reelCaption:{fontFamily:'System',fontSize:11,fontWeight:'700',textAlign:'right',lineHeight:17,padding:12,minHeight:54},
  empty:{width:190,height:92,borderRadius:20,borderWidth:1,alignItems:'center',justifyContent:'center'},emptyText:{fontFamily:'System',fontSize:12},
});