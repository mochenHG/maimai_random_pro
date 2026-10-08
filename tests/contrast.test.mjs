import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const palette=JSON.parse(readFileSync(new URL('../design/palette.json',import.meta.url),'utf8'))
const difficulties=JSON.parse(readFileSync(new URL('../design/difficulty-colors.json',import.meta.url),'utf8'))
const statusCSS=readFileSync(new URL('../src/result-status.css',import.meta.url),'utf8')
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

test('new optical surfaces retain readable text under the strongest rim-light layers',()=>{
  const modes=[palette.light,palette.dark]
  for(const [i,mode] of ['light','dark'].entries())for(const back of ['#ffffff','#000000'])for(const plate of ['glass-plate','glass-menu-plate']){
    const fill=composite(rgba(modes[i][plate]),rgba(back))
    const sheen=composite(rgba(modes[i]['glass-wash']),composite(rgba(modes[i]['glass-luster']),fill))
    for(const foreground of ['ink','muted'])assert.ok(contrast(rgba(palette[mode][foreground]),sheen)>=4.5,`${mode} ${plate} ${foreground}`)
  }
})

test('shared UI palette is grayscale, with major plates below 67 percent opacity',()=>{
  for(const mode of ['light','dark']){
    for(const [token,color] of Object.entries(palette[mode])){const channels=rgba(color);assert.equal(channels[0],channels[1],`${mode} ${token}`);assert.equal(channels[1],channels[2],`${mode} ${token}`)}
    assert.ok(rgba(palette[mode]['glass-plate'])[3]<=.67)
  }
})

test('OBS standby text retains contrast with the local emissive sphere and glass wash',()=>{
  for(const mode of ['light','dark'])for(const back of ['#ffffff','#000000']){
    const p=palette[mode]
    let fill=composite(rgba(p['glass-plate']),rgba(back))
    fill=composite(rgba(p['glass-wash']),composite(rgba(p['glass-luster']),fill))
    const inset=rgba(p['glass-plate']);inset[3]*=.25
    fill=composite(inset,fill)
    const orb=rgba('#ffffffc0');orb[3]*=mode==='dark'?.1:.28
    fill=composite(orb,fill)
    for(const foreground of ['ink','muted'])assert.ok(contrast(rgba(p[foreground]),fill)>=4.5,`${mode} OBS standby ${foreground}`)
  }
})

test('all six difficulty labels retain readable semantic colors on opaque selected fills',()=>{
  assert.deepEqual(Object.keys(difficulties),['BASIC','ADVANCED','EXPERT','MASTER','ReMASTER','UTAGE'])
  for(const [name,colors] of Object.entries(difficulties)){
    assert.equal(rgba(colors.fill)[3],1)
    assert.ok(contrast(rgba(colors.ink),rgba(colors.fill))>=4.5,`${name} difficulty label`)
  }
})

test('confirmed pass and fail badges retain readable labels in both themes',()=>{
  const blocks=[...statusCSS.matchAll(/:root(?:\[data-theme=dark\])?\{([^}]+)\}/g)]
  assert.equal(blocks.length,2)
  for(const [i,block] of blocks.entries()){
    const tokens=Object.fromEntries([...block[1].matchAll(/--result-([\w-]+):(#[0-9a-f]{6})/g)].map(m=>[m[1],m[2]]))
    for(const state of ['pass','fail'])assert.ok(contrast(rgba(tokens[`${state}-ink`]),rgba(tokens[`${state}-fill`]))>=4.5,`${i?'dark':'light'} ${state} label`)
    assert.notEqual(tokens['pass-fill'],tokens['fail-fill'])
  }
})
