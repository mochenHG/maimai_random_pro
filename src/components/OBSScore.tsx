import { useLayoutEffect, useRef } from 'react'
import { iconFrames } from '../lib/frameScheduler'

/** Animate only the changed score, without re-rendering the full ranking list. */
export default function OBSScore({ value }: { value: number | null }) {
  const output = useRef<HTMLSpanElement>(null)
  const displayed = useRef(value)
  const initial = useRef(value === null ? '—' : value.toFixed(4))
  useLayoutEffect(() => {
    const element = output.current
    if (!element) return
    const from = displayed.current, reduced = matchMedia('(prefers-reduced-motion: reduce)')
    let cancel = () => {}
    const settle = () => {
      cancel(); displayed.current = value
      element.textContent = value === null ? '—' : value.toFixed(4)
    }
    if (value === null || from === null || value === from || reduced.matches || document.hidden) settle()
    else cancel = iconFrames.start(progress => {
      displayed.current = from + (value - from) * (1 - (1 - progress) ** 3)
      element.textContent = displayed.current.toFixed(4)
    }, settle, 420)
    const finish = () => { if (reduced.matches || document.hidden) settle() }
    reduced.addEventListener('change', finish); document.addEventListener('visibilitychange', finish)
    return () => {
      cancel(); reduced.removeEventListener('change', finish); document.removeEventListener('visibilitychange', finish)
    }
  }, [value])
  return <span className="obs-score" ref={output} aria-label={value === null ? '未录入完成率' : `完成率 ${value}`}>{initial.current}</span>
}
