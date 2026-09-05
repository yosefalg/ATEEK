import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, PropsWithChildren, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';

export type ThemeMode='dark'|'light'|'system';
const dark={forest:'#07130F',forestSoft:'#102B23',gold:'#F1B84B',goldSoft:'#F8E3B2',cream:'#07110E',paper:'rgba(17,38,31,0.94)',ink:'#F5F8F6',muted:'#9AA9A2',line:'rgba(255,255,255,0.10)',danger:'#FF6B6B',success:'#55D69E',overlay:'rgba(3,10,8,0.78)',glass:'rgba(20,48,39,0.72)',glassStrong:'rgba(11,31,25,0.92)',cyan:'#69E6C1',surface:'#0C1A15'};
const light={forest:'#0D2D25',forestSoft:'#DCF7EC',gold:'#D89A21',goldSoft:'#FFF1C9',cream:'#F5F8F5',paper:'rgba(255,255,255,0.94)',ink:'#10231D',muted:'#66766F',line:'rgba(13,45,37,0.12)',danger:'#C94848',success:'#26845D',overlay:'rgba(13,45,37,0.18)',glass:'rgba(255,255,255,0.72)',glassStrong:'rgba(255,255,255,0.94)',cyan:'#1E9F7B',surface:'#FFFFFF'};
export type ThemeColors=typeof dark;
type Ctx={mode:ThemeMode;resolved:'dark'|'light';colors:ThemeColors;setMode:(m:ThemeMode)=>void;toggle:()=>void};
const ThemeContext=createContext<Ctx>({mode:'dark',resolved:'dark',colors:dark,setMode:()=>{},toggle:()=>{}});
const KEY='ateek.theme.mode';
export function ThemeProvider({children}:{children:PropsWithChildren['children']}){const system=useColorScheme();const[mode,setModeState]=useState<ThemeMode>('dark');useEffect(()=>{AsyncStorage.getItem(KEY).then(v=>{if(v==='dark'||v==='light'||v==='system')setModeState(v)}).catch(()=>{})},[]);const setMode=(m:ThemeMode)=>{setModeState(m);void AsyncStorage.setItem(KEY,m)};const resolved=mode==='system'?(system==='light'?'light':'dark'):mode;const value=useMemo<Ctx>(()=>({mode,resolved,colors:resolved==='dark'?dark:light,setMode,toggle:()=>setMode(resolved==='dark'?'light':'dark')}),[mode,resolved]);return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>}
export const useAteekTheme=()=>useContext(ThemeContext);
