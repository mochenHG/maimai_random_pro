import test from 'node:test'
import assert from 'node:assert/strict'
import { createExitSwap } from '../src/lib/exitSwap.ts'
function fixture(){
  const pending=new Map(),events=[];let id=0
  const clock={schedule:(finish,delay)=>{pending.set(++id,{finish,delay});const token=id;return()=>pending.delete(token)}}
  const swap=createExitSwap(['old'],'a',view=>events.push(view),clock)
  const finish=()=>{const callbacks=[...pending.values()];pending.clear();callbacks.forEach(job=>job.finish())}
  return {swap,pending,events,finish}
}
test('redraw retains the old cards for exit and mounts the new generation afterward',()=>{
  const {swap,pending,events,finish}=fixture()
  swap.update(['new'],'b',true)
  assert.deepEqual(swap.view.value,['old']);assert.equal(swap.view.leaving,true);assert.equal(pending.size,1)
  assert.equal([...pending.values()][0].delay,480)
  finish();assert.deepEqual(swap.view.value,['new']);assert.equal(swap.view.generation,1);assert.equal(swap.view.leaving,false);assert.equal(swap.view.enter,true)
  assert.equal(events.length,2);assert.equal(pending.size,0)
})
test('rapid redraws keep one exit deadline and only the latest incoming cards',()=>{
  const {swap,pending,finish}=fixture()
  swap.update(['second'],'b',true);swap.update(['third'],'c',true);swap.update(['fourth'],'d',true)
  assert.equal(pending.size,1);assert.deepEqual(swap.view.value,['old'])
  finish();assert.deepEqual(swap.view.value,['fourth']);assert.equal(swap.view.generation,1)
})
test('duplicate render keys do not replay an exit or start another timer',()=>{
  const {swap,pending,events,finish}=fixture()
  swap.update(['old'],'a',true);assert.equal(events.length,0)
  swap.update(['new'],'b',true);swap.update(['new'],'b',true);assert.equal(pending.size,1)
  finish();swap.update(['new'],'b',true);assert.equal(events.length,2)
})
test('hidden and reduced-motion sources settle without replaying a later entrance',()=>{
  const {swap,pending}=fixture()
  swap.update(['new'],'b',true);swap.finish(false)
  assert.equal(pending.size,0);assert.deepEqual(swap.view.value,['new']);assert.equal(swap.view.enter,false)
  swap.update(['latest'],'c',false);assert.deepEqual(swap.view.value,['latest']);assert.equal(swap.view.enter,false);assert.equal(pending.size,0)
})
test('unmount cancels the deadline and stale callbacks cannot emit updates',()=>{
  const {swap,pending,events}=fixture()
  swap.update(['new'],'b',true);const late=[...pending.values()][0].finish
  swap.dispose();late();swap.update(['later'],'c',true)
  assert.equal(pending.size,0);assert.equal(events.length,1)
})
