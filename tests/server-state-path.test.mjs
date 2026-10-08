import test from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:net'
import { once } from 'node:events'
import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { WebSocket } from 'ws'

test('CLI persists and restores the configured state outside its runtime directory',async t=>{
  const dir=await mkdtemp(path.join(tmpdir(),'maimai-cli-state-')),stateFile=path.join(dir,'fixed-state','session.json'),project=fileURLToPath(new URL('..',import.meta.url))
  const sockets=[];let child
  const stop=async()=>{if(child&&child.exitCode===null){const exited=once(child,'exit');child.kill();await exited}child=null}
  t.after(async()=>{sockets.forEach(socket=>socket.terminate());await stop();await rm(dir,{recursive:true,force:true})})
  const start=async()=>{
    const portProbe=createServer();portProbe.listen(0,'127.0.0.1');await once(portProbe,'listening');const port=portProbe.address().port;await new Promise(resolve=>portProbe.close(resolve))
    child=spawn(process.execPath,['server.mjs',`--port=${port}`],{cwd:project,env:{...process.env,MAIMAI_STATE_FILE:stateFile},windowsHide:true,stdio:['ignore','pipe','pipe']})
    let output='';child.stdout.on('data',raw=>output+=raw);child.stderr.on('data',raw=>output+=raw)
    const deadline=Date.now()+5000
    while(!output.includes(`http://127.0.0.1:${port}`)){assert.equal(child.exitCode,null,output);assert.ok(Date.now()<deadline,output||'server startup timeout');await new Promise(resolve=>setTimeout(resolve,10))}
    return port
  }
  const connect=async port=>{
    const socket=new WebSocket(`ws://127.0.0.1:${port}/pro-sync`),messages=[];sockets.push(socket);socket.on('message',raw=>messages.push(JSON.parse(raw)))
    await once(socket,'open');socket.send(JSON.stringify({type:'hello',role:'controller',protocol:2}))
    const wait=async predicate=>{const deadline=Date.now()+3000;while(Date.now()<deadline){const index=messages.findIndex(predicate);if(index>=0)return messages.splice(index,1)[0];await new Promise(resolve=>setTimeout(resolve,10))}throw new Error('expected CLI sync response missing')}
    await wait(m=>m.type==='ready');return {socket,wait}
  }
  const key='maimai-pro-director',fixture={scene:'standby',title:'isolated CLI persistence',hideScores:false,endAt:null}
  const first=await connect(await start());first.socket.send(JSON.stringify({type:'state',key,revision:0,data:fixture}));await first.wait(m=>m.type==='ack'&&m.key===key)
  assert.deepEqual(JSON.parse(await readFile(stateFile,'utf8'))[key].data,fixture)
  first.socket.terminate();await stop()
  const restored=await connect(await start());assert.deepEqual((await restored.wait(m=>m.type==='state'&&m.key===key)).data,fixture)
})
