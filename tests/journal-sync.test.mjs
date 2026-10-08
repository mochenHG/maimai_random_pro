import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { mkdtemp, readFile, rm, mkdir } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { WebSocket } from 'ws'
import { attachSync } from '../sync.mjs'
import { createCallboard, advanceCallboard } from '../src/lib/callboard.ts'
import { emptyRaffle, manualPool, beginDraw, revealDraw } from '../src/lib/raffle.ts'
async function client(port,role,cookie='control=ok'){
  const ws=new WebSocket(`ws://127.0.0.1:${port}/pro-sync`,{headers:{cookie}}),messages=[]
  ws.on('message',raw=>messages.push(JSON.parse(raw)));await once(ws,'open');ws.send(JSON.stringify({type:'hello',role,protocol:2}))
  const wait=async predicate=>{const end=Date.now()+3000;while(Date.now()<end){const i=messages.findIndex(predicate);if(i>=0)return messages.splice(i,1)[0];await new Promise(resolve=>setTimeout(resolve,5))}throw Error('Expected sync message was not received')}
  return {ws,messages,wait,send:data=>ws.send(JSON.stringify(data))}
}
const authorize=req=>req.headers.cookie==='control=ok'
test('two controllers share logs and callboard; stale undo, duplicate undo and viewer writes are blocked; restart preserves undo',async t=>{
  const dir=await mkdtemp(path.join(tmpdir(),'maimai-journal-')),stateFile=path.join(dir,'session.json'),clients=[]
  let server=createServer(),sync=attachSync(server,{stateFile,requireRevision:true,authorize})
  const start=async()=>{server.listen(0,'127.0.0.1');await once(server,'listening')}
  const connect=async(role,cookie)=>{const c=await client(server.address().port,role,cookie);clients.push(c.ws);await c.wait(m=>m.type==='ready');return c}
  const close=async()=>{clients.splice(0).forEach(ws=>ws.terminate());await new Promise(resolve=>sync.close(resolve));await new Promise(resolve=>server.close(resolve))}
  t.after(async()=>{await close();await rm(dir,{recursive:true,force:true})});await start()
  const a=await connect('controller'),b=await connect('controller'),v=await connect('viewer'),key='maimai-pro-director'
  const denied=await client(server.address().port,'controller','');clients.push(denied.ws);await denied.wait(m=>m.type==='denied');assert.equal(denied.messages.some(m=>m.type==='journal'),false)
  const save=async(c,key,revision,data)=>{c.send({type:'state',key,revision,data});return c.wait(m=>m.type==='ack'&&m.key===key&&m.revision>=revision)}
  const base={scene:'standby',title:'赛事',endAt:null,hideScores:false};await save(a,key,0,base);await save(a,key,1,{...base,scene:'callboard'})
  const old=(await b.wait(m=>m.type==='journal'&&m.items[0]?.revision===2)).items[0];assert.equal(old.canUndo,true);assert.equal(old.before,undefined)
  await save(a,key,2,{...base,scene:'song'})
  b.send({type:'undo',id:old.id,revision:2,requestId:'stale'});assert.equal((await b.wait(m=>m.requestId==='stale')).ok,false)
  const current=(await b.wait(m=>m.type==='journal'&&m.items[0]?.revision===3)).items[0]
  b.send({type:'undo',id:current.id,revision:3,requestId:'undo'});assert.equal((await b.wait(m=>m.requestId==='undo')).ok,true)
  for(const c of [a,b,v])assert.equal((await c.wait(m=>m.type==='state'&&m.key===key&&m.revision===4)).data.scene,'callboard')
  b.send({type:'undo',id:current.id,revision:3,requestId:'duplicate'});assert.equal((await b.wait(m=>m.requestId==='duplicate')).ok,false)
  const before=JSON.parse(await readFile(stateFile,'utf8')).__operations.length;assert.equal((await save(a,key,4,{...base,scene:'callboard'})).revision,4);assert.equal(JSON.parse(await readFile(stateFile,'utf8')).__operations.length,before)
  const boardKey='maimai-pro-callboard',board=createCallboard('e','s',['a','b','c'],2,'候场')
  await save(a,boardKey,0,board);await save(a,boardKey,1,advanceCallboard(board));assert.equal((await v.wait(m=>m.key===boardKey&&m.revision===2)).data.items[0].status,'current')
  const boardEntry=(await b.wait(m=>m.type==='journal'&&m.items[0]?.key===boardKey&&m.items[0]?.revision===2)).items[0]
  b.send({type:'undo',id:boardEntry.id,revision:2,requestId:'board'});assert.equal((await b.wait(m=>m.requestId==='board')).ok,true);assert.equal((await v.wait(m=>m.key===boardKey&&m.revision===3)).data.items[0].status,'waiting')
  v.send({type:'state',key:boardKey,revision:3,data:advanceCallboard(board)});v.send({type:'undo',id:boardEntry.id,revision:2,requestId:'viewer'})
  await save(a,key,4,{...base,scene:'callboard',title:'新的待机标题'})
  const saved=JSON.parse(await readFile(stateFile,'utf8'));assert.equal(saved[boardKey].revision,3);assert.equal(v.messages.some(m=>m.type==='journal'),false)
  await close();server=createServer();sync=attachSync(server,{stateFile,requireRevision:true,authorize});await start()
  const restored=await connect('controller'),journal=await restored.wait(m=>m.type==='journal');assert.equal(journal.items[0].revision,5);assert.equal(journal.items[0].canUndo,true)
  restored.send({type:'undo',id:journal.items[0].id,revision:5,requestId:'after-restart'});assert.equal((await restored.wait(m=>m.requestId==='after-restart')).ok,true);assert.equal((await restored.wait(m=>m.key===key&&m.revision===6)).data.title,'赛事')
})
test('raffle journals never expose pending winner names and cannot undo a reveal',async t=>{
  const server=createServer(),sync=attachSync(server,{requireRevision:true,authorize}),clients=[];server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>{clients.forEach(ws=>ws.terminate());sync.close();server.close()})
  const a=await client(server.address().port,'controller'),v=await client(server.address().port,'viewer');clients.push(a.ws,v.ws);await a.wait(m=>m.type==='ready');await v.wait(m=>m.type==='ready')
  const key='maimai-pro-raffle-control',idle={...emptyRaffle(),pool:manualPool('隐秘甲\n隐秘乙')},draw=beginDraw(idle,()=>0),revealed=revealDraw(draw)
  for(const [revision,data] of [idle,draw,revealed].entries()){a.send({type:'state',key,revision,data});await a.wait(m=>m.type==='ack'&&m.key===key&&m.revision===revision+1)}
  const journal=await a.wait(m=>m.type==='journal'&&m.items[0]?.revision===3);assert.equal(journal.items[0].canUndo,false);assert.ok(!JSON.stringify(journal).includes('隐秘'))
  const pending=await v.wait(m=>m.key==='maimai-pro-raffle'&&m.data.phase==='drawing');assert.ok(!JSON.stringify(pending).includes('隐秘'));assert.equal(v.messages.some(m=>m.type==='journal'),false)
  a.send({type:'undo',id:journal.items[0].id,revision:3,requestId:'reveal'});assert.equal((await a.wait(m=>m.requestId==='reveal')).ok,false)
})
test('failed disk replacement confirms neither state nor an undo record',async t=>{
  const dir=await mkdtemp(path.join(tmpdir(),'maimai-disk-')),stateFile=path.join(dir,'state.json'),server=createServer(),sync=attachSync(server,{stateFile,requireRevision:true,authorize}),clients=[]
  server.listen(0,'127.0.0.1');await once(server,'listening');t.after(async()=>{clients.forEach(ws=>ws.terminate());sync.close();server.close();await rm(dir,{recursive:true,force:true})})
  const a=await client(server.address().port,'controller');clients.push(a.ws);await a.wait(m=>m.type==='ready');const key='maimai-pro-director'
  a.send({type:'state',key,revision:0,data:{scene:'standby'}});await a.wait(m=>m.type==='ack'&&m.revision===1)
  a.send({type:'state',key,revision:1,data:{scene:'song'}});await a.wait(m=>m.type==='ack'&&m.revision===2);const before=await readFile(stateFile,'utf8')
  await mkdir(stateFile+'.tmp');a.send({type:'state',key,revision:2,data:{scene:'callboard'}});await a.wait(m=>m.type==='reject');assert.equal(await readFile(stateFile,'utf8'),before)
  a.send({type:'hello',role:'controller',protocol:2});const journal=await a.wait(m=>m.type==='journal'&&m.items[0]?.revision===2);assert.equal(journal.items.length,2)
  a.send({type:'undo',id:journal.items[0].id,revision:2,requestId:'disk-failure'});assert.equal((await a.wait(m=>m.requestId==='disk-failure')).ok,false);assert.equal(await readFile(stateFile,'utf8'),before)
})
