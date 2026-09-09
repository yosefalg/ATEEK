import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { LocaleCode, useLocale } from '../i18n/LocaleProvider';

export type ThemeMode='dark'|'light'|'system';
export type VisualTheme='amoled'|'titanium';
const amoled={forest:'#171513',forestSoft:'#211E1A',gold:'#B99872',goldSoft:'#D8C4A7',cream:'#171513',paper:'#211F1C',ink:'#F2EEE8',muted:'#A9A19A',line:'#3B3732',danger:'#D98D8D',success:'#8FAF9B',overlay:'rgba(18,16,14,0.90)',glass:'rgba(33,31,28,0.88)',glassStrong:'rgba(33,31,28,0.96)',cyan:'#A8B6AE',accent:'#B79A7D',accent2:'#8F9B92',surface:'#181614'};
const titanium={forest:'#201D1A',forestSoft:'#2B2723',gold:'#B59673',goldSoft:'#D8C3A5',cream:'#211E1B',paper:'#2A2723',ink:'#F3EFE9',muted:'#AAA29A',line:'#47413B',danger:'#D98D8D',success:'#8FAF9B',overlay:'rgba(22,20,18,0.88)',glass:'rgba(42,39,35,0.86)',glassStrong:'rgba(42,39,35,0.96)',cyan:'#A8B6AE',accent:'#B79A7D',accent2:'#929D96',surface:'#211E1B'};
const light={forest:'#302B27',forestSoft:'#ECE7DE',gold:'#9A785C',goldSoft:'#E6D7C4',cream:'#F4F0E8',paper:'#FAF8F3',ink:'#2B2926',muted:'#77716A',line:'#DDD6CC',danger:'#B96868',success:'#688775',overlay:'rgba(48,43,39,0.14)',glass:'rgba(250,248,243,0.88)',glassStrong:'rgba(250,248,243,0.97)',cyan:'#8D9D94',accent:'#A17E63',accent2:'#829088',surface:'#F4F0E8'};
export type ThemeColors=typeof amoled;
type Ctx={mode:ThemeMode;resolved:'dark'|'light';visualTheme:VisualTheme;colors:ThemeColors;setMode:(m:ThemeMode)=>void;setVisualTheme:(v:VisualTheme)=>void;toggle:()=>void;lowData:boolean;setLowData:(v:boolean)=>void;animationsEnabled:boolean;setAnimationsEnabled:(v:boolean)=>void;locale:LocaleCode;setLocale:(v:LocaleCode)=>void;isRTL:boolean;dir:'rtl'|'ltr';t:(key:string)=>string};
const ThemeContext=createContext<Ctx>({mode:'dark',resolved:'dark',visualTheme:'amoled',colors:amoled,setMode:()=>{},setVisualTheme:()=>{},toggle:()=>{},lowData:false,setLowData:()=>{},animationsEnabled:true,setAnimationsEnabled:()=>{},locale:'ar',setLocale:()=>{},isRTL:true,dir:'rtl',t:k=>k});
const THEME_KEY='ateek.theme.mode',LOW_DATA_KEY='ateek.low.data',VISUAL_KEY='ateek.visual.theme',ANIM_KEY='ateek.animations.enabled';
const STARTUP_KEYS=[THEME_KEY,LOW_DATA_KEY,VISUAL_KEY,ANIM_KEY] as const;
let preferenceWrite:Promise<void>=Promise.resolve();
function persistPreference(task:()=>Promise<unknown>){
  preferenceWrite=preferenceWrite.catch(()=>{}).then(async()=>{await task();}).catch(()=>{});
}
export function ThemeProvider({children}:{children:PropsWithChildren['children']}){
  const system=useColorScheme();
  const localeCtx=useLocale();
  const[mode,setModeState]=useState<ThemeMode>('dark');
  const[visualTheme,setVisualThemeState]=useState<VisualTheme>('amoled');
  const[lowData,setLowDataState]=useState(false);
  const[animationsEnabled,setAnimationsEnabledState]=useState(true);
  useEffect(()=>{let active=true;void AsyncStorage.multiGet([...STARTUP_KEYS]).then(entries=>{if(!active)return;const values=new Map(entries);const m=values.get(THEME_KEY)??null;const l=values.get(LOW_DATA_KEY)??null;const v=values.get(VISUAL_KEY)??null;const a=values.get(ANIM_KEY)??null;if(m==='dark'||m==='light'||m==='system')setModeState(m);if(v==='amoled'||v==='titanium')setVisualThemeState(v);setLowDataState(l==='1');setAnimationsEnabledState(a!=='0')}).catch(()=>{});return()=>{active=false}},[]);
  const setMode=(m:ThemeMode)=>{setModeState(m);persistPreference(()=>AsyncStorage.setItem(THEME_KEY,m))};
  const setVisualTheme=(v:VisualTheme)=>{setVisualThemeState(v);setModeState('dark');persistPreference(()=>AsyncStorage.multiSet([[VISUAL_KEY,v],[THEME_KEY,'dark']]))};
  const setLowData=(v:boolean)=>{setLowDataState(v);persistPreference(()=>AsyncStorage.setItem(LOW_DATA_KEY,v?'1':'0'))};
  const setAnimationsEnabled=(v:boolean)=>{setAnimationsEnabledState(v);persistPreference(()=>AsyncStorage.setItem(ANIM_KEY,v?'1':'0'))};
  const resolved=mode==='system'?(system==='light'?'light':'dark'):mode;
  const colors=resolved==='light'?light:(visualTheme==='titanium'?titanium:amoled);
  const value=useMemo<Ctx>(()=>({mode,resolved,visualTheme,colors,setMode,setVisualTheme,toggle:()=>setMode(resolved==='dark'?'light':'dark'),lowData,setLowData,animationsEnabled,setAnimationsEnabled,locale:localeCtx.locale,setLocale:(v)=>{void localeCtx.setLocale(v)},isRTL:localeCtx.isRTL,dir:localeCtx.direction,t:(key)=>localeCtx.t(key)}),[mode,resolved,visualTheme,colors,lowData,animationsEnabled,localeCtx]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
export const useAteekTheme=()=>useContext(ThemeContext);
