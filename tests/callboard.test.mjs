import test from 'node:test'
import assert from 'node:assert/strict'
import { createCallboard, emptyCallboard, validateCallboard, advanceCallboard, editCallBatch, visibleCallboard } from '../src/lib/callboard.ts'
const make=()=>createCallboard('event','stage',['a','b','c','d','e'],2,'请候场')
test('callboard batches every player once and validates limits',()=>{
  const b=make();assert.deepEqual(b.items.map(i=>i.playerIds),[['a','b'],['c','d'],['e']]);assert.equal(validateCallboard(b),b)
  for(const size of [0,5,1.5])assert.throws(()=>createCallboard('e','s',['a'],size,''))
  assert.throws(()=>createCallboard('e','s',[],2,''));assert.throws(()=>createCallboard('e','s',['a','a'],2,''));assert.throws(()=>validateCallboard({...b,notice:'x'.repeat(121)}))
})
test('advance, skip and completion retain the original immutable queue',()=>{
  const b=make(),first=advanceCallboard(b),next=advanceCallboard(first,true),last=advanceCallboard(next),ended=advanceCallboard(last)
  assert.deepEqual(b.items.map(i=>i.status),['waiting','waiting','waiting'])
  assert.deepEqual(next.items.map(i=>i.status),['skipped','current','waiting'])
  assert.deepEqual(ended.items.map(i=>i.status),['skipped','done','done']);assert.deepEqual(advanceCallboard(ended),ended)
})
test('waiting batches reorder while current batches remain protected',()=>{
  const b=advanceCallboard(make()),[a,c,d]=b.items,moved=editCallBatch(b,d.id,'up')
  assert.deepEqual(moved.items.map(i=>i.id),[a.id,d.id,c.id]);assert.throws(()=>editCallBatch(b,a.id,'up'))
  const skipped=editCallBatch(b,c.id,'skip');assert.equal(skipped.items[1].status,'skipped');assert.equal(editCallBatch(skipped,c.id,'return').items[1].status,'waiting')
  assert.throws(()=>editCallBatch(b,c.id,'return'));assert.throws(()=>editCallBatch(b,'missing','up'))
})
test('display isolates other events/stages and removes deleted players from public names',()=>{
  const b=advanceCallboard(make());assert.equal(visibleCallboard(b,'other','stage',['a','b']).stale,true);assert.equal(visibleCallboard(b,'event','other',['a','b']).stale,true)
  const v=visibleCallboard(b,'event','stage',['a','c','d']);assert.deepEqual(v.current.playerIds,['a']);assert.equal(v.waiting,2);assert.deepEqual(v.next.map(i=>i.playerIds),[['c','d']])
  assert.equal(visibleCallboard(emptyCallboard(),'event','stage',[]).stale,true)
})
test('duplicate batch ids, players and concurrent current batches are rejected',()=>{
  const b=make();assert.throws(()=>validateCallboard({...b,items:[b.items[0],b.items[0]]}))
  assert.throws(()=>validateCallboard({...b,items:b.items.map(i=>({...i,status:'current'}))}))
  assert.throws(()=>validateCallboard({...b,items:[{id:'x',playerIds:[],status:'waiting'}]}))
})
