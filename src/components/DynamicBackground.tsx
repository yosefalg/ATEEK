import { useEffect,useRef } from 'react';
import { Animated,StyleSheet,View } from 'react-native';
import { useAteekTheme } from '../theme/ThemeProvider';

export function DynamicBackground({touchX=0.5,touchY=0.5}:{touchX?:number;touchY?:number}){
  const {resolved}=useAteekTheme();
  const tx=useRef(new Animated.Value(0)).current,ty=useRef(new Animated.Value(0)).current,halo=useRef(new Animated.Value(.16)).current;
  useEffect(()=>{Animated.parallel([
    Animated.spring(tx,{toValue:(touchX-.5)*180,useNativeDriver:true,speed:22,bounciness:4}),
    Animated.spring(ty,{toValue:(touchY-.5)*300,useNativeDriver:true,speed:22,bounciness:4}),
    Animated.sequence([Animated.timing(halo,{toValue:.34,duration:120,useNativeDriver:true}),Animated.timing(halo,{toValue:.16,duration:520,useNativeDriver:true})])
  ]).start();},[touchX,touchY,tx,ty,halo]);
  const dark=resolved==='dark';
  return <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <View style={[s.base,{backgroundColor:dark?'#090A0F':'#F5F7FA'}]}/>
    <View style={[s.grid,{borderColor:dark?'rgba(255,255,255,.028)':'rgba(20,24,32,.045)'}]}/>
    <Animated.View style={[s.halo,{opacity:halo,backgroundColor:dark?'#70F3D0':'#2AC9A0',transform:[{translateX:tx},{translateY:ty}]}]}/>
    <View style={[s.titaniumTop,{backgroundColor:dark?'rgba(165,173,188,.08)':'rgba(70,78,92,.06)'}]}/>
    <View style={[s.titaniumBottom,{backgroundColor:dark?'rgba(222,180,108,.055)':'rgba(190,135,52,.06)'}]}/>
  </View>;
}
const s=StyleSheet.create({base:{...StyleSheet.absoluteFillObject},grid:{position:'absolute',left:0,right:0,top:0,bottom:0,borderWidth:1},halo:{position:'absolute',width:190,height:190,borderRadius:95,left:'50%',top:'38%',marginLeft:-95,marginTop:-95},titaniumTop:{position:'absolute',height:1,left:18,right:18,top:84},titaniumBottom:{position:'absolute',height:1,left:32,right:32,bottom:90},gridLine:{height:1}});
