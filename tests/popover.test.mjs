import test from 'node:test'
import assert from 'node:assert/strict'
import { placePopover, placeSelect } from '../src/lib/popover.ts'

test('OBS floating menus stay inside narrow viewports and flip above a low anchor', () => {
  assert.deepEqual(placePopover({top:300,bottom:342,right:1050},{width:360,height:190},{width:1098,height:1066}),{left:690,top:352})
  assert.deepEqual(placePopover({top:640,bottom:684,right:380},{width:358,height:190},{width:390,height:720}),{left:16,top:440})
  const p=placePopover({top:30,bottom:60,right:35},{width:288,height:260},{width:320,height:300})
  assert.deepEqual(p,{left:16,top:24})
})

test('select menus fit narrow screens, flip near the bottom and limit large trigger widths',()=>{
  const cases=[
    [{left:20,top:140,bottom:188,width:280,right:300},300,{width:390,height:720}],
    [{left:250,top:620,bottom:668,width:150,right:400},360,{width:390,height:720}],
    [{left:16,top:22,bottom:70,width:480,right:496},360,{width:320,height:300}],
    [{left:50,top:200,bottom:248,width:800,right:850},360,{width:1440,height:900}],
  ]
  for(const [anchor,height,viewport] of cases){const p=placeSelect(anchor,height,viewport);assert.ok(p.left>=16);assert.ok(p.top>=16);assert.ok(p.width<=420);assert.ok(p.maxHeight<=360);assert.ok(p.left+p.width<=viewport.width-16);assert.ok(p.top+p.maxHeight<=viewport.height-16)}
  const low=placeSelect(cases[1][0],360,cases[1][2]);assert.ok(low.top+low.maxHeight<=cases[1][0].top-8)
  assert.equal(placeSelect(cases[3][0],360,cases[3][2]).width,420)
})
