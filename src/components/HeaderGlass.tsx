import { useEffect, useId, useRef, useState } from 'react'
import { capsuleDisplacement } from '../lib/optics'

export default function HeaderGlass() {
  const id = `header-glass-${useId().replace(/:/g, '')}`
  const layer = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState('')
  useEffect(() => {
    const header = layer.current?.parentElement
    if (!header) return
    let frame = 0, previous = ''
    const resize = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const key = `${header.clientWidth}:${header.clientHeight}`
        if (key === previous) return
        previous = key
        const data = capsuleDisplacement(header.clientWidth, header.clientHeight)
        const canvas = document.createElement('canvas')
        canvas.width = data.width; canvas.height = data.height
        const ctx = canvas.getContext('2d')
        if (!ctx) return
        ctx.putImageData(new ImageData(data.pixels, data.width, data.height), 0, 0)
        setMap(canvas.toDataURL())
      })
    }
    const observer = new ResizeObserver(resize)
    observer.observe(header); resize()
    return () => { observer.disconnect(); cancelAnimationFrame(frame) }
  }, [])
  return <>
    <svg className="glass-filter-defs" aria-hidden="true" width="0" height="0"><defs><filter id={id} x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
      <feImage href={map || undefined} result="capsule-map" preserveAspectRatio="none" x="0" y="0" width="100%" height="100%"/>
      <feDisplacementMap in="SourceGraphic" in2="capsule-map" scale="22" xChannelSelector="R" yChannelSelector="G"/>
    </filter></defs></svg>
    <div ref={layer} className={`header-refraction${map ? ' is-ready' : ''}`} style={{'--header-filter':`url(#${id})`} as React.CSSProperties} aria-hidden="true"/>
    <div className="header-prism" aria-hidden="true"/>
  </>
}
