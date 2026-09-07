import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { LocaleCode, useLocale } from '../i18n/LocaleProvider';

export type ThemeMode='dark'|'light'|'system';
export type VisualTheme='amoled'|'titanium';
const amoled={forest:'#0A0E17',forestSoft:'#101624',gold:'#D6B36C',goldSoft:'#E8D4A4',cream:'#0A0E17',paper:'#131824',ink:'#F1F5F9',muted:'#94A3B8',line:'#2A3A5C',danger:'#FF7D8A',success:'#63E6BE',overlay:'rgba(4,8,16,0.90)',glass:'rgba(19,24,36,0.90)',glassStrong:'rgba(19,24,36,0.96)',cyan:'#6C8DFF',accent:'#6C8DFF',accent2:'#A78BFA',surface:'#0A0E17'};
const titanium={forest:'#111724',forestSoft:'#192133',gold:'#D6B36C',goldSoft:'#E8D4A4',cream:'#101622',paper:'#192133',ink:'#F1F5F9',muted:'#94A3B8',line:'#32425F',danger:'#FF7D8A',success:'#63E6BE',overlay:'rgba(6,10,18,0.88)',glass:'rgba(25,33,51,0.88)',glassStrong:'rgba(25,33,51,0.96)',cyan:'#6C8DFF',accent:'#6C8DFF',accent2:'#A78BFA',surface:'#101622'};
const light={forest:'#1B2434',forestSoft:'#EEF3FA',gold:'#A87324',goldSoft:'#F1E3C7',cream:'#F7F9FC',paper:'#FFFFFF',ink:'#172033',muted:'#64748B',line:'#D6DEEA',danger:'#C94D5A',success:'#1D8B70',overlay:'rgba(14,20,32,0.18)',glass:'rgba(255,255,255,0.90)',glassStrong:'#FFFFFF',cyan:'#4F6EF7',accent:'#4F6EF7',accent2:'#8B5CF6',surface:'#F7F9FC'};
export type ThemeColors=typeof amoled;
type Ctx={mode:ThemeMode;resolved:'dark'|'light';visualTheme:VisualTheme;colors:ThemeColors;setMode:(m:ThemeMode)=>void;setVisualTheme:(v:VisualTheme)=>void;toggle:()=>void;lowData:boolean;setLowData:(v:boolean)=>void;animationsEnabled:boolean;setAnimationsEnabled:(v:boolean)=>void;locale:LocaleCode;setLocale:(v:LocaleCode)=>void;isRTL:boolean;dir:'rtl'|'ltr';t:(key:string)=>string};
const ThemeContext=createContext<Ctx>({mode:'dark',resolved:'dark',visualTheme:'amoled',colors:amoled,setMode:()=>{},setVisualTheme:()=>{},toggle:()=>{},lowData:false,setLowData:()=>{},animationsEnabled:true,setAnimationsEnabled:()=>{},locale:'ar',setLocale:()=>{},isRTL:true,dir:'rtl',t:k=>k});
const THEME_KEY='ateek.theme.mode',LOW_DATA_KEY='ateek.low.data',VISUAL_KEY='ateek.visual.theme',ANIM_KEY='ateek.animations.enabled';
const STARTUP_KEYS=[THEME_KEY,LOW_DATA_KEY,VISUAL_KEY,ANIM_KEY] as const;
export function ThemeProvider({children}:{children:PropsWithChildren['children']}){
  const system=useColorScheme();
  const localeCtx=useLocale();
  const[mode,setModeState]=useState<ThemeMode>('dark');
  const[visualTheme,setVisualThemeState]=useState<VisualTheme>('amoled');
  const[lowData,setLowDataState]=useState(false);
  const[animationsEnabled,setAnimationsEnabledState]=useState(true);
  useEffect(()=>{let active=true;void AsyncStorage.multiGet([...STARTUP_KEYS]).then(entries=>{if(!active)return;const values=new Map(entries);const m=values.get(THEME_KEY)??null;const l=values.get(LOW_DATA_KEY)??null;const v=values.get(VISUAL_KEY)??null;const a=values.get(ANIM_KEY)??null;if(m==='dark'||m==='light'||m==='system')setModeState(m);if(v==='amoled'||v==='titanium')setVisualThemeState(v);setLowDataState(l==='1');setAnimationsEnabledState(a!=='0')}).catch(()=>{});return()=>{active=false}},[]);
  const setMode=(m:ThemeMode)=>{setModeState(m);void AsyncStorage.setItem(THEME_KEY,m)};
  const setVisualTheme=(v:VisualTheme)=>{setVisualThemeState(v);setModeState('dark');void AsyncStorage.multiSet([[VISUAL_KEY,v],[THEME_KEY,'dark']])};
  const setLowData=(v:boolean)=>{setLowDataState(v);void AsyncStorage.setItem(LOW_DATA_KEY,v?'1':'0')};
  const setAnimationsEnabled=(v:boolean)=>{setAnimationsEnabledState(v);void AsyncStorage.setItem(ANIM_KEY,v?'1':'0')};
  const resolved=mode==='system'?(system==='light'?'light':'dark'):mode;
  const colors=resolved==='light'?light:(visualTheme==='titanium'?titanium:amoled);
  const value=useMemo<Ctx>(()=>({mode,resolved,visualTheme,colors,setMode,setVisualTheme,toggle:()=>setMode(resolved==='dark'?'light':'dark'),lowData,setLowData,animationsEnabled,setAnimationsEnabled,locale:localeCtx.locale,setLocale:(v)=>{void localeCtx.setLocale(v)},isRTL:localeCtx.isRTL,dir:localeCtx.direction,t:(key)=>localeCtx.t(key)}),[mode,resolved,visualTheme,colors,lowData,animationsEnabled,localeCtx]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
export const useAteekTheme=()=>useContext(ThemeContext);
