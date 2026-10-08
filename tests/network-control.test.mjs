import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer, request } from 'node:http'
import { once } from 'node:events'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { WebSocket } from 'ws'
import { attachSync } from '../sync.mjs'
import { createPairing, localRequest } from '../pairing.mjs'
import { emptyRaffle, manualPool, beginDraw, displayRaffle } from '../src/lib/raffle.ts'

async function client(port,role,headers={}){const ws=new WebSocket(`ws://127.0.0.1:${port}/pro-sync`,{headers}),messages=[];ws.on('message',raw=>messages.push(JSON.parse(raw)));await once(ws,'open');ws.send(JSON.stringify({type:'hello',role,protocol:2}));const wait=async(predicate)=>{const end=Date.now()+3000;while(Date.now()<end){const index=messages.findIndex(predicate);if(index>=0)return messages.splice(index,1)[0];await new Promise(r=>setTimeout(r,5))}throw Error(`message missing: ${JSON.stringify(messages)}`)};return {ws,messages,wait,send:m=>ws.send(JSON.stringify(m))}}
test('paired controllers use revisions, viewers cannot alter state or read pending winners, disk survives restart',async t=>{
  const dir=await mkdtemp(path.join(tmpdir(),'maimai-sync-')),stateFile=path.join(dir,'state.json'),sockets=[]
  let server=createServer(),sync=attachSync(server,{stateFile,requireRevision:true,authorize:req=>req.headers.cookie==='control=ok'});server.listen(0,'127.0.0.1');await once(server,'listening')
  t.after(async()=>{sockets.forEach(s=>s.terminate());sync.close();server.close();await rm(dir,{recursive:true,force:true})})
  const connect=async role=>{const c=await client(server.address().port,role,{cookie:'control=ok'});sockets.push(c.ws);await c.wait(m=>m.type==='ready');return c}
  const denied=await client(server.address().port,'controller');sockets.push(denied.ws);await denied.wait(m=>m.type==='denied')
  const a=await connect('controller'),b=await connect('controller'),viewer=await connect('viewer'),key='maimai-pro-director'
  a.send({type:'state',key,revision:0,data:{scene:'song'}});await a.wait(m=>m.type==='ack');assert.equal((await viewer.wait(m=>m.key===key)).data.scene,'song');await b.wait(m=>m.key===key)
  b.send({type:'state',key,revision:0,data:{scene:'raffle'}});assert.equal((await b.wait(m=>m.type==='conflict')).data.scene,'song')
  viewer.send({type:'state',key,revision:1,data:{scene:'hacked'}})
  const drawing=beginDraw({...emptyRaffle(),pool:manualPool('甲\n乙')},()=>0)
  a.send({type:'state',key:'maimai-pro-raffle-control',revision:0,data:drawing});await a.wait(m=>m.type==='ack'&&m.key==='maimai-pro-raffle-control');const display=await viewer.wait(m=>m.key==='maimai-pro-raffle');assert.deepEqual(display.data,displayRaffle(drawing));assert.ok(!viewer.messages.some(m=>m.key==='maimai-pro-raffle-control'))
  const disk=JSON.parse(await readFile(stateFile,'utf8'));assert.equal(disk[key].data.scene,'song');assert.deepEqual(disk['maimai-pro-raffle-control'].data.pending,drawing.pending)
  sockets.forEach(s=>s.terminate());await new Promise(r=>sync.close(r));await new Promise(r=>server.close(r))
  server=createServer();sync=attachSync(server,{stateFile});server.listen(0,'127.0.0.1');await once(server,'listening');const restored=await connect('viewer');assert.equal((await restored.wait(m=>m.key===key)).data.scene,'song')
})
test('pairing only reveals code locally, enforces origin and revokes remote sessions',async t=>{
  let revoked=0;const pairing=createPairing(()=>revoked++),server=createServer((req,res)=>{void pairing.handle(req,res)});server.listen(0,'127.0.0.1');await once(server,'listening');t.after(()=>server.close());const origin=`http://127.0.0.1:${server.address().port}`
  const info=await (await fetch(origin+'/api/network')).json();assert.match(info.code,/^\d{6}$/)
  const remote={host:`192.168.1.7:${server.address().port}`,origin:`http://192.168.1.7:${server.address().port}`}
  assert.equal(localRequest({headers:remote,socket:{remoteAddress:'127.0.0.1'}}),false)
  const call=(url,opts={})=>new Promise((resolve,reject)=>{const req=request(origin+url,{method:opts.method??'GET',headers:{...remote,...opts.headers}},res=>{let body='';res.on('data',chunk=>body+=chunk);res.on('end',()=>resolve({status:res.statusCode,json:async()=>JSON.parse(body),headers:{get:key=>Array.isArray(res.headers[key])?res.headers[key].join(';'):res.headers[key]}}))});req.on('error',reject);req.end(opts.body)})
  const publicInfo=await (await call('/api/network')).json();assert.equal(publicInfo.code,undefined);assert.equal(publicInfo.paired,false)
  assert.equal((await call('/api/pair',{method:'POST',body:JSON.stringify({code:'000000'})})).status,401)
  const response=await call('/api/pair',{method:'POST',body:JSON.stringify({code:info.code})});assert.equal(response.status,200);const cookie=response.headers.get('set-cookie').split(';')[0]
  assert.equal((await (await call('/api/network',{headers:{cookie}})).json()).paired,true)
  await fetch(origin+'/api/pair/reset',{method:'POST'});assert.equal(revoked,1);assert.equal((await (await call('/api/network',{headers:{cookie}})).json()).paired,false)
  assert.equal((await call('/api/pair',{method:'POST',headers:{origin:'https://wrong.example'},body:'{}'})).status,403)
})
