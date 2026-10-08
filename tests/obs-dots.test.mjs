import test, {after} from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const {build}=createRequire(import.meta.resolve('vite'))('esbuild')

// Exercise the broadcast canvas lifecycle with an isolated frame/timer/DOM adapter.
let context
globalThis.__dotHooks={
  useRef(value){const index=context.cursor++;return context.refs[index]??(context.refs[index]={current:value})},
  useEffect(fn){context.effects.push(fn)}
}
const compiled=await build({entryPoints:[fileURLToPath(new URL('../src/components/DotBackground.tsx',import.meta.url))],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent',define:{'process.env.NODE_ENV':'"production"'},plugins:[{name:'dot-hooks',setup(b){
  b.onResolve({filter:/^react$/},args=>args.importer.endsWith('DotBackground.tsx')?{path:'hooks',namespace:'dot-hooks'}:undefined)
  b.onLoad({filter:/.*/,namespace:'dot-hooks'},()=>({contents:'export const {useRef,useEffect}=globalThis.__dotHooks;',loader:'js'}))
}}]})
const {default:DotBackground}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`)
const originalTimer=globalThis.setTimeout,originalClear=globalThis.clearTimeout
let jobId=0
const frames=new Map(),timers=new Map(),observers=new Set(),documentEvents=new EventTarget(),reduced=new EventTarget()
const events=[],add=documentEvents.addEventListener.bind(documentEvents),remove=documentEvents.removeEventListener.bind(documentEvents)
documentEvents.addEventListener=(name,...rest)=>{events.push(name);add(name,...rest)}
documentEvents.removeEventListener=remove
documentEvents.documentElement={dataset:{theme:'dark'}};documentEvents.hidden=false;reduced.matches=false
Object.assign(globalThis,{
  document:documentEvents,window:new EventTarget(),innerWidth:7680,innerHeight:4320,devicePixelRatio:4,matchMedia:()=>reduced,
  requestAnimationFrame:fn=>{frames.set(++jobId,fn);return jobId},cancelAnimationFrame:id=>frames.delete(id),
  setTimeout:(fn,delay)=>{timers.set(++jobId,{fn,delay});return jobId},clearTimeout:id=>timers.delete(id),
  MutationObserver:class {observe(){} disconnect(){this.disconnected=true}},
  ResizeObserver:class {constructor(fn){this.fn=fn;observers.add(this)} observe(){} disconnect(){observers.delete(this)}}
})
Object.defineProperty(globalThis,'navigator',{value:{hardwareConcurrency:8},configurable:true})
after(()=>{globalThis.setTimeout=originalTimer;globalThis.clearTimeout=originalClear})
const tick=time=>{const pending=[...frames.values()];frames.clear();pending.forEach(fn=>fn(time))}
function mount({width=1700,height=900,broadcast=true,active=true}={}){
  context={cursor:0,refs:[],effects:[]}
  let arcs=0
  const ctx={clearRect(){},setTransform(){},beginPath(){},arc(){arcs++},fill(){},globalAlpha:1,fillStyle:''}
  const canvas={dataset:{},width:0,height:0,getBoundingClientRect:()=>({width,height}),getContext:()=>ctx}
  const element=DotBackground({active,broadcast});element.props.children.ref.current=canvas
  const cleanup=context.effects.map(fn=>fn())
  return {canvas,ctx,get arcs(){return arcs},resize(w,h){width=w;height=h;for(const o of observers)o.fn()},unmount:()=>cleanup.forEach(fn=>fn?.())}
}

test('all broadcast waves fit the pixel/dot budget and do not subscribe to mouse movement',()=>{
  const before=events.length,view=mount({width:7680,height:4320})
  assert.ok(view.canvas.width*view.canvas.height<=1_600_000);assert.ok(Number(view.canvas.dataset.dotCount)<=1200)
  assert.ok(!events.slice(before).includes('pointermove'));assert.equal(frames.size,1)
  tick(0);tick(400);assert.ok(view.arcs>0)
  assert.equal(view.canvas.dataset.rippleX,String(7680*.24));assert.equal(view.canvas.dataset.rippleY,String(4320*.64))
  view.unmount();assert.equal(frames.size,0);assert.equal(timers.size,0);assert.equal(observers.size,0)
})

test('wave expansion yields its frame loop during the rest and alternates the next fixed origin',()=>{
  const view=mount();tick(0);tick(3000)
  assert.equal(frames.size,0);assert.equal(timers.size,1)
  const timer=[...timers.values()][0];assert.equal(timer.delay,1400);timers.clear();timer.fn();tick(4400)
  assert.equal(view.canvas.dataset.rippleCycle,'1');assert.equal(view.canvas.dataset.rippleX,String(1700*.76))
  view.unmount();assert.equal(frames.size,0);assert.equal(timers.size,0)
})

test('visibility and reduced-motion changes cancel frames and resting timers without accumulating jobs',()=>{
  const view=mount();tick(0);tick(3000);documentEvents.hidden=true;documentEvents.dispatchEvent(new Event('visibilitychange'))
  assert.equal(frames.size,0);assert.equal(timers.size,0)
  documentEvents.hidden=false;documentEvents.dispatchEvent(new Event('visibilitychange'));assert.equal(frames.size,1)
  reduced.matches=true;reduced.dispatchEvent(new Event('change'));assert.equal(frames.size,0)
  reduced.matches=false;reduced.dispatchEvent(new Event('change'));assert.equal(frames.size,1)
  view.resize(1400,720);assert.equal(frames.size,1)
  view.unmount();documentEvents.dispatchEvent(new Event('visibilitychange'));reduced.dispatchEvent(new Event('change'))
  assert.equal(frames.size,0);assert.equal(timers.size,0);assert.equal(observers.size,0)
})

test('low-power, inactive and zero-sized broadcast backgrounds remain static',()=>{
  navigator.hardwareConcurrency=4
  const low=mount();assert.equal(frames.size,0);assert.ok(Number(low.canvas.dataset.dotCount)<=1200);low.unmount()
  navigator.hardwareConcurrency=8
  const off=mount({active:false});assert.equal(frames.size,0);off.unmount()
  const zero=mount({width:0,height:0});assert.equal(frames.size,0);assert.equal(zero.canvas.width,0);zero.resize(800,400);assert.equal(frames.size,1);zero.unmount()
  assert.equal(timers.size,0);assert.equal(observers.size,0)
})
