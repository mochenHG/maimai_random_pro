import { create } from 'zustand'
import { load, save } from '../lib/storage'
export const DIRECTOR_KEY='maimai-pro-director'
export interface DirectorState {scene:'standby'|'song'|'ranking'|'advance'|'raffle'|'callboard';title:string;endAt:number|null;hideScores:boolean}
export const directorDefault:DirectorState={scene:'standby',title:'赛事即将开始',endAt:null,hideScores:false}
export const useDirector=create<{data:DirectorState}>(()=>({data:load(DIRECTOR_KEY,directorDefault)}))
export function setDirector(patch:Partial<DirectorState>){const data={...useDirector.getState().data,...patch};if(save(DIRECTOR_KEY,data))useDirector.setState({data})}
window.addEventListener('pro-remote',e=>{if((e as CustomEvent<string>).detail===DIRECTOR_KEY)useDirector.setState({data:load(DIRECTOR_KEY,directorDefault)})})
