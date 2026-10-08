import test from 'node:test'
import assert from 'node:assert/strict'
import { appendOperation, describeChange, publicJournal, undoEntry } from '../journal.mjs'
const key='maimai-pro-director',base={scene:'standby',title:'开始',endAt:null,hideScores:false},value={data:{...base,scene:'callboard'},revision:2}
test('journal metadata explains operation and hides all undo content',()=>{
  const list=appendOperation([],key,base,value,'主机'),snapshot=new Map([[key,value]]),view=publicJournal(list,snapshot)
  assert.equal(view[0].label,'切换展示 · 选手叫号');assert.equal(view[0].canUndo,true);assert.equal(view[0].before,undefined);assert.equal(view[0].beforeBytes,undefined);assert.equal(undoEntry(list,snapshot,list[0].id,2),list[0])
})
test('stale and already undone operations cannot overwrite a later revision',()=>{
  const list=appendOperation([],key,base,value,'主机'),snapshot=new Map([[key,{...value,revision:3}]])
  assert.equal(publicJournal(list,snapshot)[0].canUndo,false);assert.throws(()=>undoEntry(list,snapshot,list[0].id,2),/其他操作/)
  assert.throws(()=>undoEntry(list,new Map([[key,value]]),list[0].id,1));assert.throws(()=>undoEntry([{...list[0],undone:true}],new Map([[key,value]]),list[0].id,2))
})
test('undo is recorded separately and cannot reactivate old revisions or be repeated',()=>{
  const list=appendOperation([],key,base,value,'主机'),nextValue={data:base,revision:3},next=appendOperation(list,key,value.data,nextValue,'手机',list[0]),view=publicJournal(next,new Map([[key,nextValue]]))
  assert.equal(next[0].undoOf,list[0].id);assert.equal(next[1].undone,true);assert.equal(view.filter(v=>v.canUndo).length,0)
})
test('revealed raffle results and coupled chart actions are never undoable',()=>{
  const raffle={phase:'idle',history:[],pool:[],pending:[]},draw={...raffle,phase:'drawing',pending:[{name:'私密中奖者'}]}
  const pending=appendOperation([],'maimai-pro-raffle-control',raffle,{data:draw,revision:2},'主机');assert.ok(pending[0].before)
  const revealed={...draw,phase:'revealed',history:[{winners:draw.pending}]}
  const reveal=appendOperation(pending,'maimai-pro-raffle-control',draw,{data:revealed,revision:3},'主机');assert.equal(reveal[0].before,undefined)
  const reset=appendOperation(reveal,'maimai-pro-raffle-control',revealed,{data:raffle,revision:4},'主机');assert.equal(reset[0].before,undefined)
  const view=publicJournal(reveal,new Map([['maimai-pro-raffle-control',{revision:3}]]));assert.ok(!JSON.stringify(view).includes('私密中奖者'))
  assert.equal(appendOperation([],'maimai-pro-draw',[],{data:[{}],revision:2},'主机')[0].before,undefined)
})
test('journal retains 50 metadata records and caps retained undo snapshots',()=>{
  let list=[];for(let n=1;n<=60;n++)list=appendOperation(list,key,{...base,title:String(n-1)},{data:{...base,title:String(n)},revision:n},`主机 ${n}`)
  assert.equal(list.length,50);assert.equal(list[0].revision,60)
  const big={...base,title:'x'.repeat(5*1024*1024)},first=appendOperation([],key,big,value,'主机'),second=appendOperation(first,key,big,{...value,revision:3},'主机')
  assert.ok(second[0].before);assert.equal(second[1].before,undefined)
})
test('continuous text edits merge while retaining the earliest value for undo',()=>{
  const first=appendOperation([],key,base,{data:{...base,title:'赛'},revision:2},'主机'),next=appendOperation(first,key,{...base,title:'赛'},{data:{...base,title:'赛事开始'},revision:3},'主机')
  assert.equal(next.length,1);assert.equal(next[0].id,first[0].id);assert.equal(next[0].before.title,'开始');assert.equal(next[0].revision,3)
  const remote=appendOperation(next,key,{...base,title:'赛事开始'},{data:{...base,title:'别的输入'},revision:4},'手机');assert.equal(remote.length,2)
})
test('saved scores, tiebreaks and advancement use readable labels',()=>{
  const s={id:'s',name:'预赛',locked:false,players:[{id:'a',name:'名字',score:null,dxScore:null}]},before={eventId:'e',stages:[s]}
  assert.equal(describeChange('maimai-pro-tournament',before,{...before,stages:[{...s,players:[{...s.players[0],score:100}]}]}),'预赛 · 保存 1 人成绩')
  assert.equal(describeChange('maimai-pro-tournament',before,{...before,stages:[{...s,tiebreaks:[{}]}]}),'预赛 · 保存加赛成绩')
  assert.equal(describeChange('maimai-pro-tournament',before,{...before,stages:[{...s,locked:true}]}),'预赛 · 确认晋级')
})
