import { WebSocketServer, WebSocket } from 'ws'
import { existsSync, readFileSync, mkdirSync, writeFileSync, renameSync } from 'node:fs'
import path from 'node:path'
import { appendOperation, publicJournal, undoEntry } from './journal.mjs'
import { randomUUID } from 'node:crypto'
export const PUBLIC_KEYS=['maimai-pro-draw','maimai-pro-tournament','maimai-pro-raffle','maimai-pro-director','maimai-pro-callboard']
export const CONTROL_KEYS=[...PUBLIC_KEYS,'maimai-pro-raffle-control','maimai-pro-chart-history','maimai-pro-pools','maimai-pro-filters']
function raffleView(s) {
  if(!s||!Array.isArray(s.pool)||!Array.isArray(s.history)||!Array.isArray(s.pending))throw new Error('抽奖数据格式无效')
  const key=s=>s.trim().normalize('NFKC').toLocaleLowerCase(), winners=s.preventRepeat?s.history.flatMap(r=>r.winners):[]
  const ids=new Set(winners.map(p=>p.id)),names=new Set(winners.map(p=>key(p.name)))
  return {title:s.title,poolCount:s.pool.length,eligibleCount:s.pool.filter(p=>!ids.has(p.id)&&!names.has(key(p.name))).length,count:s.count,phase:s.phase,round:s.phase==='revealed'?s.history[0]??null:null,rounds:s.history.length}
}
export function attachSync(server,options={}) {
  const wss=new WebSocketServer({server,path:'/pro-sync',maxPayload:6*1024*1024})
  let snapshot=new Map(),journal=[]
  if(options.stateFile&&existsSync(options.stateFile)){try{const saved=JSON.parse(readFileSync(options.stateFile,'utf8'));snapshot=new Map(Object.entries(saved).filter(([k])=>CONTROL_KEYS.includes(k)));journal=Array.isArray(saved.__operations)?saved.__operations.slice(0,50):[]}catch{throw new Error('同步存档损坏；请保留该文件并从备份恢复，不能覆盖。')}}
  // State and undo history use the same atomic replacement; a failed write changes neither.
  function persist(next,operations){if(!options.stateFile)return;mkdirSync(path.dirname(options.stateFile),{recursive:true});const temp=options.stateFile+'.tmp';writeFileSync(temp,JSON.stringify({...Object.fromEntries(next),__operations:operations}));renameSync(temp,options.stateFile)}
  const send=(s,message)=>{if(s.readyState===WebSocket.OPEN)s.send(JSON.stringify(message))}
  const visible=(s,key)=>(s.role==='controller'&&(!options.authorize||options.authorize(s.request)))||PUBLIC_KEYS.includes(key)
  const validController=s=>s.role==='controller'&&(!options.authorize||options.authorize(s.request))
  const sendJournal=s=>{if(validController(s))send(s,{type:'journal',items:publicJournal(journal,snapshot)})}
  function publish(socket,key,value,operations){
    const next=new Map(snapshot);next.set(key,value)
    const derived=key==='maimai-pro-raffle-control'?{data:raffleView(value.data),revision:(snapshot.get('maimai-pro-raffle')?.revision??0)+1}:null
    if(derived)next.set('maimai-pro-raffle',derived)
    persist(next,operations);snapshot=next;journal=operations
    for(const client of wss.clients){
      if((client!==socket||socket.undoing)&&visible(client,key)&&(client.role==='viewer'||client.protocolVersion===2))send(client,client.protocolVersion===2?{type:'state',key,...value}:{type:'state',key,data:value.data})
      if(derived&&client.role)send(client,{type:'state',key:'maimai-pro-raffle',...derived})
      sendJournal(client)
    }
  }
  wss.on('error',()=>{})
  wss.on('connection',(socket,request)=>{
    socket.request=request;socket.auditId=(options.actor?.(request)??'控制端')+' '+randomUUID().slice(0,4);socket.on('error',()=>{})
    socket.on('message',raw=>{try{
      const m=JSON.parse(raw.toString())
      if(m.type==='hello'&&['controller','viewer'].includes(m.role)){
        if(m.role==='controller'&&options.authorize&&!options.authorize(request)){socket.role=undefined;send(socket,{type:'denied'});return}
        if(m.role==='controller'&&options.requireRevision&&m.protocol!==2){send(socket,{type:'denied'});return}
        socket.role=m.role;socket.protocolVersion=m.protocol
        if(m.protocol===2||m.role==='viewer')for(const [key,value] of snapshot)if(visible(socket,key))send(socket,m.protocol===2?{type:'state',key,...value}:{type:'state',key,data:value.data})
        if(m.protocol===2){send(socket,{type:'ready',missing:CONTROL_KEYS.filter(k=>!snapshot.has(k))});sendJournal(socket)}
        else if(m.role==='viewer')for(const client of wss.clients)if(client.role==='controller')send(client,{type:'publish'})
        return
      }
      if(!validController(socket)){if(socket.role==='controller')send(socket,{type:'denied'});return}
      if(m.type==='undo'&&socket.protocolVersion===2){
        try{const entry=undoEntry(journal,snapshot,m.id,m.revision),value={data:entry.before,revision:entry.revision+1},operations=appendOperation(journal,entry.key,snapshot.get(entry.key).data,value,socket.auditId,entry);socket.undoing=true;publish(socket,entry.key,value,operations);send(socket,{type:'undo-result',requestId:m.requestId,ok:true})}catch(e){send(socket,{type:'undo-result',requestId:m.requestId,ok:false,error:e.message})}finally{socket.undoing=false}
        return
      }
      if(m.type!=='state'||!CONTROL_KEYS.includes(m.key))return
      if(socket.protocolVersion===2&&m.key==='maimai-pro-raffle')return
      const old=snapshot.get(m.key),revision=old?.revision??0
      if(socket.protocolVersion===2&&m.revision!==revision){send(socket,{type:'conflict',key:m.key,data:old?.data??null,revision});return}
      if(m.data===undefined||m.data===null){send(socket,{type:'reject',key:m.key,error:'空数据未保存'});return}
      if(socket.protocolVersion===2&&m.key==='maimai-pro-tournament'&&(!Array.isArray(m.data.stages)||!m.data.stages.length)){send(socket,{type:'reject',key:m.key,error:'赛事数据无效'});return}
      if(m.key==='maimai-pro-callboard'){
        const b=m.data,ids=new Set(),players=new Set();let current=0
        if(typeof b.eventId!=='string'||typeof b.stageId!=='string'||typeof b.notice!=='string'||b.notice.length>120||!Number.isInteger(b.batchSize)||b.batchSize<1||b.batchSize>4||!Array.isArray(b.items)||b.items.length>2000)throw Error('叫号数据无效')
        for(const i of b.items){if(typeof i.id!=='string'||ids.has(i.id)||!['waiting','current','done','skipped'].includes(i.status)||!Array.isArray(i.playerIds)||i.playerIds.length<1||i.playerIds.length>4)throw Error('叫号队列无效');ids.add(i.id);if(i.status==='current')current++;for(const id of i.playerIds){if(typeof id!=='string'||!id||players.has(id))throw Error('叫号选手重复');players.add(id)}}
        if(current>1)throw Error('叫号批次冲突')
      }
      if(old&&JSON.stringify(old.data)===JSON.stringify(m.data)){if(socket.protocolVersion===2)send(socket,{type:'ack',key:m.key,revision});return}
      const value={data:m.data,revision:revision+1},operations=appendOperation(journal,m.key,old?.data,value,socket.auditId)
      try{publish(socket,m.key,value,operations)}catch{send(socket,{type:'reject',key:m.key,error:'主机磁盘保存失败，操作未确认'});return}
      if(socket.protocolVersion===2)send(socket,{type:'ack',key:m.key,revision:value.revision})
    }catch{send(socket,{type:'error',error:'同步数据无效，操作未确认'})}})
  })
  return wss
}
