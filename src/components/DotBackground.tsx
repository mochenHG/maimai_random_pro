import { useEffect, useRef } from 'react'
import { broadcastCanvasSize, dotGrid, rippleAt, RIPPLE_PERIOD, type RippleState } from '../lib/ripple'

/** One bounded canvas; pauses between waves and when the tab is hidden. */
export default function DotBackground({ active, broadcast=false }: { active: boolean; broadcast?:boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const pointer = useRef<{ x: number; y: number } | null>(null)
  useEffect(() => {
    const element = canvas.current
    const ctx = element?.getContext('2d')
    if (!element || !ctx) return
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    const constrained = navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4
    let frame = 0, timer: ReturnType<typeof setTimeout> | undefined
    let last: number | null = null, elapsed = 0, width = 0, height = 0, reach = 0
    let dark = document.documentElement.dataset.theme === 'dark'
    let grid = dotGrid(0, 0)
    let field: { x: number; y: number; distance: number; ux: number; uy: number; phase: number }[] = []
    let ripple: RippleState = { cycle: -1, center: pointer.current ?? { x: innerWidth / 2, y: innerHeight / 2 } }
    const capture = () => {
      const center = ripple.center
      reach = Math.hypot(Math.max(center.x, width - center.x), Math.max(center.y, height - center.y)) + 130
      field = grid.map(({ x, y }) => {
        const dx = x - center.x, dy = y - center.y, distance = Math.hypot(dx, dy)
        return { x, y, distance, ux: dx / Math.max(distance, 1), uy: dy / Math.max(distance, 1), phase: (x + y) * .025 }
      })
    }
    const draw = (time: number) => {
      frame = 0
      if (!active || reduced.matches || document.hidden || (broadcast&&constrained) || width<=0 || height<=0) { ctx.clearRect(0, 0, width, height); return }
      if (last !== null && time - last < (constrained ? 65 : 40)) { frame = requestAnimationFrame(draw); return }
      elapsed += last === null ? 0 : time - last
      last = time
      const cycle=Math.floor(elapsed/RIPPLE_PERIOD)
      const origin=broadcast?{x:width*(cycle%2?.76:.24),y:height*(cycle%2?.32:.64)}:pointer.current??{x:width/2,y:height/2}
      const pulse = rippleAt(elapsed, ripple, origin)
      if (pulse.state !== ripple) {
        ripple = pulse.state
        capture()
        element.dataset.rippleX = String(ripple.center.x)
        element.dataset.rippleY = String(ripple.center.y)
        element.dataset.rippleCycle = String(ripple.cycle)
      }
      ctx.clearRect(0, 0, width, height)
      if (!pulse.active) {
        // No animation-frame loop during the 1.4 second rest.
        timer = setTimeout(() => { frame = requestAnimationFrame(draw) }, RIPPLE_PERIOD - elapsed % RIPPLE_PERIOD)
        return
      }
      const radius = pulse.progress * reach
      const arrival = Math.min(elapsed / 300, 1) * pulse.fade
      ctx.fillStyle = dark ? '#ffffff' : broadcast ? '#101010' : '#181818'
      const phase = elapsed * Math.PI * 2 / RIPPLE_PERIOD
      for (const point of field) {
        const offset = point.distance - radius
        if (Math.abs(offset) > 230) continue
        const ring = Math.exp(-((offset / 85) ** 2)) * arrival
        const strength = ring * (.84 + .16 * Math.sin(phase + point.phase))
        if (strength < .01) continue
        const shift = Math.sin(offset / 50) * ring * 4
        ctx.globalAlpha = strength * (broadcast ? .94 : dark ? .72 : .78)
        ctx.beginPath()
        ctx.arc(point.x + point.ux * shift, point.y + point.uy * shift, broadcast ? 1.1 + strength * 1.9 : .9 + strength * 1.65, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
      frame = requestAnimationFrame(draw)
    }
    const resume = () => {
      cancelAnimationFrame(frame); clearTimeout(timer); frame = 0; last = null
      if (active && !reduced.matches && !document.hidden && !(broadcast&&constrained) && width>0 && height>0) frame = requestAnimationFrame(draw)
      else ctx.clearRect(0, 0, width, height)
    }
    const resize = () => {
      const bounds = element.getBoundingClientRect()
      width = bounds.width; height = bounds.height
      const scale = Math.min(devicePixelRatio || 1, constrained ? 1 : 1.25),size=broadcast?broadcastCanvasSize(width,height,scale):{width:Math.round(width*scale),height:Math.round(height*scale)}
      element.width = size.width; element.height = size.height
      ctx.setTransform(width?element.width/width:1, 0, 0, height?element.height/height:1, 0, 0)
      grid = dotGrid(width, height, broadcast?1200:constrained?1300:2200)
      element.dataset.dotCount = String(grid.length)
      capture(); resume()
    }
    const move = (event: PointerEvent) => { if (event.pointerType !== 'touch') pointer.current = { x: event.clientX, y: event.clientY } }
    const theme = new MutationObserver(() => { dark = document.documentElement.dataset.theme === 'dark' })
    theme.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] })
    if(!broadcast)document.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('visibilitychange', resume)
    reduced.addEventListener('change', resume)
    const observer=broadcast?new ResizeObserver(resize):null
    if(observer)observer.observe(element)
    else window.addEventListener('resize', resize)
    resize()
    return () => { cancelAnimationFrame(frame); clearTimeout(timer); theme.disconnect(); observer?.disconnect(); document.removeEventListener('pointermove', move); document.removeEventListener('visibilitychange', resume); reduced.removeEventListener('change', resume); window.removeEventListener('resize', resize) }
  }, [active,broadcast])
  return <div aria-hidden="true" className={`dot-background${active ? ' is-active' : ''}`}><canvas ref={canvas} /></div>
}
