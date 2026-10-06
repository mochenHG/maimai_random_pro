import test from 'node:test'
import assert from 'node:assert/strict'
import { glassDisplacement } from '../src/lib/glass.ts'

test('convex glass has an undistorted center and opposite normals at each edge', () => {
  const map = glassDisplacement(200, 100, 24)
  const at = (x,y) => [...map.pixels.slice((y*map.width+x)*4,(y*map.width+x)*4+4)]
  assert.deepEqual(at(100,50),[128,128,128,255])
  assert.ok(at(0,50)[0]>128 && at(199,50)[0]<128)
  assert.ok(at(100,0)[1]>128 && at(100,99)[1]<128)
  assert.ok(at(9,9)[0]>128 && at(9,9)[1]>128)
  assert.ok(Math.abs(at(0,50)[0]+at(199,50)[0]-256)<=1)
})
test('ultrawide and tall surfaces cannot allocate unbounded normal maps', () => {
  for (const [w,h,r] of [[7680,4320,80],[1200,1800,28],[0,0,24],[42,42,999]]) {
    const map=glassDisplacement(w,h,r)
    assert.ok(map.width<=384 && map.height<=256)
    assert.equal(map.pixels.length,map.width*map.height*4)
    assert.ok(map.pixels.length<=384*256*4)
    assert.ok([...map.pixels].every(Number.isFinite))
  }
})
