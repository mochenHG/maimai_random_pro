import test from 'node:test'
import assert from 'node:assert/strict'
import { chooseGlassSurfaces, glassGeometry, GLASS_LIMITS } from '../src/lib/glassPolicy.ts'

const surface=(target,width=600,height=350,priority=0)=>({target,width,height,radius:28,priority})
test('glass chooses at most six real surfaces and never exceeds its CSS pixel budget',()=>{
  const selected=chooseGlassSurfaces(Array.from({length:20},(_,i)=>surface(i)))
  assert.equal(selected.length,6);assert.ok(selected.reduce((n,s)=>n+s.width*s.height,0)<=GLASS_LIMITS.area)
  const large=chooseGlassSurfaces([surface('large',1400,1000),surface('another',1000,1000),surface('small',400,100)])
  assert.deepEqual(large.map(s=>s.target),['large','small'])
})
test('header and menus win priority, invalid and oversized surfaces are ignored',()=>{
  const selected=chooseGlassSurfaces([...Array.from({length:8},(_,i)=>surface(i)),surface('header',1100,82,1),surface('menu',360,280,2),surface('tall',100,2000,3),surface('invalid',NaN,100,3)])
  assert.deepEqual(selected.slice(0,2).map(s=>s.target),['menu','header']);assert.ok(!selected.some(s=>s.target==='tall'||s.target==='invalid'))
})
test('subpixel geometry changes reuse the same lens and radius is kept inside the surface',()=>{
  assert.equal(glassGeometry(640,320,28).key,glassGeometry(640.4,319.8,28.2).key)
  assert.notEqual(glassGeometry(640,320,28).key,glassGeometry(680,320,28).key)
  const tiny=glassGeometry(10,8,100);assert.ok(tiny.radius<=tiny.width/2);assert.ok(tiny.radius<=tiny.height/2)
})
