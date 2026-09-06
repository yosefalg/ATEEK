import { useEffect, useMemo, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Gyroscope } from 'expo-sensors';
import { LinearGradient } from 'expo-linear-gradient';
import { useAteekTheme } from '../theme/ThemeProvider';

const PARTICLES = Array.from({ length: 10 }, (_, i) => ({
  left: `${8 + ((i * 17) % 84)}%`,
  top: `${10 + ((i * 23) % 78)}%`,
  size: 3 + (i % 3),
  opacity: 0.22 + (i % 4) * 0.08,
}));

export function DynamicBackground({ touchX = 0.5, touchY = 0.5 }: { touchX?: number; touchY?: number }) {
  const { resolved, lowData } = useAteekTheme();
  const gx = useRef(new Animated.Value(0)).current;
  const gy = useRef(new Animated.Value(0)).current;
  const touchTx = useRef(new Animated.Value(0)).current;
  const touchTy = useRef(new Animated.Value(0)).current;
  const halo = useRef(new Animated.Value(.16)).current;
  const dark = resolved === 'dark';

  useEffect(() => {
    Animated.parallel([
      Animated.spring(touchTx, { toValue: (touchX - .5) * 72, useNativeDriver: true, speed: 20, bounciness: 4 }),
      Animated.spring(touchTy, { toValue: (touchY - .5) * 110, useNativeDriver: true, speed: 20, bounciness: 4 }),
      Animated.sequence([
        Animated.timing(halo, { toValue: .30, duration: 120, useNativeDriver: true }),
        Animated.timing(halo, { toValue: .16, duration: 520, useNativeDriver: true }),
      ]),
    ]).start();
  }, [halo, touchTx, touchTy, touchX, touchY]);

  useEffect(() => {
    if (lowData) {
      gx.setValue(0); gy.setValue(0);
      return;
    }
    Gyroscope.setUpdateInterval(80);
    const sub = Gyroscope.addListener(({ x, y }) => {
      Animated.parallel([
        Animated.timing(gx, { toValue: Math.max(-1, Math.min(1, y)) * 18, duration: 90, useNativeDriver: true }),
        Animated.timing(gy, { toValue: Math.max(-1, Math.min(1, x)) * 18, duration: 90, useNativeDriver: true }),
      ]).start();
    });
    return () => sub.remove();
  }, [gx, gy, lowData]);

  const nearX = useMemo(() => Animated.add(touchTx, gx), [gx, touchTx]);
  const nearY = useMemo(() => Animated.add(touchTy, gy), [gy, touchTy]);
  const midX = useMemo(() => Animated.multiply(nearX, .55), [nearX]);
  const midY = useMemo(() => Animated.multiply(nearY, .55), [nearY]);
  const farX = useMemo(() => Animated.multiply(nearX, .22), [nearX]);
  const farY = useMemo(() => Animated.multiply(nearY, .22), [nearY]);

  return <View pointerEvents="none" style={StyleSheet.absoluteFill} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
    <LinearGradient colors={dark ? ['#090A0F', '#121522', '#1A1D2E'] : ['#F7F8FB', '#EEF1F6', '#E6EAF2']} style={StyleSheet.absoluteFill} />
    <Animated.View style={[s.depthFar, { transform: [{ translateX: farX }, { translateY: farY }] }]} />
    <Animated.View style={[s.depthMid, { transform: [{ translateX: midX }, { translateY: midY }] }]} />
    <Animated.View style={[s.depthNear, { opacity: halo, transform: [{ translateX: nearX }, { translateY: nearY }] }]} />
    {PARTICLES.map((p, i) => <Animated.View key={i} style={[s.particle, { left: p.left as any, top: p.top as any, width: p.size, height: p.size, borderRadius: p.size, opacity: p.opacity, transform: [{ translateX: i % 2 ? midX : farX }, { translateY: i % 2 ? midY : farY }] }]} />)}
    <View style={[s.grid,{borderColor:dark?'rgba(255,255,255,.028)':'rgba(20,24,32,.045)'}]}/>
  </View>;
}

const s = StyleSheet.create({
  grid:{...StyleSheet.absoluteFillObject,borderWidth:1},
  depthFar:{position:'absolute',width:280,height:280,borderRadius:140,backgroundColor:'rgba(97,105,168,.11)',left:-90,top:40},
  depthMid:{position:'absolute',width:220,height:220,borderRadius:110,backgroundColor:'rgba(87,237,192,.10)',right:-70,top:'34%'},
  depthNear:{position:'absolute',width:190,height:190,borderRadius:95,backgroundColor:'#70F3D0',left:'50%',top:'38%',marginLeft:-95,marginTop:-95},
  particle:{position:'absolute',backgroundColor:'rgba(255,255,255,.9)',shadowColor:'#fff',shadowOpacity:.28,shadowRadius:4,elevation:2},
});
