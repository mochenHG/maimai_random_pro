import { emptyRaffle } from './raffle'
import { emptyChartHistory } from './chartHistory'
import { emptyCallboard } from './callboard'
const KEYS=['maimai-pro-tournament','maimai-pro-raffle-control','maimai-pro-chart-history','maimai-pro-director','maimai-pro-draw','maimai-pro-callboard']
export interface Snapshot {id:string;time:number;label:string;data:Record<string,unknown>}
let database:Promise<IDBDatabase>|undefined
let queue:Promise<unknown>=Promise.resolve()
function db(){return database??=new Promise((resolve,reject)=>{const request=indexedDB.open('maimai-pro-backups',1);request.onupgradeneeded=()=>request.result.createObjectStore('snapshots',{keyPath:'id'});request.onsuccess=()=>resolve(request.result);request.onerror=()=>{database=undefined;reject(request.error)}})}
export async function listSnapshots():Promise<Snapshot[]> {const database=await db();return new Promise((resolve,reject)=>{const request=database.transaction('snapshots').objectStore('snapshots').getAll();request.onsuccess=()=>resolve((request.result as Snapshot[]).sort((a,b)=>b.time-a.time));request.onerror=()=>reject(request.error)})}
export function checkpoint(label='自动快照') {
  const data:Record<string,unknown>={'maimai-pro-raffle-control':emptyRaffle(),'maimai-pro-chart-history':emptyChartHistory(),'maimai-pro-director':{scene:'standby',title:'赛事即将开始',endAt:null,hideScores:false},'maimai-pro-draw':[],'maimai-pro-callboard':emptyCallboard()};for(const key of KEYS){const raw=localStorage.getItem(key);if(raw)data[key]=JSON.parse(raw)}
  const task=queue.catch(()=>{}).then(()=>storeCheckpoint(label,data));queue=task;return task
}
async function storeCheckpoint(label:string,data:Record<string,unknown>){
  if(!Object.keys(data).length)return
  const list=await listSnapshots(); if(list[0] && JSON.stringify(list[0].data)===JSON.stringify(data))return
  const database=await db()
  await new Promise<void>((resolve,reject)=>{const tx=database.transaction('snapshots','readwrite'),store=tx.objectStore('snapshots');store.put({id:crypto.randomUUID(),time:Date.now(),label,data});list.slice(9).forEach(s=>store.delete(s.id));tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error)})
  window.dispatchEvent(new Event('pro-backups'))
}
export function startSnapshots(){let timer:ReturnType<typeof setTimeout>|undefined,first=0
  const flush=()=>{clearTimeout(timer);timer=undefined;first=0;void checkpoint().catch(()=>window.dispatchEvent(new CustomEvent('pro-sync-notice',{detail:'自动备份未保存，请导出手动备份。'})))}
  const write=(e:Event)=>{if(!KEYS.includes((e as CustomEvent<string>).detail))return;first||=Date.now();clearTimeout(timer);timer=setTimeout(flush,Math.min(1200,Math.max(0,6000-(Date.now()-first))))}
  const hidden=()=>{if(document.hidden&&timer)flush()}
  window.addEventListener('pro-data-write',write);window.addEventListener('pro-remote',write);window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',hidden)
  void checkpoint('打开控制台').catch(()=>{})
  return()=>{if(timer)flush();window.removeEventListener('pro-data-write',write);window.removeEventListener('pro-remote',write);window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',hidden)}
}
