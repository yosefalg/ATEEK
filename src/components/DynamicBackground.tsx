import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';

export function DynamicBackground(){
  const a=useRef(new Animated.Value(0)).current;
  useEffect(()=>{const loop=Animated.loop(Animated.sequence([
    Animated.timing(a,{toValue:1,duration:9000,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
    Animated.timing(a,{toValue:0,duration:9000,easing:Easing.inOut(Easing.sin),useNativeDriver:true})
  ]));loop.start();return()=>loop.stop();},[a]);
  const drift=a.interpolate({inputRange:[0,1],outputRange:[-28,38]});
  const drift2=a.interpolate({inputRange:[0,1],outputRange:[34,-24]});
  return <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <View style={s.base}/><Animated.View style={[s.orb,s.one,{transform:[{translateX:drift},{translateY:drift2}]}]}/><Animated.View style={[s.orb,s.two,{transform:[{translateX:drift2},{translateY:drift}]}]}/><View style={s.grid}/>
  </View>;
}
const s=StyleSheet.create({base:{...StyleSheet.absoluteFillObject,backgroundColor:'#07110E'},orb:{position:'absolute',borderRadius:999,opacity:.16},one:{width:280,height:280,backgroundColor:'#35D39A',top:-70,right:-90},two:{width:240,height:240,backgroundColor:'#E7A93D',bottom:90,left:-110},grid:{...StyleSheet.absoluteFillObject,backgroundColor:'rgba(255,255,255,.008)'}});
