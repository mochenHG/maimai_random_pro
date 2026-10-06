import { useEffect, useRef, useState } from 'react'
export default function AnimatedCount({value}:{value:number}) {
  const [shown,setShown]=useState(value); const previous=useRef(0)
  useEffect(()=>{
    const from=previous.current; previous.current=value
    if(matchMedia('(prefers-reduced-motion: reduce)').matches){setShown(value);return}
    const start=performance.now();let frame=0
    const tick=(now:number)=>{const t=Math.min(1,(now-start)/420);setShown(Math.round(from+(value-from)*(1-(1-t)**3)));if(t<1)frame=requestAnimationFrame(tick)}
    frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame)
  },[value])
  return <span aria-label={value.toLocaleString()}>{shown.toLocaleString()}</span>
}
