import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { LocaleCode, useLocale } from '../i18n/LocaleProvider';

export type ThemeMode='dark'|'light'|'system';
export type VisualTheme='amoled'|'titanium';
const amoled={forest:'#080B14',forestSoft:'#0D111C',gold:'#C9A86C',goldSoft:'#D7C39C',cream:'#080B14',paper:'#141824',ink:'#F0F4FF',muted:'#8A8FA8',line:'rgba(201,168,108,0.20)',danger:'#FF7B86',success:'#73F0CF',overlay:'rgba(4,6,12,0.88)',glass:'rgba(20,24,36,0.80)',glassStrong:'rgba(20,24,36,0.94)',cyan:'#73F0CF',surface:'#080B14'};
const titanium={forest:'#11151F',forestSoft:'#171C28',gold:'#C9A86C',goldSoft:'#D7C39C',cream:'#10141E',paper:'#1A1F2B',ink:'#F0F4FF',muted:'#8A8FA8',line:'rgba(201,208,220,0.17)',danger:'#FF7B86',success:'#73F0CF',overlay:'rgba(7,9,15,0.86)',glass:'rgba(26,31,43,0.82)',glassStrong:'rgba(31,37,51,0.94)',cyan:'#73F0CF',surface:'#10141E'};
const light={forest:'#1B2029',forestSoft:'#EEF1F5',gold:'#A87528',goldSoft:'#F2E5CD',cream:'#F7F8FA',paper:'#FFFFFF',ink:'#171B22',muted:'#687282',line:'rgba(42,48,60,0.13)',danger:'#C74B57',success:'#218B70',overlay:'rgba(14,17,24,0.18)',glass:'#F2F4F7',glassStrong:'#FFFFFF',cyan:'#168F75',surface:'#F7F8FA'};
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
