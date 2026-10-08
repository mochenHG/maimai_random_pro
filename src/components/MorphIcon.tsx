import { useLayoutEffect, useRef } from 'react'
import { canonicalIcon, ICON_STROKES, interpolateIcon, sampleIcon, strokePath, type MorphName } from '../lib/iconMorph'
import { iconFrames } from '../lib/frameScheduler'

/** A state change morphs strokes once. Hidden/reduced-motion views settle at once;
    interruption starts at the displayed shape and unmount cancels its shared job. */
export default function MorphIcon({name,size=18}:{name:MorphName;size?:number}){
  const paths=useRef<(SVGPathElement|null)[]>([]),current=useRef(sampleIcon(name)),previous=useRef(name)
  useLayoutEffect(()=>{
    const target=sampleIcon(name),canonical=canonicalIcon(name),reduced=matchMedia('(prefers-reduced-motion: reduce)')
    let cancel=()=>{}
    const settle=()=>{
      cancel();current.current=target
      canonical.forEach((stroke,i)=>{paths.current[i]?.setAttribute('d',stroke.d);paths.current[i]?.setAttribute('opacity',String(stroke.opacity))})
    }
    if(previous.current===name || reduced.matches || document.hidden)settle()
    else{
      const from=current.current
      cancel=iconFrames.start(progress=>{
        current.current=interpolateIcon(from,target,1-(1-progress)**3)
        current.current.forEach((stroke,i)=>{paths.current[i]?.setAttribute('d',strokePath(stroke.points));paths.current[i]?.setAttribute('opacity',String(stroke.opacity))})
      },settle)
    }
    previous.current=name
    const finish=()=>{if(reduced.matches||document.hidden)settle()}
    reduced.addEventListener('change',finish);document.addEventListener('visibilitychange',finish)
    return()=>{cancel();reduced.removeEventListener('change',finish);document.removeEventListener('visibilitychange',finish)}
  },[name])
  // Paths are owned by the transition, not rewritten by unrelated React renders.
  return <svg className="morph-icon" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">{Array.from({length:ICON_STROKES},(_,i)=><path key={i} ref={path=>{paths.current[i]=path}}/>)}</svg>
}
