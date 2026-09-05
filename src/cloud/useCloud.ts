import { useCallback,useEffect,useRef,useState } from 'react';
import { AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Session } from '@supabase/supabase-js';
import { action,supabase } from './client';
import { Listing } from '../types';
import { useAteekTheme } from '../theme/ThemeProvider';
export type Row=Record<string,any>;
type CloudData={listings:Listing[];profiles:Row[];threads:Row[];messages:Row[];offers:Row[];notifications:Row[];reviews:Row[];blocks:Row[];favorites:string[]};
const empty:CloudData={listings:[],profiles:[],threads:[],messages:[],offers:[],notifications:[],reviews:[],blocks:[],favorites:[]};
export function useCloud(session:Session){
 const {lowData}=useAteekTheme();
 const cacheKey='ateek.home.cache.'+session.user.id;
 const [data,setData]=useState<CloudData>(empty);
 const [error,setError]=useState(''),[loading,setLoading]=useState(true);const busy=useRef(false),alive=useRef(true);
 const refresh=useCallback(async()=>{if(busy.current)return;busy.current=true;try{const names=['profiles','listings','threads','messages','offers','notifications','reviews','blocks','favorites'];const results=await Promise.all(names.map(n=>{const q=supabase.from('ateek_'+n).select('*');return ['profiles','blocks','favorites'].includes(n)?q.limit(500):q.order('created_at',{ascending:false}).limit(lowData?120:300);}));const failure=results.find(r=>r.error);if(failure?.error)throw failure.error;const rows=Object.fromEntries(names.map((n,i)=>[n,results[i]?.data??[]])) as Record<string,Row[]>;const today=new Date().toISOString().slice(0,10);const listings=rows.listings!.map(x=>{const p=rows.profiles!.find(v=>v.id===x.seller_id);return {...x,id:x.id,title:x.title,description:x.description,category:x.category,price:Number(x.price),location:x.location,condition:x.condition,seller:p?.name??'بائع',sellerId:x.seller_id,owner:x.seller_id===session.user.id,verified:Boolean(p?.verified),image:supabase.storage.from('ateek-images').getPublicUrl(x.image).data.publicUrl,createdAt:Date.parse(x.created_at),age:new Date(x.created_at).toLocaleDateString('ar-IQ'),latitude:x.latitude==null?null:Number(x.latitude),longitude:x.longitude==null?null:Number(x.longitude),viewsToday:x.views_date===today?Number(x.views_today||0):0};}) as Listing[];if(alive.current){const next={listings,profiles:rows.profiles!,threads:rows.threads!,messages:rows.messages!.reverse(),offers:rows.offers!,notifications:rows.notifications!,reviews:rows.reviews!,blocks:rows.blocks!,favorites:rows.favorites!.map(x=>x.listing_id)};setData(next);setError('');const me=rows.profiles!.filter(p=>p.id===session.user.id);void AsyncStorage.setItem(cacheKey,JSON.stringify({listings,favorites:next.favorites,profiles:me,savedAt:Date.now()})).catch(()=>{});}}catch(e:any){if(alive.current)setError(e.message||'تعذّر الاتصال. أعد المحاولة.');}finally{busy.current=false;if(alive.current)setLoading(false);}},[session.user.id,lowData,cacheKey]);
 useEffect(()=>{alive.current=true;void AsyncStorage.getItem(cacheKey).then(raw=>{if(!alive.current||!raw)return;try{const c=JSON.parse(raw);if(Array.isArray(c.listings)&&Date.now()-Number(c.savedAt||0)<1000*60*60*24){setData(v=>({...v,listings:c.listings,profiles:Array.isArray(c.profiles)?c.profiles:[],favorites:Array.isArray(c.favorites)?c.favorites:[]}));setLoading(false)}}catch{}}).finally(()=>void refresh());const channel=supabase.channel('market-'+session.user.id);for(const table of ['messages','offers','notifications','listings'])channel.on('postgres_changes',{event:'*',schema:'public',table:'ateek_'+table},()=>void refresh());channel.subscribe();const timer=setInterval(()=>{if(AppState.currentState==='active')void refresh();},lowData?60000:15000);return()=>{alive.current=false;clearInterval(timer);void supabase.removeChannel(channel);};},[refresh,session.user.id,cacheKey,lowData]);
 const mutate=async(name:string,payload:Record<string,unknown>)=>{const result=await action(name,payload);await refresh();return result;};
 return {...data,error,loading,refresh,mutate,user:session.user};
}
export type Cloud=ReturnType<typeof useCloud>;
