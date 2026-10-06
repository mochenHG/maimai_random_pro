import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import { once } from 'node:events'
import { readFile } from 'node:fs/promises'
import { WebSocket } from 'ws'
import { attachSync } from '../sync.mjs'
import { convertMusic } from '../src/api/music.ts'
import { load } from '../src/lib/storage.ts'

test('a null initial OBS snapshot is treated as an empty result', () => {
  const previous=globalThis.localStorage
  globalThis.localStorage={getItem:()=> 'null'}
  try {assert.deepEqual(load('maimai-pro-draw',[]),[])} finally {if(previous) globalThis.localStorage=previous; else delete globalThis.localStorage}
})

test('real online library converts without dropping or duplicating charts', async () => {
  const data = JSON.parse(await readFile(new URL('../data/music-snapshot.json', import.meta.url), 'utf8'))
  const songs = convertMusic(data)
  const expected = data.songs.filter(s => !s.disabled).reduce((n,s) => n + ['standard','dx','utage'].reduce((m,t)=>m+(s.difficulties[t]?.length || 0),0),0)
  assert.equal(songs.length, expected)
  assert.equal(new Set(songs.map(s=>s.id)).size, songs.length)
  assert.ok(songs.some(s=>s.isPlus)); assert.ok(songs.some(s=>s.chartType === 'dx'))
})
test('multiple utage charts for one song keep unique chart IDs', () => {
  const chart = {difficulty:0,level:'14+',level_value:14.8}
  const songs = convertMusic({songs:[{id:1,title:'宴',artist:'test',bpm:180,version:1,difficulties:{utage:[chart,chart]}}]})
  assert.equal(songs.length,2); assert.notEqual(songs[0].id,songs[1].id)
})
function message(socket, predicate) {
  return new Promise((resolve,reject) => {
    const timeout=setTimeout(()=>{socket.off('message',receive); reject(new Error('Missing sync message'))},2000)
    function receive(raw) {const data=JSON.parse(raw.toString()); if(predicate(data)){clearTimeout(timeout); socket.off('message',receive); resolve(data)}}
    socket.on('message',receive)
  })
}
test('OBS opened before the main page receives automatic publication and subsequent updates', async () => {
  const server=http.createServer(); const wss=attachSync(server)
  server.listen(0,'127.0.0.1'); await once(server,'listening')
  const url=`ws://127.0.0.1:${server.address().port}/pro-sync`
  const viewer=new WebSocket(url); await once(viewer,'open')
  viewer.send(JSON.stringify({type:'hello',role:'viewer'}))
  const controller=new WebSocket(url); await once(controller,'open')
  try {
    const received=message(viewer,m=>m.type==='state')
    controller.send(JSON.stringify({type:'hello',role:'controller'}))
    controller.send(JSON.stringify({type:'state',key:'maimai-pro-draw',data:[{id:'first'}]}))
    assert.equal((await received).data[0].id,'first')
    const next=message(viewer,m=>m.type==='state')
    controller.send(JSON.stringify({type:'state',key:'maimai-pro-draw',data:[{id:'second'}]}))
    assert.equal((await next).data[0].id,'second')
    const late=new WebSocket(url); await once(late,'open')
    const snapshot=message(late,m=>m.type==='state')
    late.send(JSON.stringify({type:'hello',role:'viewer'}))
    assert.equal((await snapshot).data[0].id,'second'); late.close()
  } finally {viewer.terminate(); controller.terminate(); for(const client of wss.clients) client.terminate(); await new Promise(resolve=>wss.close(resolve)); await new Promise(resolve=>server.close(resolve))}
})
