import { useSyncExternalStore } from 'react'
import { applyRemote } from './storage'
import { checkpoint } from './snapshots'
import { receiveOperations } from './operations'
const KEYS=['maimai-pro-draw','maimai-pro-tournament','maimai-pro-raffle','maimai-pro-director','maimai-pro-raffle-control','maimai-pro-chart-history','maimai-pro-pools','maimai-pro-filters','maimai-pro-callboard']
let socket:WebSocket|null=null, listening=false,controller=false,ready=false,attempts=0
let timer:ReturnType<typeof setTimeout>|undefined
let status:'connecting'|'connected'|'offline'|'pairing'='connecting'
const listeners=new Set<()=>void>(),revision=new Map<string,number>(),inflight=new Set<string>(),pending=new Map<string,unknown>()
const undoRequests=new Map<string,{resolve:()=>void;reject:(error:Error)=>void;timer:ReturnType<typeof setTimeout>}>()
function failUndo(message:string){for(const request of undoRequests.values()){clearTimeout(request.timer);request.reject(Error(message))}undoRequests.clear()}
const notify=(text:string)=>window.dispatchEvent(new CustomEvent('pro-sync-notice',{detail:text}))
function update(value:typeof status){status=value;listeners.forEach(fn=>fn())}
export function useSyncStatus(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn)}},()=>status)}
export function undoOperation(id:string,version:number){
  if(!controller||!ready||status!=='connected'||socket?.readyState!==WebSocket.OPEN)return Promise.reject(Error('请连接赛事主机后再撤销。'))
  if(inflight.size||pending.size)return Promise.reject(Error('当前修改正在同步，请稍后再撤销。'))
  if(undoRequests.size)return Promise.reject(Error('正在处理撤销，请稍候。'))
  return new Promise<void>((resolve,reject)=>{const requestId=crypto.randomUUID(),timer=setTimeout(()=>{undoRequests.delete(requestId);reject(Error('未收到主机确认，请核对操作日志后再试。'))},10000);undoRequests.set(requestId,{resolve,reject,timer});socket!.send(JSON.stringify({type:'undo',id,revision:version,requestId}))})
}
function send(key:string){if(!ready||!controller||socket?.readyState!==WebSocket.OPEN||inflight.has(key)||!pending.has(key))return;const data=pending.get(key);pending.delete(key);inflight.add(key);socket.send(JSON.stringify({type:'state',key,data,revision:revision.get(key)??0}))}
function identify(){ready=false;inflight.clear();socket?.send(JSON.stringify({type:'hello',role:controller?'controller':'viewer',protocol:2}))}
export function enableSync(isController:boolean){
  const changed=controller!==isController;controller=isController
  if(!listening){listening=true;window.addEventListener('pro-data-write',e=>{const key=(e as CustomEvent<string>).detail;if(controller&&KEYS.includes(key)&&key!=='maimai-pro-raffle'){pending.set(key,JSON.parse(localStorage.getItem(key)??'null'));send(key)}});window.addEventListener('online',()=>enableSync(controller))}
  if(socket&&socket.readyState<WebSocket.CLOSING){if(changed&&socket.readyState===WebSocket.OPEN)identify();return}
  clearTimeout(timer);update('connecting');ready=false
  socket=new WebSocket(`${location.protocol==='https:'?'wss:':'ws:'}//${location.host}/pro-sync`)
  socket.onopen=()=>{attempts=0;identify()}
  socket.onmessage=e=>{try{
    const m=JSON.parse(e.data)
    if(m.type==='denied'){ready=false;pending.clear();inflight.clear();receiveOperations([]);failUndo('配对已失效，请重新连接。');update('pairing');return}
    if(m.type==='journal'){if(controller&&Array.isArray(m.items))receiveOperations(m.items);return}
    if(m.type==='undo-result'){const request=undoRequests.get(m.requestId);if(request){clearTimeout(request.timer);undoRequests.delete(m.requestId);if(m.ok)request.resolve();else request.reject(Error(m.error??'撤销失败。'))}return}
    if(m.type==='ready'){
      ready=true;update('connected')
      if(controller){for(const key of m.missing??[]){if(key==='maimai-pro-raffle')continue;const raw=localStorage.getItem(key);if(raw)pending.set(key,JSON.parse(raw))}pending.forEach((_,key)=>send(key))}return
    }
    if(m.type==='ack'){revision.set(m.key,m.revision);inflight.delete(m.key);send(m.key);return}
    if(m.type==='reject'||m.type==='error'){inflight.delete(m.key);pending.delete(m.key);notify(m.error??'同步未确认');void checkpoint('同步未确认的本地副本').catch(()=>{});identify();return}
    if((m.type==='state'||m.type==='conflict')&&KEYS.includes(m.key)){
      revision.set(m.key,m.revision??0)
      if(m.type==='conflict'||pending.has(m.key)||inflight.has(m.key)){pending.delete(m.key);inflight.delete(m.key);notify('另一台设备已更新此数据，已载入主机版本；请核对后重新操作。')}
      if(m.data!==null){if(controller&&localStorage.getItem(m.key)!==JSON.stringify(m.data))void checkpoint('接收主机更新前').catch(()=>{});applyRemote(m.key,m.data)}
    }
  }catch{notify('同步内容读取失败，请重新连接。')}}
  const currentSocket=socket
  socket.onclose=()=>{if(socket!==currentSocket)return;socket=null;ready=false;inflight.clear();failUndo('连接已断开，请核对日志中的主机结果。');update('offline');timer=setTimeout(()=>enableSync(controller),Math.min(15000,1000*2**Math.min(attempts++,4)))}
  socket.onerror=()=>update('offline')
}
export function reconnectSync(){socket?.close();socket=null;enableSync(controller)}
