import test from 'node:test'
import assert from 'node:assert/strict'
import { copyText } from '../src/lib/clipboard.ts'

function globals(t,values){for(const [key,value] of Object.entries(values)){const old=Object.getOwnPropertyDescriptor(globalThis,key);Object.defineProperty(globalThis,key,{configurable:true,value});t.after(()=>old?Object.defineProperty(globalThis,key,old):delete globalThis[key])}}
test('copy uses the Clipboard API without disturbing focus or selecting page contents',async t=>{
  let copied='';globals(t,{navigator:{clipboard:{writeText:async text=>{copied=text}}},document:{createElement:()=>{throw Error('fallback must not run')}}})
  assert.equal(await copyText('http://192.168.1.2:5196/director'),true);assert.equal(copied,'http://192.168.1.2:5196/director')
})
test('LAN clipboard fallback copies exact text and cleans up even after permission failure',async t=>{
  let input,removed=false,focused=false,selectionRestored=false
  globals(t,{navigator:{clipboard:{writeText:async()=>{throw Error('permission denied')}}},window:{getSelection:()=>({rangeCount:1,getRangeAt:()=>({cloneRange:()=>({test:true})}),removeAllRanges:()=>{},addRange:range=>{selectionRestored=range.test}})},document:{activeElement:{isConnected:true,focus:()=>{focused=true}},body:{append:el=>{input=el}},createElement:()=>({style:{},focus:()=>{},select:()=>{},setSelectionRange:(a,b)=>assert.deepEqual([a,b],[0,6]),remove:()=>{removed=true}}),execCommand:command=>{assert.equal(command,'copy');assert.equal(input.value,'123456');return true}}})
  assert.equal(await copyText('123456'),true);assert.equal(removed,true);assert.equal(focused,true);assert.equal(selectionRestored,true)
})
test('copy reports blocked fallback and removes its temporary field',async t=>{
  let removed=false;globals(t,{navigator:{},window:{getSelection:()=>null},document:{activeElement:null,body:{append:()=>{}},createElement:()=>({style:{},focus:()=>{},select:()=>{},setSelectionRange:()=>{},remove:()=>{removed=true}}),execCommand:()=>false}})
  assert.equal(await copyText('text'),false);assert.equal(removed,true)
})
