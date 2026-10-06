import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeSongs } from '../src/lib/songs.ts'
import { inSongRange, formatGrade, MAX_CONSTANT, normalizeConstantRange, normalizeGradeRange } from '../src/lib/range.ts'
const raw={id:'1',name:'test',difficulty:'MASTER',level:'13+',chartType:'dx',levelValue:13.8}
test('integer mode matches displayed plus grade, decimal mode matches true chart constant',()=>{
  const song=normalizeSongs([raw])[0]
  assert.equal(inSongRange(song,'level',13.5,13.5),true)
  assert.equal(inSongRange(song,'level',13,13),false)
  assert.equal(inSongRange(song,'constant',13.8,13.8),true)
  assert.equal(inSongRange(song,'constant',13.5,13.5),false)
  assert.equal(inSongRange(song,'constant',13.7,13.9),true)
  assert.equal(formatGrade(13.5),'13+');assert.equal(formatGrade(14),'14')
})
test('legacy curves without constants are never assigned invented values',()=>{
  const song=normalizeSongs([{...raw,levelValue:undefined}])[0]
  assert.equal(song.levelValue,null);assert.equal(inSongRange(song,'constant',1,15),false)
  assert.equal(inSongRange(song,'level',1,15.5),true)
  assert.equal(normalizeSongs([{...raw,levelValue:undefined,ds:'13.9'}])[0].levelValue,13.9)
  assert.equal(normalizeSongs([{...raw,levelValue:undefined,level_value:13.7}])[0].levelValue,13.7)
})
test('decimal endpoint filtering tolerates slider arithmetic precision',()=>{
  const song=normalizeSongs([raw])[0]
  assert.equal(inSongRange(song,'constant',13.800000000000002,13.800000000000002),true)
})
test('constant 15.0 is the maximum and previous 15.9 settings are clamped',()=>{
  assert.equal(MAX_CONSTANT,15)
  assert.deepEqual(normalizeConstantRange(14.7,15.9),{constantMin:14.7,constantMax:15})
  assert.deepEqual(normalizeConstantRange(15.8,15.9),{constantMin:15,constantMax:15})
  assert.deepEqual(normalizeConstantRange(undefined,undefined),{constantMin:1,constantMax:15})
  const valid=normalizeSongs([{...raw,levelValue:15}])[0]
  assert.equal(inSongRange(valid,'constant',15,15),true)
  assert.equal(normalizeSongs([{...raw,levelValue:15.1}])[0].levelValue,null)
  assert.equal(inSongRange({...valid,levelValue:15.1},'constant',1,15.9),false)
})
test('15 has no plus grade, including persisted settings and legacy curves',()=>{
  assert.equal(formatGrade(15.5),'15')
  assert.deepEqual(normalizeGradeRange('14+','15+'),{min:'14+',max:'15'})
  assert.deepEqual(normalizeGradeRange('15+','15+'),{min:'15',max:'15'})
  for(const input of [{level:'15+'},{level:15,isPlus:true},{level:15.5,isPlus:true}]) {
    const song=normalizeSongs([{...raw,...input,levelValue:15}])[0]
    assert.equal(song.level,15);assert.equal(song.isPlus,false)
    assert.equal(inSongRange(song,'level',15,15),true)
  }
})
