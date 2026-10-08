import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const {build}=createRequire(import.meta.resolve('vite'))('esbuild')

// Isolated layout and native-animation adapters; no browser, store or real timer.
let context
const documentEvents=new EventTarget(),reduced=new EventTarget()
documentEvents.hidden=false;reduced.matches=false
Object.assign(globalThis,{
  document:documentEvents,matchMedia:()=>reduced,innerHeight:1080,
  getComputedStyle:element=>({transform:element.shift?`matrix(1,0,0,1,0,${element.shift})`:'none'}),
  DOMMatrix:class {constructor(value){this.m41=0;this.m42=Number(value.split(',').at(-1).replace(')',''))}},
  __rankHooks:{
    useRef(value){const index=context.cursor++;return context.refs[index]??(context.refs[index]={current:value})},
    useLayoutEffect(fn,deps){this.useEffect(fn,deps)},
    useEffect(fn,deps){const index=context.cursor++,old=context.effects[index];if(!old||deps.some((v,i)=>!Object.is(v,old.deps[i])))context.pending.push(()=>{old?.cleanup?.();context.effects[index]={deps,cleanup:fn()}})}
  }
})
// The exported hook functions must not rely on a `this` binding.
globalThis.__rankHooks.useLayoutEffect=globalThis.__rankHooks.useEffect
const compiled=await build({entryPoints:[fileURLToPath(new URL('../src/hooks/useRankMotion.ts',import.meta.url))],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent',plugins:[{name:'rank-hooks',setup(b){
  b.onResolve({filter:/^react$/},()=>({path:'hooks',namespace:'rank-hooks'}))
  b.onLoad({filter:/.*/,namespace:'rank-hooks'},()=>({contents:'export const {useRef,useLayoutEffect,useEffect}=globalThis.__rankHooks;',loader:'js'}))
}}]})
const {useRankMotion}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`)
function mount(){
  const state={refs:[],effects:[],pending:[],cursor:0},started=[],players=new Map()
  let baseTop=100,order=[],revision=0
  const player=id=>{if(!players.has(id))players.set(id,{
    dataset:{playerId:id},shift:0,
    getBoundingClientRect(){const top=baseTop+order.indexOf(id)*78+this.shift;return {top,left:30,bottom:top+78}},
    animate(frames,options){let finish;const animation={frames,options,canceled:false,finished:new Promise(resolve=>{finish=resolve}),cancel:()=>{animation.canceled=true;this.shift=0},finish:()=>{this.shift=0;finish()}};started.push({id,animation});return animation}
  });return players.get(id)}
  const root={getBoundingClientRect:()=>({top:baseTop,left:10}),querySelectorAll:()=>order.map(player)},ref={current:root}
  const render=(ids,scope='stage:0',top=baseTop)=>{order=ids;baseTop=top;context=state;state.cursor=0;useRankMotion(ref,String(++revision),scope);state.pending.splice(0).forEach(fn=>fn())}
  return {render,started,players,unmount:()=>state.effects.forEach(effect=>effect?.cleanup?.())}
}

test('ranking rows move from their previous positions while page scrolling does not create moves',()=>{
  const view=mount();view.render(['a','b']);assert.equal(view.started.length,0)
  view.render(['a','b'],'stage:0',300);assert.equal(view.started.length,0)
  view.render(['b','a']);assert.deepEqual(view.started.map(x=>[x.id,x.animation.frames[0].transform]),[['b','translate(0px,78px)'],['a','translate(0px,-78px)']])
  assert.ok(view.started.every(x=>x.animation.options.duration===560));view.unmount()
})

test('interrupted moves continue from the currently visible offset and removed rows cancel',()=>{
  const view=mount();view.render(['a','b']);view.render(['b','a'])
  view.players.get('b').shift=30;view.players.get('a').shift=-30
  view.render(['a','b']);assert.ok(view.started.slice(0,2).every(x=>x.animation.canceled))
  assert.deepEqual(view.started.slice(2).map(x=>[x.id,x.animation.frames[0].transform]),[['a','translate(0px,48px)'],['b','translate(0px,-48px)']])
  view.render(['a']);assert.ok(view.started.at(-1).animation.canceled);view.unmount()
})

test('changing a stage or pagination scope settles rows without cross-page movement',()=>{
  const view=mount();view.render(['a','b']);view.render(['b','a']);view.render(['a','b'],'stage:1')
  assert.equal(view.started.length,2);assert.ok(view.started.every(x=>x.animation.canceled));view.unmount()
})

test('hidden and reduced-motion views cancel running work and skip subsequent movement',()=>{
  const view=mount();view.render(['a','b']);view.render(['b','a'])
  documentEvents.hidden=true;documentEvents.dispatchEvent(new Event('visibilitychange'))
  assert.ok(view.started.every(x=>x.animation.canceled));view.render(['a','b']);assert.equal(view.started.length,2)
  documentEvents.hidden=false;view.render(['b','a']);assert.equal(view.started.length,4)
  reduced.matches=true;reduced.dispatchEvent(new Event('change'));assert.ok(view.started.every(x=>x.animation.canceled))
  view.render(['a','b']);assert.equal(view.started.length,4);view.unmount();reduced.matches=false
})

test('completed movement releases its job and unmount cancels remaining jobs',async()=>{
  const view=mount();view.render(['a','b']);view.render(['b','a']);const first=view.started[0].animation
  first.finish();await Promise.resolve();view.unmount()
  assert.equal(first.canceled,false);assert.equal(view.started[1].animation.canceled,true)
})
