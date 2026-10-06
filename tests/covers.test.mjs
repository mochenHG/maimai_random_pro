import test from 'node:test'
import assert from 'node:assert/strict'
import {coverSources} from '../src/lib/covers.ts'
import {normalizeSongs} from '../src/lib/songs.ts'
test('a provided jacket is preserved; a missing utage jacket falls back to its parent',()=>{
  assert.deepEqual(coverSources({songId:100227,cover:'/old/utage.png'}),['/old/utage.png','https://assets2.lxns.net/maimai/jacket/100227.png','https://assets2.lxns.net/maimai/jacket/227.png'])
  assert.equal(coverSources({songId:227,cover:'https://assets2.lxns.net/maimai/jacket/227.png'}).length,1)
  assert.deepEqual(coverSources({songId:0,cover:''}),[])
})
test('legacy numeric IDs and numeric songId fields recover a missing jacket',()=>{
  const song={name:'song',difficulty:'UTAGE',level:'14',chartType:'standard'}
  assert.equal(normalizeSongs([{...song,id:'100227-utage-0',cover:''}])[0].songId,100227)
  assert.equal(normalizeSongs([{...song,id:'custom',song_id:'227'}])[0].songId,227)
  assert.equal(normalizeSongs([{...song,id:'custom'}])[0].songId,0)
})
