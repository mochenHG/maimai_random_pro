import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const {build}=createRequire(import.meta.resolve('vite'))('esbuild')
const compiled=await build({entryPoints:[fileURLToPath(new URL('../src/lib/connectionQR.ts',import.meta.url))],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'})
const {connectionQR}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`)
test('QR generation is local, deterministic and reserves a four-module quiet zone',()=>{
  const url='http://192.168.1.26:5196/director',q=connectionQR(url)
  assert.deepEqual(connectionQR(url),q);assert.equal(q.size,q.modules.length+8);assert.ok(q.path.startsWith('M4,4'))
  assert.deepEqual(q.modules.slice(0,7).map(row=>row.slice(0,7).map(Number)),[[1,1,1,1,1,1,1],[1,0,0,0,0,0,1],[1,0,1,1,1,0,1],[1,0,1,1,1,0,1],[1,0,1,1,1,0,1],[1,0,0,0,0,0,1],[1,1,1,1,1,1,1]])
  assert.ok(!q.path.includes(url));assert.notDeepEqual(connectionQR('http://192.168.1.27:5196/director').modules,q.modules)
})
test('QR payload accepts only control URLs without embedded credentials or pairing tokens',()=>{
  for(const value of ['javascript:alert(1)','http://user:pass@192.168.1.2/director','http://192.168.1.2/director?code=123456','http://192.168.1.2/director#token','http://192.168.1.2/obs-live','broken'])assert.throws(()=>connectionQR(value))
  assert.ok(connectionQR('http://[::1]:5196/director').path)
})
