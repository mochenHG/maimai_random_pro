import test from 'node:test'
import assert from 'node:assert/strict'
import { dotGrid, rippleAt, RIPPLE_PERIOD, RIPPLE_EXPAND } from '../src/lib/ripple.ts'
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
