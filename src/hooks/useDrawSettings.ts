import { useEffect, useState } from 'react'
import { DIFFICULTIES, type Difficulty } from '../types'
import { load, save } from '../lib/storage'
import { MAX_CONSTANT, normalizeConstantRange, normalizeGradeRange } from '../lib/range'
interface Settings { poolId: string; difficulties: Difficulty[]; type: string; min: string; max: string; count: number; rangeMode:'level'|'constant'; constantMin:number; constantMax:number }
const defaults: Settings = {poolId:'all',difficulties:[...DIFFICULTIES],type:'all',min:'1',max:'15',count:2,rangeMode:'level',constantMin:1,constantMax:MAX_CONSTANT}
export function useDrawSettings() {
  const [settings,setSettings]=useState<Settings>(()=> {
    const data=load<Partial<Settings>>('maimai-pro-filters',{})
    return {poolId:typeof data.poolId==='string' ? data.poolId : defaults.poolId,difficulties:Array.isArray(data.difficulties) ? data.difficulties.filter(d=>DIFFICULTIES.includes(d)) : defaults.difficulties,type:['all','dx','standard'].includes(data.type || '') ? data.type! : defaults.type,count:[1,2,3,4].includes(data.count || 0) ? data.count! : defaults.count,rangeMode:data.rangeMode==='constant'?'constant':'level',...normalizeConstantRange(data.constantMin,data.constantMax),...normalizeGradeRange(data.min,data.max)}
  })
  useEffect(()=>{const receive=(e:Event)=>{if((e as CustomEvent<string>).detail==='maimai-pro-filters')setSettings(load('maimai-pro-filters',defaults))};window.addEventListener('pro-remote',receive);return()=>window.removeEventListener('pro-remote',receive)},[])
  const patch=(values:Partial<Settings>)=>{const next={...settings,...values};if(save('maimai-pro-filters',next))setSettings(next)}
  const update = <K extends keyof Settings>(key: K, value: Settings[K]) => patch({[key]:value})
  return {settings,update,patch}
}
