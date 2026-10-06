import test from 'node:test'
import assert from 'node:assert/strict'
import { placePopover } from '../src/lib/popover.ts'

test('OBS floating menus stay inside narrow viewports and flip above a low anchor', () => {
  assert.deepEqual(placePopover({top:300,bottom:342,right:1050},{width:360,height:190},{width:1098,height:1066}),{left:690,top:352})
  assert.deepEqual(placePopover({top:640,bottom:684,right:380},{width:358,height:190},{width:390,height:720}),{left:16,top:440})
  const p=placePopover({top:30,bottom:60,right:35},{width:288,height:260},{width:320,height:300})
  assert.deepEqual(p,{left:16,top:24})
})
