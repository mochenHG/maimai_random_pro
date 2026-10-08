import test from 'node:test'
import assert from 'node:assert/strict'
import { canonicalIcon, ICON_SAMPLES, ICON_STROKES, interpolateIcon, resampleStroke, sampleIcon, strokePath } from '../src/lib/iconMorph.ts'
import { createFrameScheduler } from '../src/lib/frameScheduler.ts'

function fakeClock(){
  let time=0,id=0
  const pending=new Map()
  const clock={now:()=>time,request:callback=>{pending.set(++id,callback);return id},cancel:id=>pending.delete(id)}
  return {clock,pending,advance:delta=>{time+=delta;const callbacks=[...pending.values()];pending.clear();callbacks.forEach(callback=>callback(time))}}
}
test('stroke samples preserve endpoints, distribute by length, and handle collapsed strokes',()=>{
  assert.deepEqual(resampleStroke([[0,0],[0,0],[2,0],[2,2]],5),[[0,0],[1,0],[2,0],[2,1],[2,2]])
  assert.deepEqual(resampleStroke([[12,12]],3),[[12,12],[12,12],[12,12]])
  assert.throws(()=>resampleStroke([],32),RangeError)
})
test('state morphs preserve both endpoints and interruptions start from the visible shape',()=>{
  for(const [first,last] of [['copy','check'],['plus','minus'],['down','up'],['sun','moon']]){
    const from=sampleIcon(first),to=sampleIcon(last)
    assert.equal(from.length,ICON_STROKES)
    assert.deepEqual(interpolateIcon(from,to,0),from)
    assert.deepEqual(interpolateIcon(from,to,1),to)
    const interrupted=interpolateIcon(from,to,.43)
    assert.deepEqual(interpolateIcon(interrupted,from,0),interrupted)
    for(const stroke of interrupted){
      assert.equal(stroke.points.length,ICON_SAMPLES)
      assert.ok(stroke.opacity>=0&&stroke.opacity<=1)
      assert.ok(stroke.points.every(point=>point.every(Number.isFinite)))
      assert.ok(!strokePath(stroke.points).includes('NaN'))
    }
    assert.equal(canonicalIcon(last).filter(stroke=>stroke.opacity).length,last==='moon'||last==='check'||last==='minus'||last==='up'?1:2)
  }
})
test('simultaneous icons use one frame, finish once and leave no idle loop',()=>{
  const fake=fakeClock(),scheduler=createFrameScheduler(fake.clock)
  let complete=0;const progress=[[],[]]
  scheduler.start(p=>progress[0].push(p),()=>complete++,100)
  scheduler.start(p=>progress[1].push(p),()=>complete++,200)
  assert.equal(fake.pending.size,1)
  fake.advance(50);assert.deepEqual(progress,[[.5],[.25]]);assert.equal(fake.pending.size,1)
  fake.advance(50);assert.equal(complete,1);assert.equal(fake.pending.size,1)
  fake.advance(100);assert.equal(complete,2);assert.equal(fake.pending.size,0)
  fake.advance(1000);assert.equal(complete,2)
})
test('interruption/unmount cancel work; reduced motion settles without scheduling a frame',()=>{
  const fake=fakeClock(),scheduler=createFrameScheduler(fake.clock)
  const seen=[];let completed=0
  const stop=scheduler.start(p=>seen.push(p),()=>completed++,100)
  fake.advance(30);stop();assert.equal(fake.pending.size,0)
  fake.advance(100);assert.deepEqual(seen,[.3]);assert.equal(completed,0)
  scheduler.start(p=>seen.push(p),()=>completed++,0)
  assert.deepEqual(seen,[.3,1]);assert.equal(completed,1);assert.equal(fake.pending.size,0)
})
test('cancelling one icon does not cancel another active icon',()=>{
  const fake=fakeClock(),scheduler=createFrameScheduler(fake.clock)
  const cancel=scheduler.start(()=>assert.fail('cancelled update'),()=>assert.fail('cancelled completion'),100)
  let completed=false;scheduler.start(()=>{},()=>{completed=true},100)
  cancel();assert.equal(fake.pending.size,1)
  fake.advance(100);assert.equal(completed,true);assert.equal(fake.pending.size,0)
})
