import { useSyncExternalStore } from 'react'
export interface Operation { id:string; key:string; category:string; label:string; time:number; actor:string; revision:number; canUndo:boolean; undone:boolean; undoOf?:string }
let items:Operation[]=[]
const listeners=new Set<()=>void>()
export function receiveOperations(value:Operation[]){items=value;listeners.forEach(fn=>fn())}
export function useOperations(){return useSyncExternalStore(fn=>{listeners.add(fn);return()=>{listeners.delete(fn)}},()=>items)}
