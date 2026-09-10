import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { action } from './client';

export type QueuedResult = { id?: string; queued?: boolean };
type QueueItem={id:string;name:string;payload:Record<string,unknown>;createdAt:number};
const KEY='ateek.offline.queue.v1';
const QUEUEABLE=new Set(['favorite','message','offer','read']);
const MAX_QUEUE_ITEMS=120;
let flushing=false;
let queueMutation:Promise<void>=Promise.resolve();

function isRecord(value:unknown):value is Record<string,unknown>{return !!value&&typeof value==='object'&&!Array.isArray(value);}
function isQueueItem(value:unknown):value is QueueItem{
  if(!isRecord(value))return false;
  return typeof value.id==='string'&&value.id.length>0&&typeof value.name==='string'&&QUEUEABLE.has(value.name)&&isRecord(value.payload)&&typeof value.createdAt==='number'&&Number.isFinite(value.createdAt);
}
async function readQueue():Promise<QueueItem[]>{
  try{const raw=await AsyncStorage.getItem(KEY);const rows=raw?JSON.parse(raw):[];return Array.isArray(rows)?rows.filter(isQueueItem):[];}catch{return[];}
}
function compactQueueForStorage(rows:QueueItem[]){
  if(rows.length<=MAX_QUEUE_ITEMS)return rows;
  let removable=rows.length-MAX_QUEUE_ITEMS;
  return rows.filter(row=>{
    if(removable>0&&(row.name==='favorite'||row.name==='read')){removable--;return false;}
    return true;
  });
}
async function writeQueue(rows:QueueItem[]){await AsyncStorage.setItem(KEY,JSON.stringify(compactQueueForStorage(rows)));}
async function mutateQueue<T>(task:()=>Promise<T>):Promise<T>{
  const previous=queueMutation;
  let release!:()=>void;
  queueMutation=new Promise<void>(resolve=>{release=resolve;});
  await previous;
  try{return await task();}finally{release();}
}
async function online(){try{const s=await Network.getNetworkStateAsync();return s.isConnected!==false&&s.isInternetReachable!==false;}catch{return true;}}
function looksNetworkError(error:unknown){const m=String((error as any)?.message??error).toLowerCase();return /network|fetch|internet|timeout|socket|offline|connection/.test(m);}
function coalesceQueue(rows:QueueItem[],incoming:QueueItem){
  if(incoming.name==='read')return [...rows.filter(row=>row.name!=='read'),incoming];
  if(incoming.name==='favorite'){
    const listingId=String(incoming.payload.id??'');
    if(listingId)return [...rows.filter(row=>row.name!=='favorite'||String(row.payload.id??'')!==listingId),incoming];
  }
  return [...rows,incoming];
}
export async function queueLength(){return (await readQueue()).length;}
export async function resilientAction(name:string,payload:Record<string,unknown>):Promise<QueuedResult>{
  if(!QUEUEABLE.has(name))return action(name,payload);
  if(await online()){
    try{return await action(name,payload);}catch(e){if(!looksNetworkError(e))throw e;}
  }
  const row:QueueItem={id:Date.now().toString(36)+Math.random().toString(36).slice(2),name,payload,createdAt:Date.now()};
  await mutateQueue(async()=>{const rows=await readQueue();await writeQueue(coalesceQueue(rows,row));});
  return {id:'queued-'+row.id,queued:true};
}
export async function flushOfflineQueue(){
  if(flushing||!(await online()))return {sent:0,pending:await queueLength()};
  flushing=true;let sent=0;
  try{
    const rows=await readQueue();
    const sentIds=new Set<string>();
    let terminalError:unknown;
    for(let i=0;i<rows.length;i++){
      const row=rows[i]!;
      try{await action(row.name,row.payload);sent++;sentIds.add(row.id);}
      catch(e){
        if(looksNetworkError(e))break;
        terminalError=e;
        break;
      }
    }
    if(sentIds.size){
      await mutateQueue(async()=>{
        const current=await readQueue();
        await writeQueue(current.filter(row=>!sentIds.has(row.id)));
      });
    }
    if(terminalError)throw terminalError;
    return {sent,pending:await queueLength()};
  }finally{flushing=false;}
}
