import test from 'node:test'
import assert from 'node:assert/strict'
import { titleParallax, capsuleDisplacement, orbScale } from '../src/lib/optics.ts'

test('title parallax uses viewport coordinates and stays bounded outside the window', () => {
  assert.deepEqual(titleParallax(500, 400, 1000, 800), { rx: -0, ry: 0, x: 0, y: 0 })
  assert.deepEqual(titleParallax(1000, 800, 1000, 800), { rx: -18, ry: 24, x: 30, y: 22 })
  assert.deepEqual(titleParallax(2000, 1600, 1000, 800), titleParallax(1000, 800, 1000, 800))
})
test('static refraction map is neutral at the center, bends at the rim, and caps memory', () => {
  const map = capsuleDisplacement(1024, 82)
  const at = (x, y) => [...map.pixels.slice((y * map.width + x) * 4, (y * map.width + x) * 4 + 4)]
  assert.deepEqual(at(256, 20), [128, 128, 128, 255])
  assert.ok(at(256, 0)[1] > 128)
  assert.ok(at(256, 40)[1] < 128)
  for (const [width, height] of [[7680, 2000], [100, 128], [0, 0]]) {
    const data = capsuleDisplacement(width, height)
    assert.ok(data.width <= 512 && data.height <= 96)
    assert.ok(data.pixels.length <= 512 * 96 * 4)
  }
})

test('background sphere enlarges near title/nav and smoothly shrinks elsewhere', () => {
  const regions = [{left:50,right:1000,top:20,bottom:100},{left:300,right:700,top:220,bottom:340}]
  assert.equal(orbScale(400,280,regions), 1)
  assert.equal(orbScale(800,60,regions), 1)
  assert.equal(orbScale(400,700,regions), .18)
  assert.equal(orbScale(400,280,[]), .18)
  const sizes = [376,396,416,436,456,476].map(y=>orbScale(400,y,regions))
  assert.ok(sizes.every((s,i)=>s>=.18 && s<=1 && (!i || s<=sizes[i-1])))
})
