import fs from 'node:fs';

const file='src/screens/HomeScreen.tsx';
let s=fs.readFileSync(file,'utf8');
const replace=(from,to,label)=>{if(!s.includes(from))throw new Error(`Run182 home anchor missing: ${label}`);s=s.replace(from,to)};

replace(
  `<View style={s.centerCell}><Pressable accessibilityRole="button" accessibilityLabel={notificationCount>0?\`الإشعارات، ${'${notificationCount}'} غير مقروءة\`:'الإشعارات'} accessibilityHint="يفتح مركز الإشعارات" onPress={()=>onNavigate('notifications')} style={[s.iconButton,{borderColor:colors.line,backgroundColor:colors.glass}]}><Ionicons name="notifications-outline" size={23} color={colors.ink}/>{notificationCount>0&&<View style={[s.badge,{backgroundColor:colors.danger}]}><Text style={s.badgeText}>{Math.min(notificationCount,99)}</Text></View>}</Pressable></View>`,
  `<View style={s.centerCell}><Pressable accessibilityRole="button" accessibilityLabel={notificationCount>0?\`الإشعارات، ${'${notificationCount}'} غير مقروءة\`:'الإشعارات'} accessibilityHint="يفتح مركز الإشعارات" onPress={()=>onNavigate('notifications')} style={[s.iconButton,{borderColor:colors.line,backgroundColor:colors.glass}]}><Ionicons name="notifications-outline" size={23} color={colors.ink}/>{notificationCount>0&&<View accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={[s.badge,{backgroundColor:colors.danger}]}><Text style={s.badgeText}>{Math.min(notificationCount,99)}</Text></View>}</Pressable></View>`,
  'notification badge semantics',
);

replace(
  `sectionAction:{minHeight:32,borderRadius:12,borderWidth:1,paddingHorizontal:9,flexDirection:'row-reverse',alignItems:'center',gap:4}`,
  `sectionAction:{minHeight:44,borderRadius:14,borderWidth:1,paddingHorizontal:12,flexDirection:'row-reverse',alignItems:'center',gap:6,justifyContent:'center'}`,
  'section action target',
);

replace(
  `favorite:{position:'absolute',left:9,top:9,width:30,height:30,borderRadius:12,alignItems:'center',justifyContent:'center'}`,
  `favorite:{position:'absolute',left:8,top:8,width:44,height:44,borderRadius:16,alignItems:'center',justifyContent:'center'}`,
  'favorite target',
);

fs.writeFileSync(file,s);
for(const needle of [
  'accessibilityElementsHidden importantForAccessibility="no-hide-descendants"',
  'sectionAction:{minHeight:44',
  'favorite:{position:\'absolute\',left:8,top:8,width:44,height:44',
]) if(!s.includes(needle)) throw new Error(`Run182 home contract missing: ${needle}`);

console.log('Run #182 home accessibility polish applied: decorative badge is hidden from duplicate announcements and key actions meet 44dp targets.');
