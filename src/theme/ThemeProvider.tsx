import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { LocaleCode, useLocale } from '../i18n/LocaleProvider';

export type ThemeMode='dark'|'light'|'system';
const dark={forest:'#090A0F',forestSoft:'#12151D',gold:'#E0B66C',goldSoft:'#D8C49A',cream:'#090A0F',paper:'#0F1219',ink:'#F6F8FB',muted:'#7E8798',line:'rgba(190,198,211,0.16)',danger:'#FF7B86',success:'#73F0CF',overlay:'rgba(5,6,10,0.88)',glass:'#10131A',glassStrong:'#151922',cyan:'#73F0CF',surface:'#090A0F'};
const light={forest:'#1B2029',forestSoft:'#EEF1F5',gold:'#A87528',goldSoft:'#F2E5CD',cream:'#F7F8FA',paper:'#FFFFFF',ink:'#171B22',muted:'#687282',line:'rgba(42,48,60,0.13)',danger:'#C74B57',success:'#218B70',overlay:'rgba(14,17,24,0.18)',glass:'#F2F4F7',glassStrong:'#FFFFFF',cyan:'#168F75',surface:'#F7F8FA'};
export type ThemeColors=typeof dark;
type Ctx={mode:ThemeMode;resolved:'dark'|'light';colors:ThemeColors;setMode:(m:ThemeMode)=>void;toggle:()=>void;lowData:boolean;setLowData:(v:boolean)=>void;locale:LocaleCode;setLocale:(v:LocaleCode)=>void;isRTL:boolean;dir:'rtl'|'ltr';t:(key:string)=>string};
const ThemeContext=createContext<Ctx>({mode:'dark',resolved:'dark',colors:dark,setMode:()=>{},toggle:()=>{},lowData:false,setLowData:()=>{},locale:'ar',setLocale:()=>{},isRTL:true,dir:'rtl',t:k=>k});
const THEME_KEY='ateek.theme.mode',LOW_DATA_KEY='ateek.low.data';
const STARTUP_KEYS=[THEME_KEY,LOW_DATA_KEY] as const;
export function ThemeProvider({children}:{children:PropsWithChildren['children']}){
  const system=useColorScheme();
  const localeCtx=useLocale();
  const[mode,setModeState]=useState<ThemeMode>('dark');
  const[lowData,setLowDataState]=useState(false);
  useEffect(()=>{let active=true;void AsyncStorage.multiGet([...STARTUP_KEYS]).then(entries=>{if(!active)return;const values=new Map(entries);const m=values.get(THEME_KEY)??null;const l=values.get(LOW_DATA_KEY)??null;if(m==='dark'||m==='light'||m==='system')setModeState(m);setLowDataState(l==='1')}).catch(()=>{});return()=>{active=false}},[]);
  const setMode=(m:ThemeMode)=>{setModeState(m);void AsyncStorage.setItem(THEME_KEY,m)};
  const setLowData=(v:boolean)=>{setLowDataState(v);void AsyncStorage.setItem(LOW_DATA_KEY,v?'1':'0')};
  const resolved=mode==='system'?(system==='light'?'light':'dark'):mode;
  const value=useMemo<Ctx>(()=>({mode,resolved,colors:resolved==='dark'?dark:light,setMode,toggle:()=>setMode(resolved==='dark'?'light':'dark'),lowData,setLowData,locale:localeCtx.locale,setLocale:(v)=>{void localeCtx.setLocale(v)},isRTL:localeCtx.isRTL,dir:localeCtx.direction,t:(key)=>localeCtx.t(key)}),[mode,resolved,lowData,localeCtx]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
export const useAteekTheme=()=>useContext(ThemeContext);
