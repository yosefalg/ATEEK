import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { LocaleCode, useLocale } from '../i18n/LocaleProvider';

export type ThemeMode='dark'|'light'|'system';
export type VisualTheme='amoled'|'titanium';
const amoled={forest:'#07090D',forestSoft:'#0D1218',gold:'#D6B36C',goldSoft:'#E6D2A1',cream:'#07090D',paper:'#10151C',ink:'#F7F9FC',muted:'#98A2B3',line:'rgba(214,179,108,0.20)',danger:'#FF7D8A',success:'#63E6BE',overlay:'rgba(3,5,9,0.90)',glass:'rgba(13,18,24,0.88)',glassStrong:'rgba(16,21,28,0.96)',cyan:'#63E6BE',surface:'#07090D'};
const titanium={forest:'#10141B',forestSoft:'#171D27',gold:'#D6B36C',goldSoft:'#E6D2A1',cream:'#0F131A',paper:'#171D27',ink:'#F7F9FC',muted:'#98A2B3',line:'rgba(214,221,232,0.16)',danger:'#FF7D8A',success:'#63E6BE',overlay:'rgba(5,7,12,0.88)',glass:'rgba(23,29,39,0.88)',glassStrong:'rgba(28,35,47,0.96)',cyan:'#63E6BE',surface:'#0F131A'};
const light={forest:'#1B2028',forestSoft:'#EEF2F6',gold:'#A87324',goldSoft:'#F1E3C7',cream:'#F7F8FA',paper:'#FFFFFF',ink:'#171B22',muted:'#667085',line:'rgba(42,48,60,0.12)',danger:'#C94D5A',success:'#1D8B70',overlay:'rgba(14,17,24,0.18)',glass:'#F1F4F7',glassStrong:'#FFFFFF',cyan:'#168F75',surface:'#F7F8FA'};
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
