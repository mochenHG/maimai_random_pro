import { useEffect, useId, useRef } from 'react'
import { glassDisplacement } from '../lib/glass'

const surfaces = '.topbar,.app-frame .panel,.app-frame .empty,.result-empty,.stage-progress-nav,.stage-dialog,.select-popover,.obs-popover,.launcher-window'
const ns = 'http://www.w3.org/2000/svg'

/** One observer pool, no scene snapshots and no continuously running render loop. */
export default function GlassEffects() {
  const defs = useRef<SVGDefsElement>(null)
  const prefix = `liquid-${useId().replace(/:/g, '')}`
  useEffect(() => {
    if (!defs.current) return
    const container = defs.current
    const targets = new Set<HTMLElement>(), visible = new Set<HTMLElement>()
    const filters = new Map<string, { id: string; node: SVGFilterElement }>()
    const small = matchMedia('(max-width:760px), (pointer:coarse), (prefers-reduced-transparency:reduce)')
    const lite = navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4
    let frame = 0, serial = 0
    const clear = (el: HTMLElement) => {
      el.removeAttribute('data-glass-optics'); el.style.removeProperty('--refraction')
    }
    const paint = () => {
      frame = 0
      let area = 0, count = 0
      const active = new Set<string>()
      // Small floating surfaces take priority over large background panels.
      const candidates = [...visible].sort((a,b) => Number(b.matches('.topbar,.stage-dialog,.select-popover,.obs-popover')) - Number(a.matches('.topbar,.stage-dialog,.select-popover,.obs-popover')))
      for (const el of candidates) {
        const width = el.clientWidth, height = el.clientHeight
        if (small.matches || lite || document.hidden || width < 1 || height < 1 || height > 1800 || count >= 6 || area + width * height > 1_600_000) { clear(el); continue }
        const radius = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 24, width / 2, height / 2)
        const key = `${width}:${height}:${radius}`
        let filter = filters.get(key)
        if (!filter) {
          const data = glassDisplacement(width, height, radius)
          const canvas = document.createElement('canvas')
          canvas.width = data.width; canvas.height = data.height
          const context = canvas.getContext('2d')
          if (!context) { clear(el); continue }
          context.putImageData(new ImageData(data.pixels, data.width, data.height), 0, 0)
          const node = document.createElementNS(ns, 'filter'), image = document.createElementNS(ns, 'feImage'), displacement = document.createElementNS(ns, 'feDisplacementMap')
          const id = `${prefix}-${++serial}`
          node.id = id
          for (const [name,value] of Object.entries({ x:'0', y:'0', width:'100%', height:'100%', 'color-interpolation-filters':'sRGB' })) node.setAttribute(name,value)
          for (const [name,value] of Object.entries({ href:canvas.toDataURL(), result:'normal', x:'0', y:'0', width:'100%', height:'100%', preserveAspectRatio:'none' })) image.setAttribute(name,value)
          for (const [name,value] of Object.entries({ in:'SourceGraphic', in2:'normal', scale:el.matches('.topbar')?'28':'26', xChannelSelector:'R', yChannelSelector:'G' })) displacement.setAttribute(name,value)
          node.append(image, displacement); container.append(node)
          filter = { id, node }; filters.set(key, filter)
        }
        active.add(key); count++; area += width * height
        const value = `url(#${filter.id})`
        if (el.style.getPropertyValue('--refraction') !== value) el.style.setProperty('--refraction', value)
        if (!el.hasAttribute('data-glass-optics')) el.setAttribute('data-glass-optics', '')
      }
      // Maps for offscreen/removed shapes are released, keeping at most six maps.
      for (const [key,filter] of filters) if (!active.has(key)) { filter.node.remove(); filters.delete(key) }
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(paint) }
    const resize = new ResizeObserver(schedule)
    const intersection = new IntersectionObserver(entries => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement
        if (entry.isIntersecting) visible.add(el)
        else { visible.delete(el); clear(el) }
      }
      schedule()
    })
    const discover = () => {
      for (const el of targets) if (!el.isConnected) { resize.unobserve(el); intersection.unobserve(el); targets.delete(el); visible.delete(el); clear(el) }
      document.querySelectorAll<HTMLElement>(surfaces).forEach(el => {
        if (targets.has(el)) return
        targets.add(el); resize.observe(el); intersection.observe(el)
      })
      schedule()
    }
    const mutation = new MutationObserver(records => {
      if (records.some(r => [...r.addedNodes,...r.removedNodes].some(n => n instanceof Element && n.namespaceURI !== ns))) discover()
    })
    mutation.observe(document.body, {childList:true, subtree:true})
    small.addEventListener('change',schedule); document.addEventListener('visibilitychange',schedule)
    discover()
    return () => {
      cancelAnimationFrame(frame); mutation.disconnect(); resize.disconnect(); intersection.disconnect()
      small.removeEventListener('change',schedule); document.removeEventListener('visibilitychange',schedule)
      targets.forEach(clear); container.replaceChildren()
    }
  }, [prefix])
  return <svg className="glass-filter-defs" aria-hidden="true" width="0" height="0"><defs ref={defs}/></svg>
}
