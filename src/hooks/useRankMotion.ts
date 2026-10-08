import { useEffect, useLayoutEffect, useRef, type RefObject } from 'react'

/** Stable player keys move from their current visible position. Measurements are
    relative to the list, so scrolling the control page never creates a false move. */
export function useRankMotion<T extends HTMLElement>(list:RefObject<T>,revision:string,scope:string) {
  const positions=useRef(new Map<string,{top:number;left:number}>()),animations=useRef(new Map<string,Animation>()),previousScope=useRef(scope)
  useLayoutEffect(()=>{
    const root=list.current
    if(!root)return
    if(previousScope.current!==scope){positions.current.clear();animations.current.forEach(animation=>animation.cancel());animations.current.clear()}
    previousScope.current=scope
    const next=new Map<string,{top:number;left:number}>(),base=root.getBoundingClientRect(),reduced=matchMedia('(prefers-reduced-motion: reduce)').matches
    root.querySelectorAll<HTMLElement>('[data-player-id]').forEach(element=>{
      const id=element.dataset.playerId!,previous=positions.current.get(id),running=animations.current.get(id)
      const transform=running?getComputedStyle(element).transform:'none',matrix=transform==='none'?null:new DOMMatrix(transform)
      running?.cancel();animations.current.delete(id)
      const box=element.getBoundingClientRect(),top=box.top-base.top,left=box.left-base.left
      next.set(id,{top,left})
      const dx=previous?previous.left+(matrix?.m41??0)-left:0,dy=previous?previous.top+(matrix?.m42??0)-top:0
      if((Math.abs(dx)>.5||Math.abs(dy)>.5)&&!reduced&&!document.hidden&&box.bottom>0&&box.top<innerHeight&&typeof element.animate==='function'){
        const animation=element.animate([{transform:`translate(${dx}px,${dy}px)`},{transform:'translate(0,0)'}],{duration:560,easing:'cubic-bezier(.16,1,.3,1)'})
        animations.current.set(id,animation)
        void animation.finished.then(()=>{if(animations.current.get(id)===animation)animations.current.delete(id)}).catch(()=>{})
      }
    })
    for(const [id,animation] of animations.current)if(!next.has(id)){animation.cancel();animations.current.delete(id)}
    positions.current=next
  },[list,revision,scope])
  useEffect(()=>{
    const running=animations.current,reduced=matchMedia('(prefers-reduced-motion: reduce)')
    const finish=()=>{if(document.hidden||reduced.matches){running.forEach(animation=>animation.cancel());running.clear()}}
    document.addEventListener('visibilitychange',finish);reduced.addEventListener('change',finish)
    return()=>{running.forEach(animation=>animation.cancel());running.clear();document.removeEventListener('visibilitychange',finish);reduced.removeEventListener('change',finish)}
  },[])
}
