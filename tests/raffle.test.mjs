import test from 'node:test'
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { WebSocket } from 'ws'
import { attachSync } from '../sync.mjs'
import { beginDraw, displayRaffle, eligiblePlayers, emptyRaffle, isRaffleBusy, manualPool, revealDraw, validateRaffle } from '../src/lib/raffle.ts'

const prepared = () => ({...emptyRaffle(),pool:manualPool('甲\n乙\n丙'),count:2})
test('manual pool normalizes duplicate names and validates roster size',()=>{
  assert.deepEqual(manualPool(' 甲 \n\n甲\nＡlice\nalice\n乙').map(p=>p.name),['甲','Ａlice','乙'])
  assert.throws(()=>manualPool('长'.repeat(81)))
  assert.throws(()=>manualPool(Array(10001).fill('甲').join('\n')))
})
test('draw selects without replacement and never mutates its source',()=>{
  const state=prepared(), drawing=beginDraw(state,()=>0)
  assert.equal(drawing.pending.length,2);assert.equal(new Set(drawing.pending.map(p=>p.id)).size,2)
  assert.deepEqual(state,prepared());assert.equal(drawing.history.length,0)
  assert.throws(()=>beginDraw(drawing));assert.throws(()=>beginDraw({...state,count:4}))
  for(const count of [0,-1,1.5,11,NaN])assert.throws(()=>beginDraw({...state,count}))
})
test('pending results survive refresh but are absent from the OBS snapshot',()=>{
  const drawing=beginDraw(prepared(),()=>0), restored=validateRaffle(JSON.parse(JSON.stringify(drawing)))
  assert.deepEqual(restored.pending,drawing.pending)
  const display=displayRaffle(restored)
  assert.equal(display.round,null);assert.equal(display.phase,'drawing')
  assert.ok(!JSON.stringify(display).includes('manual:'));assert.ok(!('pending' in display))
  const result=revealDraw(restored,10000)
  assert.equal(result.history.length,1);assert.deepEqual(result.history[0].winners,drawing.pending)
  assert.equal(result.pending.length,0);assert.throws(()=>revealDraw(result))
  assert.equal(isRaffleBusy(result,11000),true);assert.equal(isRaffleBusy(result,11301),false)
  assert.deepEqual(displayRaffle(validateRaffle(JSON.parse(JSON.stringify(result)))).round,result.history[0])
})
test('repeat prevention persists across rounds and source changes, even with new IDs',()=>{
  const done=revealDraw(beginDraw(prepared(),()=>0),1)
  assert.deepEqual(eligiblePlayers(done).map(p=>p.name),['丙'])
  const changed={...done,pool:[{id:'different-id',name:'甲'},{id:'four',name:'丁'}]}
  assert.deepEqual(eligiblePlayers(changed).map(p=>p.name),['丁'])
  assert.equal(eligiblePlayers({...changed,preventRepeat:false}).length,2)
  assert.throws(()=>beginDraw({...done,count:2}))
  const next=revealDraw(beginDraw({...done,count:1},()=>0),2)
  assert.equal(next.history.length,2);assert.equal(eligiblePlayers(next).length,0)
  assert.equal(done.history.length,1)
})
test('backup validation rejects malformed and incomplete rounds',()=>{
  for(const bad of [null,{}, {...prepared(),phase:'drawing'}, {...prepared(),count:Infinity}, {...prepared(),history:[{winners:[]}]}, {...prepared(),phase:'revealed'}])assert.throws(()=>validateRaffle(bad))
})
test('independent OBS viewer receives raffle state, reconnect snapshot, and existing streams', async t=>{
  const server=createServer(), sync=attachSync(server), sockets=[]
  t.after(()=>{sockets.forEach(s=>s.terminate());sync.close();server.close()})
  server.listen(0,'127.0.0.1');await once(server,'listening')
  const connect=async role=>{const ws=new WebSocket(`ws://127.0.0.1:${server.address().port}/pro-sync`);sockets.push(ws);await once(ws,'open');ws.send(JSON.stringify({type:'hello',role}));return ws}
  const controller=await connect('controller'),viewer=await connect('viewer')
  for(const key of ['maimai-pro-draw','maimai-pro-tournament','maimai-pro-raffle']){
    const event=once(viewer,'message');controller.send(JSON.stringify({type:'state',key,data:{check:key}}))
    assert.deepEqual(JSON.parse((await event)[0]),{type:'state',key,data:{check:key}})
  }
  const reconnect=new WebSocket(`ws://127.0.0.1:${server.address().port}/pro-sync`);sockets.push(reconnect)
  const messages=[];reconnect.on('message',raw=>messages.push(JSON.parse(raw)))
  await once(reconnect,'open');const first=once(reconnect,'message');reconnect.send(JSON.stringify({type:'hello',role:'viewer'}));await first
  await new Promise(resolve=>setImmediate(resolve))
  assert.ok(messages.some(m=>m.key==='maimai-pro-raffle'));assert.equal(messages.length,3)
})
