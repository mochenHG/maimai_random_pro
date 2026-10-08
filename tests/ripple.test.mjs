import test from 'node:test'
import assert from 'node:assert/strict'
import { broadcastCanvasSize, dotGrid, rippleAt, RIPPLE_PERIOD, RIPPLE_EXPAND } from '../src/lib/ripple.ts'
test('a live ripple stays at its captured origin and the next pulse captures the latest pointer', () => {
  const first = rippleAt(0, { cycle: -1, center: { x: 0, y: 0 } }, { x: 100, y: 200 })
  const moving = rippleAt(1200, first.state, { x: 800, y: 500 })
  assert.strictEqual(moving.state, first.state)
  assert.deepEqual(moving.state.center, { x: 100, y: 200 })
  const next = rippleAt(RIPPLE_PERIOD, moving.state, { x: 800, y: 500 })
  assert.deepEqual(next.state.center, { x: 800, y: 500 })
})
test('dot density stays bounded from phone to ultrawide and 8K displays', () => {
  for (const [width, height] of [[390, 844], [1920, 1080], [7680, 4320], [16000, 900]]) {
    for (const budget of [1300, 2200]) {
      const grid = dotGrid(width, height, budget)
      assert.ok(grid.length > 0 && grid.length <= budget)
      assert.ok(grid.every(p => p.x >= 0 && p.x < width && p.y >= 0 && p.y < height))
    }
  }
  assert.deepEqual(dotGrid(0, 0), [])
})
test('the wave expands monotonically, fades and rests before repeating', () => {
  const initial = { cycle: 0, center: { x: 100, y: 200 } }
  assert.equal(rippleAt(1500, initial, initial.center).progress, .5)
  assert.equal(rippleAt(RIPPLE_EXPAND, initial, initial.center).active, false)
  assert.equal(rippleAt(RIPPLE_EXPAND + 500, initial, initial.center).fade, 0)
  assert.equal(rippleAt(RIPPLE_PERIOD, initial, initial.center).progress, 0)
})
test('OBS wave canvas stays below 1.6 million pixels and 1200 dots across large sources',()=>{
  for(const [width,height,dpr] of [[390,844,3],[1920,1080,2],[7680,4320,4],[16000,900,2]]){
    const size=broadcastCanvasSize(width,height,dpr)
    assert.ok(size.width*size.height<=1_600_000)
    assert.ok(size.scale>0&&size.scale<=1.25)
    assert.ok(dotGrid(width,height,1200).length<=1200)
  }
  assert.equal(broadcastCanvasSize(0,10,2).width,0)
  assert.equal(broadcastCanvasSize(Infinity,10,2).height,0)
  assert.equal(broadcastCanvasSize(100,100,NaN).scale,1)
})
