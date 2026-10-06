import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const palette=JSON.parse(readFileSync(new URL('../design/palette.json',import.meta.url),'utf8'))
const rgba=hex=>[1,3,5,7].map((i,k)=>k===3?hex.length===9?parseInt(hex.slice(i,i+2),16)/255:1:parseInt(hex.slice(i,i+2),16))
const composite=(front,back)=>front.slice(0,3).map((v,i)=>v*front[3]+back[i]*(1-front[3]))
const luminance=rgb=>rgb.slice(0,3).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((sum,v,i)=>sum+v*[.2126,.7152,.0722][i],0)
const contrast=(a,b)=>{const x=luminance(a),y=luminance(b);return (Math.max(x,y)+.05)/(Math.min(x,y)+.05)}
test('glass text stays readable over both a white sphere and a black scene',()=>{
  for(const mode of ['light','dark'])for(const token of ['lens-fill','lens-field','lens-menu'])for(const back of ['#ffffff','#000000',palette[mode].bg]){
    const plate=composite(rgba(palette[mode][token]),rgba(back))
    const glass=composite(rgba(palette[mode]['lens-wash']),plate)
    for(const fg of ['ink','muted'])assert.ok(contrast(rgba(palette[mode][fg]),glass)>=4.5,`${mode} ${token} ${fg}`)
  }
})
test('selected, primary, hovered and disabled controls use matched foregrounds',()=>{
  for(const mode of ['light','dark']){
    const p=palette[mode]
    for(const bg of ['primary-fill','primary-hover'])assert.ok(contrast(rgba(p['primary-ink']),rgba(p[bg]))>=4.5)
    assert.ok(contrast(rgba(p.muted),rgba(p['surface-alt']))>=4.5)
  }
})
