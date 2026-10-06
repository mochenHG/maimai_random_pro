import { useEffect, useRef } from 'react'

/** Animate only the changed score, without re-rendering the full ranking list. */
export default function OBSScore({ value }: { value: number | null }) {
  const output = useRef<HTMLSpanElement>(null)
  const previous = useRef(value)
  useEffect(() => {
    const element = output.current
    if (!element) return
    const from = previous.current
    previous.current = value
    if (value === null || from === null || matchMedia('(prefers-reduced-motion: reduce)').matches || document.hidden) {
      element.textContent = value === null ? '—' : value.toFixed(4)
      return
    }
    let frame = 0
    const start = performance.now()
    const tick = (time: number) => {
      const progress = Math.min(1, (time - start) / 320)
      element.textContent = (from + (value - from) * (1 - (1 - progress) ** 3)).toFixed(4)
      if (progress < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [value])
  return <span className="obs-score" ref={output} aria-label={value === null ? '未录入完成率' : `完成率 ${value}`} />
}
