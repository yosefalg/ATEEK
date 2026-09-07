import AsyncStorage from '@react-native-async-storage/async-storage';
import { PropsWithChildren, useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Switch, Text, View } from 'react-native';
import { useAteekTheme } from '../theme/ThemeProvider';

const KEY='consents';
type Consents={essential:true;analytics:boolean;marketing:boolean;savedAt:string};
export function ConsentManager({children}:PropsWithChildren){
  const{colors}=useAteekTheme();
  const[ready,setReady]=useState(false),[visible,setVisible]=useState(false),[analytics,setAnalytics]=useState(false),[marketing,setMarketing]=useState(false);
  useEffect(()=>{void AsyncStorage.getItem(KEY).then(raw=>{if(!raw)setVisible(true)}).finally(()=>setReady(true))},[]);
  const save=async()=>{const value:Consents={essential:true,analytics,marketing,savedAt:new Date().toISOString()};await AsyncStorage.setItem(KEY,JSON.stringify(value));setVisible(false)};
  if(!ready)return <View style={[s.loading,{backgroundColor:colors.cream}]}><ActivityIndicator color={colors.gold}/></View>;
  return <>{children}<Modal visible={visible} transparent animationType="fade"><View style={s.backdrop}><View style={[s.card,{backgroundColor:colors.glassStrong,borderColor:colors.line}]}><Text style={[s.title,{color:colors.ink}]}>إدارة الموافقة</Text><Text style={[s.body,{color:colors.muted}]}>اختر ما تسمح به. الوظائف الأساسية مطلوبة لتسجيل الدخول وحفظ بيانات السوق.</Text><Row title="أساسية للتشغيل" note="مفعلة دائمًا" value onChange={()=>{}} disabled colors={colors}/><Row title="تحليلية" note="قياس الأعطال وتحسين الأداء" value={analytics} onChange={setAnalytics} colors={colors}/><Row title="تسويقية" note="إشعارات عروض وحملات مستقبلية" value={marketing} onChange={setMarketing} colors={colors}/><Pressable accessibilityRole="button" onPress={()=>void save()} style={[s.button,{backgroundColor:colors.gold}]}><Text style={[s.buttonText,{color:colors.forest}]}>حفظ الاختيارات</Text></Pressable></View></View></Modal></>;
}
function Row({title,note,value,onChange,disabled=false,colors}:{title:string;note:string;value:boolean;onChange:(v:boolean)=>void;disabled?:boolean;colors:any}){return <View style={[s.row,{borderColor:colors.line}]}><Switch value={value} disabled={disabled} onValueChange={onChange}/><View style={{flex:1}}><Text style={[s.rowTitle,{color:colors.ink}]}>{title}</Text><Text style={[s.note,{color:colors.muted}]}>{note}</Text></View></View>}
const s=StyleSheet.create({loading:{flex:1,alignItems:'center',justifyContent:'center'},backdrop:{flex:1,backgroundColor:'rgba(0,0,0,.72)',justifyContent:'flex-end'},card:{borderTopLeftRadius:28,borderTopRightRadius:28,borderWidth:1,padding:20,gap:12},title:{fontSize:23,fontWeight:'900',textAlign:'right'},body:{lineHeight:21,textAlign:'right'},row:{minHeight:64,borderTopWidth:1,flexDirection:'row',alignItems:'center',gap:12,paddingTop:10},rowTitle:{fontWeight:'900',textAlign:'right'},note:{fontSize:11,textAlign:'right',marginTop:3},button:{height:52,borderRadius:16,alignItems:'center',justifyContent:'center',marginTop:4},buttonText:{fontWeight:'900'}});
