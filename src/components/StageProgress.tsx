import { useLayoutEffect, useRef } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import type { Stage } from '../types'
export default function StageProgress({ stages, current, onSelect }: { stages: Stage[]; current: string; onSelect: (id: string) => void }) {
  const scroll = useRef<HTMLElement>(null), strip = useRef<HTMLDivElement>(null)
  const activeIndex = Math.max(0, stages.findIndex(s => s.id === current))
  const completed = stages.filter(s => s.locked).length
  useLayoutEffect(() => {
    const holder = strip.current, viewport = scroll.current
    if (!holder || !viewport) return
    let ready = 0
    const measure = () => {
      const buttons = Array.from(holder.querySelectorAll<HTMLButtonElement>('.stage-step'))
      const button = buttons[activeIndex], first = buttons[0], last = buttons[buttons.length - 1]
      if (!button || !first || !last) return
      holder.style.setProperty('--active-x', `${button.offsetLeft}px`)
      holder.style.setProperty('--active-width', `${button.offsetWidth}px`)
      holder.style.setProperty('--track-start', `${first.offsetLeft + first.offsetWidth / 2}px`)
      holder.style.setProperty('--track-width', `${last.offsetLeft + last.offsetWidth / 2 - first.offsetLeft - first.offsetWidth / 2}px`)
      holder.style.setProperty('--completed-width', `${parseFloat(holder.style.getPropertyValue('--track-width')) * completed / Math.max(stages.length, 1)}px`)
      if (button.offsetLeft < viewport.scrollLeft || button.offsetLeft + button.offsetWidth > viewport.scrollLeft + viewport.clientWidth) viewport.scrollTo({ left: button.offsetLeft - (viewport.clientWidth - button.offsetWidth) / 2, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
    }
    measure()
    ready = requestAnimationFrame(() => holder.classList.add('is-ready'))
    const resize = new ResizeObserver(measure)
    resize.observe(holder)
    holder.querySelectorAll('.stage-step').forEach(button => resize.observe(button))
    return () => { cancelAnimationFrame(ready); resize.disconnect() }
  }, [activeIndex, completed, stages.length])
  const keyboard = (event: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === 'ArrowRight' ? Math.min(index + 1, stages.length - 1) : event.key === 'ArrowLeft' ? Math.max(index - 1, 0) : event.key === 'Home' ? 0 : event.key === 'End' ? stages.length - 1 : -1
    if (next < 0) return
    event.preventDefault(); onSelect(stages[next].id)
    strip.current?.querySelectorAll<HTMLButtonElement>('.stage-step')[next]?.focus({ preventScroll: true })
  }
  return <nav ref={scroll} className="stage-nav stage-progress-nav" aria-label="赛事阶段"><div ref={strip} className={`stage-progress-strip${completed === stages.length ? ' is-finished' : ''}`}>
    <span className="stage-active-pill" aria-hidden="true"/>
    {stages.map((s, i) => <button type="button" key={s.id} className={`stage-step${i === activeIndex ? ' selected' : ''}${s.locked ? ' is-complete' : ''}`} aria-current={i === activeIndex ? 'step' : undefined} tabIndex={i === activeIndex ? 0 : -1} onKeyDown={e => keyboard(e, i)} onClick={() => onSelect(s.id)}>{s.locked && <Check size={17} aria-label="已锁定"/>}{s.name}</button>)}
    <div className="stage-track" role="progressbar" aria-label="赛事完成进度" aria-valuemin={0} aria-valuemax={stages.length} aria-valuenow={completed} aria-valuetext={`${completed} / ${stages.length} 个阶段已完成`}><span className="stage-track-fill"/><span className="stage-track-traveler" aria-hidden="true"/></div>
    <span className="stage-pointer" aria-hidden="true"><ChevronDown size={19}/><span className="stage-pointer-halo"/><i/></span>
  </div></nav>
}
