import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { action } from './client';

export type QueuedResult = { id?: string; queued?: boolean };
type QueueItem={id:string;name:string;payload:Record<string,unknown>;createdAt:number};
const KEY='ateek.offline.queue.v1';
const QUEUEABLE=new Set(['favorite','message','offer','read']);
let flushing=false;

async function readQueue():Promise<QueueItem[]>{
  try{const raw=await AsyncStorage.getItem(KEY);const rows=raw?JSON.parse(raw):[];return Array.isArray(rows)?rows.filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string'):[];}catch{return[];}
}
async function writeQueue(rows:QueueItem[]){await AsyncStorage.setItem(KEY,JSON.stringify(rows.slice(-120)));}
async function online(){try{const s=await Network.getNetworkStateAsync();return s.isConnected!==false&&s.isInternetReachable!==false;}catch{return true;}}
function looksNetworkError(error:unknown){const m=String((error as any)?.message??error).toLowerCase();return /network|fetch|internet|timeout|socket|offline|connection/.test(m);}
export async function queueLength(){return (await readQueue()).length;}
export async function resilientAction(name:string,payload:Record<string,unknown>):Promise<QueuedResult>{
  if(!QUEUEABLE.has(name))return action(name,payload);
  if(await online()){
    try{return await action(name,payload);}catch(e){if(!looksNetworkError(e))throw e;}
  }
  const row:QueueItem={id:Date.now().toString(36)+Math.random().toString(36).slice(2),name,payload,createdAt:Date.now()};
  const rows=await readQueue();rows.push(row);await writeQueue(rows);return {id:'queued-'+row.id,queued:true};
}
export async function flushOfflineQueue(){
  if(flushing||!(await online()))return {sent:0,pending:await queueLength()};
  flushing=true;let sent=0;
  try{
    const rows=await readQueue();const pending:QueueItem[]=[];
    for(let i=0;i<rows.length;i++){
      const row=rows[i]!;
      try{await action(row.name,row.payload);sent++;}
      catch(e){pending.push(row,...rows.slice(i+1));if(looksNetworkError(e))break;}
    }
    await writeQueue(pending);return {sent,pending:pending.length};
  }finally{flushing=false;}
}
