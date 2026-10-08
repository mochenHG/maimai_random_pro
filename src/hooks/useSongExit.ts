import { useLayoutEffect, useRef, useState } from 'react'
import type { Song } from '../types'
import { createExitSwap, type ExitView } from '../lib/exitSwap'

export function useSongExit(songs:Song[],revision:number) {
  const key=JSON.stringify([revision,songs]),initial=useRef({songs,key})
  const [view,setView]=useState<ExitView<Song[]>>(()=>({value:songs,key,generation:0,leaving:false,enter:true}))
  const controller=useRef<ReturnType<typeof createExitSwap<Song[]>>|null>(null)
  useLayoutEffect(()=>{
    const swap=createExitSwap(initial.current.songs,initial.current.key,setView,{schedule:(finish,delay)=>{const timer=setTimeout(finish,delay);return()=>clearTimeout(timer)}})
    controller.current=swap
    const reduced=matchMedia('(prefers-reduced-motion: reduce)')
    const finish=()=>{if(document.hidden||reduced.matches)swap.finish(false)}
    finish()
    reduced.addEventListener('change',finish);document.addEventListener('visibilitychange',finish)
    return()=>{swap.dispose();controller.current=null;reduced.removeEventListener('change',finish);document.removeEventListener('visibilitychange',finish)}
  },[])
  useLayoutEffect(()=>{
    const swap=controller.current
    if(!swap)return
    swap.update(songs,key,!!swap.view.value.length&&!document.hidden&&!matchMedia('(prefers-reduced-motion: reduce)').matches)
  },[songs,key])
  return view
}
