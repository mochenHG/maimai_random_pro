import { create } from 'zustand'
import { load, save } from '../lib/storage'
import { CALLBOARD_KEY, emptyCallboard, validateCallboard, type Callboard } from '../lib/callboard'
function read(){try{return validateCallboard(load(CALLBOARD_KEY,emptyCallboard()))}catch{return emptyCallboard()}}
export const useCallboard=create<{data:Callboard}>(()=>({data:read()}))
export function setCallboard(edit:(current:Callboard)=>Callboard){const data=validateCallboard(edit(read()));if(!save(CALLBOARD_KEY,data))throw Error('叫号未保存，请重试。');useCallboard.setState({data})}
window.addEventListener('pro-remote',e=>{if((e as CustomEvent<string>).detail===CALLBOARD_KEY)useCallboard.setState({data:read()})})
