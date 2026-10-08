import { useEffect, useId, useRef } from 'react'
import { mountGlassRenderer } from '../lib/glassRenderer'

/** React owns only the definitions root; the renderer handles bounded optical resources. */
export default function GlassEffects(){
  const defs=useRef<SVGDefsElement>(null),prefix=`liquid-${useId().replace(/:/g,'')}`
  useEffect(()=>defs.current?mountGlassRenderer(defs.current,prefix):undefined,[prefix])
  return <svg className="glass-filter-defs" aria-hidden="true" width="0" height="0"><defs ref={defs}/></svg>
}
