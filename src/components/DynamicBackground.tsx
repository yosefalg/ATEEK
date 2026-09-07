import { useEffect,useMemo,useRef } from 'react';
import { Animated,StyleSheet,View } from 'react-native';
import { Gyroscope } from 'expo-sensors';
import { LinearGradient } from 'expo-linear-gradient';
import { useAteekTheme } from '../theme/ThemeProvider';

export function DynamicBackground(){
  const{lowData,animationsEnabled}=useAteekTheme();
  const gx=useRef(new Animated.Value(0)).current,gy=useRef(new Animated.Value(0)).current;
  const r1=useRef(new Animated.Value(0)).current,r2=useRef(new Animated.Value(0)).current,r3=useRef(new Animated.Value(0)).current;
  const p1=useRef(new Animated.Value(.38)).current,p2=useRef(new Animated.Value(.28)).current,p3=useRef(new Animated.Value(.24)).current;
  useEffect(()=>{
    if(!animationsEnabled||lowData){r1.stopAnimation();r2.stopAnimation();r3.stopAnimation();r1.setValue(0);r2.setValue(0);r3.setValue(0);return}
    const loop=(v:Animated.Value,duration:number)=>Animated.loop(Animated.timing(v,{toValue:1,duration,easing:t=>t,useNativeDriver:true}));
    const a=loop(r1,10000),b=loop(r2,7000),c=loop(r3,5000);a.start();b.start();c.start();
    const pulse=(v:Animated.Value,low:number,high:number,duration:number)=>Animated.loop(Animated.sequence([Animated.timing(v,{toValue:high,duration,useNativeDriver:true}),Animated.timing(v,{toValue:low,duration,useNativeDriver:true})]));
    const pa=pulse(p1,.25,.42,3600),pb=pulse(p2,.18,.34,2900),pc=pulse(p3,.16,.30,2400);pa.start();pb.start();pc.start();
    return()=>{a.stop();b.stop();c.stop();pa.stop();pb.stop();pc.stop()}
  },[animationsEnabled,lowData,p1,p2,p3,r1,r2,r3]);
  useEffect(()=>{
    if(!animationsEnabled||lowData){gx.setValue(0);gy.setValue(0);return}
    Gyroscope.setUpdateInterval(90);
    const sub=Gyroscope.addListener(({x,y})=>{const nx=Math.max(-1,Math.min(1,y))*12,ny=Math.max(-1,Math.min(1,x))*12;Animated.parallel([Animated.timing(gx,{toValue:nx,duration:110,useNativeDriver:true}),Animated.timing(gy,{toValue:ny,duration:110,useNativeDriver:true})]).start()});
    return()=>sub.remove()
  },[animationsEnabled,gx,gy,lowData]);
  const nearX=useMemo(()=>gx,[gx]),nearY=useMemo(()=>gy,[gy]);
  const midX=useMemo(()=>Animated.multiply(gx,.62),[gx]),midY=useMemo(()=>Animated.multiply(gy,.62),[gy]);
  const farX=useMemo(()=>Animated.multiply(gx,.34),[gx]),farY=useMemo(()=>Animated.multiply(gy,.34),[gy]);
  const spin1=r1.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']}),spin2=r2.interpolate({inputRange:[0,1],outputRange:['360deg','0deg']}),spin3=r3.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']});
  return <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <LinearGradient colors={['#080B14','#0F1421','#1A1F30']} start={{x:.1,y:0}} end={{x:.9,y:1}} style={StyleSheet.absoluteFill}/>
    <Animated.View style={[s.ellipse,s.far,{opacity:p1,transform:[{translateX:farX},{translateY:farY},{rotate:spin1}]}]}/>
    <Animated.View style={[s.ellipse,s.mid,{opacity:p2,transform:[{translateX:midX},{translateY:midY},{rotate:spin2}]}]}/>
    <Animated.View style={[s.ellipse,s.near,{opacity:p3,transform:[{translateX:nearX},{translateY:nearY},{rotate:spin3}]}]}/>
  </View>
}
const s=StyleSheet.create({ellipse:{position:'absolute',borderRadius:999,shadowColor:'#C9A86C',shadowOpacity:.16,shadowRadius:4,elevation:1},far:{width:330,height:180,left:-110,top:65,backgroundColor:'rgba(75,91,151,.34)'},mid:{width:280,height:160,right:-90,top:'34%',backgroundColor:'rgba(76,129,139,.28)'},near:{width:240,height:132,left:'28%',bottom:72,backgroundColor:'rgba(201,168,108,.22)'}});
