import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const {build}=createRequire(import.meta.resolve('vite'))('esbuild')

// Exercise the imperative score output with isolated hook/clock/DOM adapters.
// No browser connection, application store or real timer is used here.
let context, time=0, frameId=0
const frames=new Map(), documentEvents=new EventTarget(), reduced=new EventTarget()
documentEvents.hidden=false;reduced.matches=false
Object.assign(globalThis,{
  document:documentEvents, matchMedia:()=>reduced,
  requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId},
  cancelAnimationFrame:id=>frames.delete(id),
  __obsScoreHooks:{
    useRef(value){const index=context.cursor++;return context.refs[index]??(context.refs[index]={current:value})},
    useLayoutEffect(fn,deps){
      const index=context.cursor++, old=context.effects[index]
      if(!old||deps.some((value,i)=>!Object.is(value,old.deps[i])))context.pending.push(()=>{old?.cleanup?.();context.effects[index]={deps,cleanup:fn()}})
    }
  }
})
Object.defineProperty(globalThis,'performance',{value:{now:()=>time},configurable:true})
const compiled=await build({entryPoints:[fileURLToPath(new URL('../src/components/OBSScore.tsx',import.meta.url))],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'score-hooks',setup(b){
  b.onResolve({filter:/^react$/},args=>args.importer.endsWith('OBSScore.tsx')?{path:'hooks',namespace:'score-hooks'}:undefined)
  b.onLoad({filter:/.*/,namespace:'score-hooks'},()=>({contents:'export const {useRef,useLayoutEffect}=globalThis.__obsScoreHooks;',loader:'js'}))
}}]})
const {default:Score}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`)
function mount(value){
  const state={refs:[],effects:[],pending:[],cursor:0},output={textContent:''}
  const render=value=>{
    context=state;state.cursor=0
    const element=Score({value})
    if(!element.ref.current){element.ref.current=output;output.textContent=element.props.children}
    for(const effect of state.pending.splice(0))effect()
  }
  render(value)
  return {output,render,unmount:()=>state.effects.forEach(effect=>effect?.cleanup?.())}
}
function advance(delta){time+=delta;const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(time))}

test('score appears immediately and interrupted changes continue from the displayed number',()=>{
  const view=mount(100)
  assert.equal(view.output.textContent,'100.0000');assert.equal(frames.size,0)
  view.render(101);advance(210)
  assert.equal(view.output.textContent,'100.8750')
  view.render(99);assert.equal(frames.size,1);advance(210)
  assert.equal(view.output.textContent,'99.2344')
  advance(210);assert.equal(view.output.textContent,'99.0000');assert.equal(frames.size,0)
  view.unmount()
})

test('cleared scores cannot leave old numbers or scheduled frames behind',()=>{
  const view=mount(100);view.render(101);advance(100)
  view.render(null);assert.equal(view.output.textContent,'—');assert.equal(frames.size,0)
  view.render(98);assert.equal(view.output.textContent,'98.0000');assert.equal(frames.size,0)
  view.render(99);view.unmount();assert.equal(frames.size,0)
})

test('hidden or reduced-motion sources settle immediately and release active jobs',()=>{
  const view=mount(100);view.render(101);advance(50)
  documentEvents.hidden=true;documentEvents.dispatchEvent(new Event('visibilitychange'))
  assert.equal(view.output.textContent,'101.0000');assert.equal(frames.size,0)
  documentEvents.hidden=false;view.render(102);advance(50)
  reduced.matches=true;reduced.dispatchEvent(new Event('change'))
  assert.equal(view.output.textContent,'102.0000');assert.equal(frames.size,0)
  view.render(103);assert.equal(view.output.textContent,'103.0000');assert.equal(frames.size,0)
  view.unmount();reduced.matches=false
})

test('simultaneous score outputs share a frame and cancel independently',()=>{
  const first=mount(100),second=mount(90)
  first.render(101);second.render(92);assert.equal(frames.size,1)
  first.unmount();assert.equal(frames.size,1)
  advance(420);assert.equal(second.output.textContent,'92.0000');assert.equal(frames.size,0)
  second.unmount()
})
