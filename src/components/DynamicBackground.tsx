import { useEffect,useRef } from 'react';
import { Animated,Easing,StyleSheet,View } from 'react-native';
import { useAteekTheme } from '../theme/ThemeProvider';

export function DynamicBackground({touchX=0.5,touchY=0.5}:{touchX?:number;touchY?:number}){
  const {resolved}=useAteekTheme();
  const a=useRef(new Animated.Value(0)).current;
  const tx=useRef(new Animated.Value(0)).current,ty=useRef(new Animated.Value(0)).current;
  useEffect(()=>{const loop=Animated.loop(Animated.sequence([
    Animated.timing(a,{toValue:1,duration:8500,easing:Easing.inOut(Easing.sin),useNativeDriver:true}),
    Animated.timing(a,{toValue:0,duration:8500,easing:Easing.inOut(Easing.sin),useNativeDriver:true})
  ]));loop.start();return()=>loop.stop();},[a]);
  useEffect(()=>{Animated.parallel([
    Animated.spring(tx,{toValue:(touchX-.5)*34,useNativeDriver:true,speed:18,bounciness:5}),
    Animated.spring(ty,{toValue:(touchY-.5)*34,useNativeDriver:true,speed:18,bounciness:5})
  ]).start();},[touchX,touchY,tx,ty]);
  const drift=a.interpolate({inputRange:[0,1],outputRange:[-24,32]});
  const drift2=a.interpolate({inputRange:[0,1],outputRange:[28,-20]});
  const dark=resolved==='dark';
  return <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <View style={[s.base,{backgroundColor:dark?'#050E0B':'#F4FBF7'}]}/>
    <Animated.View style={[s.orb,s.one,{backgroundColor:dark?'#36E6A9':'#7AE4BF',transform:[{translateX:Animated.add(drift,tx)},{translateY:Animated.add(drift2,ty)}]}]}/>
    <Animated.View style={[s.orb,s.two,{backgroundColor:dark?'#FFC257':'#FFD78B',transform:[{translateX:Animated.add(drift2,tx)},{translateY:Animated.add(drift,ty)}]}]}/>
    <View style={[s.vignette,{backgroundColor:dark?'rgba(0,0,0,.08)':'rgba(255,255,255,.12)'}]}/>
  </View>;
}
const s=StyleSheet.create({base:{...StyleSheet.absoluteFillObject},orb:{position:'absolute',borderRadius:999,opacity:.18},one:{width:320,height:320,top:-90,right:-110},two:{width:280,height:280,bottom:70,left:-130},vignette:{...StyleSheet.absoluteFillObject}});
