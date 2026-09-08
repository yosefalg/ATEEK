import { useEffect,useMemo,useRef } from 'react';
import { Animated,StyleSheet,View } from 'react-native';
import { Gyroscope } from 'expo-sensors';
import { LinearGradient } from 'expo-linear-gradient';
import { useAteekTheme } from '../theme/ThemeProvider';

type ParticleState={x:number;y:number;size:number;opacity:number;drift:Animated.Value;duration:number};
const particleSeed=[
  [8,12,3,.26,8200],[24,19,2,.18,9800],[41,8,3,.22,10600],[68,14,2,.16,9200],
  [86,26,3,.20,11200],[15,48,2,.18,10100],[36,59,3,.20,8800],[61,44,2,.16,11800],
  [79,61,3,.22,9700],[11,79,2,.15,10900],[49,84,3,.19,9400],[88,76,2,.17,11600],
] as const;

export function DynamicBackground(){
  const{lowData,animationsEnabled}=useAteekTheme();
  const gx=useRef(new Animated.Value(0)).current,gy=useRef(new Animated.Value(0)).current;
  const r1=useRef(new Animated.Value(0)).current,r2=useRef(new Animated.Value(0)).current;
  const pulse1=useRef(new Animated.Value(.34)).current,pulse2=useRef(new Animated.Value(.24)).current;
  const particles=useRef<ParticleState[]>(particleSeed.map(([x,y,size,opacity,duration])=>({x,y,size,opacity,duration,drift:new Animated.Value(0)}))).current;

  useEffect(()=>{
    if(!animationsEnabled||lowData){
      r1.stopAnimation();r2.stopAnimation();pulse1.stopAnimation();pulse2.stopAnimation();
      r1.setValue(0);r2.setValue(0);pulse1.setValue(.28);pulse2.setValue(.18);
      particles.forEach(p=>{p.drift.stopAnimation();p.drift.setValue(0)});
      return;
    }
    const spin=(value:Animated.Value,duration:number,toValue:number)=>Animated.loop(Animated.timing(value,{toValue,duration,useNativeDriver:true}));
    const breathe=(value:Animated.Value,low:number,high:number,duration:number)=>Animated.loop(Animated.sequence([
      Animated.timing(value,{toValue:high,duration,useNativeDriver:true}),
      Animated.timing(value,{toValue:low,duration,useNativeDriver:true}),
    ]));
    const animations=[spin(r1,18000,1),spin(r2,24000,1),breathe(pulse1,.24,.40,5200),breathe(pulse2,.15,.30,6800),...particles.map(p=>Animated.loop(Animated.sequence([
      Animated.timing(p.drift,{toValue:1,duration:p.duration,useNativeDriver:true}),
      Animated.timing(p.drift,{toValue:0,duration:p.duration,useNativeDriver:true}),
    ])))];
    animations.forEach(a=>a.start());
    return()=>animations.forEach(a=>a.stop());
  },[animationsEnabled,lowData,particles,pulse1,pulse2,r1,r2]);

  useEffect(()=>{
    if(!animationsEnabled||lowData){gx.setValue(0);gy.setValue(0);return}
    Gyroscope.setUpdateInterval(100);
    const sub=Gyroscope.addListener(({x,y})=>{
      const nx=Math.max(-1,Math.min(1,y))*14;
      const ny=Math.max(-1,Math.min(1,x))*14;
      Animated.parallel([
        Animated.timing(gx,{toValue:nx,duration:140,useNativeDriver:true}),
        Animated.timing(gy,{toValue:ny,duration:140,useNativeDriver:true}),
      ]).start();
    });
    return()=>sub.remove();
  },[animationsEnabled,gx,gy,lowData]);

  const nearX=useMemo(()=>gx,[gx]),nearY=useMemo(()=>gy,[gy]);
  const farX=useMemo(()=>Animated.multiply(gx,.42),[gx]),farY=useMemo(()=>Animated.multiply(gy,.42),[gy]);
  const spin1=r1.interpolate({inputRange:[0,1],outputRange:['0deg','360deg']});
  const spin2=r2.interpolate({inputRange:[0,1],outputRange:['360deg','0deg']});

  return <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <LinearGradient colors={['#0A0E17','#111827','#1A1F30']} start={{x:.08,y:0}} end={{x:.92,y:1}} style={StyleSheet.absoluteFill}/>
    <Animated.View style={[s.ellipse,s.blue,{opacity:pulse1,transform:[{translateX:farX},{translateY:farY},{rotate:spin1}]}]}/>
    <Animated.View style={[s.ellipse,s.violet,{opacity:pulse2,transform:[{translateX:nearX},{translateY:nearY},{rotate:spin2}]}]}/>
    {!lowData&&animationsEnabled&&particles.map((p,index)=>{
      const translateY=p.drift.interpolate({inputRange:[0,1],outputRange:[0,index%2===0?-16:14]});
      const translateX=p.drift.interpolate({inputRange:[0,1],outputRange:[0,index%3===0?10:-7]});
      const opacity=p.drift.interpolate({inputRange:[0,.5,1],outputRange:[p.opacity*.55,p.opacity,p.opacity*.55]});
      return <Animated.View key={index} style={[s.particle,{left:`${p.x}%`,top:`${p.y}%`,width:p.size,height:p.size,opacity,transform:[{translateX},{translateY}]}]}/>;
    })}
    <LinearGradient colors={['rgba(10,14,23,0.02)','rgba(10,14,23,0.42)']} start={{x:.5,y:0}} end={{x:.5,y:1}} style={StyleSheet.absoluteFill}/>
  </View>;
}

const s=StyleSheet.create({
  ellipse:{position:'absolute',borderRadius:999,shadowColor:'#6C8DFF',shadowOpacity:.18,shadowRadius:18,elevation:1},
  blue:{width:390,height:220,left:-150,top:54,backgroundColor:'rgba(108,141,255,.34)'},
  violet:{width:330,height:190,right:-120,bottom:84,backgroundColor:'rgba(167,139,250,.27)'},
  particle:{position:'absolute',borderRadius:999,backgroundColor:'#D6E2FF',shadowColor:'#8FA8FF',shadowOpacity:.7,shadowRadius:5,elevation:1},
});
