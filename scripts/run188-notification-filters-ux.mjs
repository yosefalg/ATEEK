import fs from 'node:fs';

const file='src/cloud/OnlineApp.tsx';
let s=fs.readFileSync(file,'utf8');
const replace=(from,to,label)=>{if(!s.includes(from))throw new Error(`Run188 notifications anchor missing: ${label}`);s=s.replace(from,to)};

replace(
  "function NotificationsScreen({m,onChat}:{m:ReturnType<typeof useCloud>;onChat:(id:string|null)=>void}){const unread=m.notifications.filter(n=>!n.is_read).length;const markAll=()=>{if(!unread)return;void attempt(()=>m.mutate('read',{}));};return <ScrollView",
  "function NotificationsScreen({m,onChat}:{m:ReturnType<typeof useCloud>;onChat:(id:string|null)=>void}){const[filter,setFilter]=useState<'all'|'unread'>('all');const unread=m.notifications.filter(n=>!n.is_read).length;const visibleNotifications=filter==='unread'?m.notifications.filter(n=>!n.is_read):m.notifications;const markAll=()=>{if(!unread)return;void attempt(()=>m.mutate('read',{}));};return <ScrollView",
  'notification filter state',
);

replace(
  "</View>{m.notifications.length===0?<View style={s.notificationEmpty}",
  "</View><View accessibilityRole=\"tablist\" accessibilityLabel=\"تصفية الإشعارات\" style={s.notificationFilters}><Pressable accessibilityRole=\"tab\" accessibilityState={{selected:filter==='all'}} onPress={()=>setFilter('all')} style={[s.notificationFilter,filter==='all'&&s.notificationFilterActive]}><Text style={[s.notificationFilterText,filter==='all'&&s.notificationFilterTextActive]}>الكل {m.notifications.length}</Text></Pressable><Pressable accessibilityRole=\"tab\" accessibilityState={{selected:filter==='unread'}} onPress={()=>setFilter('unread')} style={[s.notificationFilter,filter==='unread'&&s.notificationFilterActive]}><Text style={[s.notificationFilterText,filter==='unread'&&s.notificationFilterTextActive]}>غير المقروء {unread}</Text></Pressable></View>{m.notifications.length===0?<View style={s.notificationEmpty}",
  'notification filter controls',
);

replace(
  "<Text style={s.note}>ستظهر هنا الرسائل والعروض وتحديثات حسابك.</Text></View>:m.notifications.map(n=>",
  "<Text style={s.note}>ستظهر هنا الرسائل والعروض وتحديثات حسابك.</Text></View>:visibleNotifications.length===0?<View style={s.notificationEmpty}><Text style={s.notificationEmptyTitle}>لا توجد إشعارات غير مقروءة</Text><Text style={s.note}>أنت مطّلع على كل جديد حاليًا.</Text></View>:visibleNotifications.map(n=>",
  'filtered notification list',
);

replace(
  "notificationEmptyTitle:{fontSize:17,fontWeight:'900',color:colors.ink,textAlign:'center'}});",
  "notificationEmptyTitle:{fontSize:17,fontWeight:'900',color:colors.ink,textAlign:'center'},notificationFilters:{flexDirection:'row-reverse',gap:8},notificationFilter:{minHeight:44,paddingHorizontal:14,borderRadius:14,borderWidth:1,borderColor:colors.line,backgroundColor:colors.glass,alignItems:'center',justifyContent:'center'},notificationFilterActive:{backgroundColor:colors.gold,borderColor:colors.gold},notificationFilterText:{fontSize:11,fontWeight:'900',color:colors.muted},notificationFilterTextActive:{color:colors.forest}});",
  'notification filter styles',
);

fs.writeFileSync(file,s);

for(const needle of [
  "const[filter,setFilter]=useState<'all'|'unread'>('all')",
  "const visibleNotifications=filter==='unread'?m.notifications.filter(n=>!n.is_read):m.notifications",
  'accessibilityRole="tablist" accessibilityLabel="تصفية الإشعارات"',
  'غير المقروء {unread}',
  'لا توجد إشعارات غير مقروءة',
  ':visibleNotifications.map(n=>',
  'notificationFilter:{minHeight:44,',
]) if(!s.includes(needle)) throw new Error(`Run188 notification contract missing: ${needle}`);

console.log('Run #188 notifications UX applied: accessible all/unread filtering with truthful counts and empty state.');
