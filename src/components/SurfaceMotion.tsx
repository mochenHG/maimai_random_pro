import { useEffect } from 'react'
import { orbScale, titleParallax } from '../lib/optics'
/** One pending pointer frame; background light, title motion and button feedback. No idle loop. */
export default function SurfaceMotion() {
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    let frame = 0, button: HTMLElement | null = null, hero: HTMLElement | null = null
    let latest: { target: Element; x: number; y: number } | null = null
    const resetHero = () => { if (hero) for (const key of ['--title-rx', '--title-ry', '--title-x', '--title-y', '--orb-x', '--orb-y', '--orb-radius']) hero.style.removeProperty(key) }
    const reset = () => { document.querySelector<HTMLElement>('.ambient-light')?.style.setProperty('--light-scale', '.18'); button?.style.removeProperty('--magnet-x'); button?.style.removeProperty('--magnet-y'); resetHero(); button = null; hero = null }
    const render = () => {
      frame = 0
      if (!latest || reduced.matches || document.hidden) { reset(); return }
      const light = document.querySelector<HTMLElement>('.ambient-light')
      const header = document.querySelector<HTMLElement>('.topbar')
      const nextHero = document.querySelector<HTMLElement>('.page-heading .title-optics')
      if (hero !== nextHero) { resetHero(); hero = nextHero }
      // The mask remains in screen space while both title copies share parallax.
      const titleBounds = hero?.getBoundingClientRect()
      const headerBounds = header?.getBoundingClientRect()
      const regions = [headerBounds, titleBounds].filter((r): r is DOMRect => !!r && r.bottom > 0 && r.top < innerHeight)
      const scale = orbScale(latest.x, latest.y, regions)
      if (light) {
        light.style.setProperty('--light-x', `${latest.x}px`)
        light.style.setProperty('--light-y', `${latest.y}px`)
        light.style.setProperty('--light-scale', `${scale}`)
        const radius = (light.querySelector<HTMLElement>('.ambient-source')?.offsetWidth || 240) * scale / 2
        const distance = titleBounds ? Math.hypot(Math.max(titleBounds.left - latest.x, 0, latest.x - titleBounds.right), Math.max(titleBounds.top - latest.y, 0, latest.y - titleBounds.bottom)) : Infinity
        light.style.setProperty('--title-contrast', `${Math.max(0, 1 - distance / radius)}`)
      }
      if (header && headerBounds) {
        header.style.setProperty('--glass-x', `${latest.x - headerBounds.left}px`)
        header.style.setProperty('--glass-y', `${latest.y - headerBounds.top}px`)
      }
      if (hero && titleBounds) {
        if (titleBounds.bottom > 0 && titleBounds.top < innerHeight) {
          const position = titleParallax(latest.x, latest.y, innerWidth, innerHeight)
          hero.style.setProperty('--title-rx', `${position.rx}deg`); hero.style.setProperty('--title-ry', `${position.ry}deg`)
          hero.style.setProperty('--title-x', `${position.x}px`); hero.style.setProperty('--title-y', `${position.y}px`)
          const radius = (light?.querySelector<HTMLElement>('.ambient-source')?.offsetWidth || 240) * scale / 2
          hero.style.setProperty('--orb-x', `${latest.x - titleBounds.left + 160}px`)
          hero.style.setProperty('--orb-y', `${latest.y - titleBounds.top + 160}px`)
          hero.style.setProperty('--orb-radius', `${radius}px`)
        } else hero.style.setProperty('--orb-radius', '0px')
      }
      const nextButton = latest.target.closest<HTMLElement>('button.primary:not(:disabled)')
      if (button !== nextButton) { button?.style.removeProperty('--magnet-x'); button?.style.removeProperty('--magnet-y') }
      button = nextButton
      if (button) { const r = button.getBoundingClientRect(); button.style.setProperty('--magnet-x', `${Math.max(-4, Math.min(4, (latest.x - r.left - r.width / 2) * .07))}px`); button.style.setProperty('--magnet-y', `${Math.max(-3, Math.min(3, (latest.y - r.top - r.height / 2) * .1))}px`) }
    }
    const move = (e: PointerEvent) => { if (e.pointerType !== 'mouse' || !(e.target instanceof Element)) return; latest = { target: e.target, x: e.clientX, y: e.clientY }; if (!frame) frame = requestAnimationFrame(render) }
    const schedule = () => { if (latest && !frame) frame = requestAnimationFrame(render) }
    const leave = () => { cancelAnimationFrame(frame); frame = 0; latest = null; reset() }
    window.addEventListener('scroll', schedule, { passive: true, capture: true })
    window.addEventListener('resize', schedule, { passive: true })
    document.addEventListener('pointermove', move, { passive: true })
    document.addEventListener('pointerleave', leave)
    document.addEventListener('visibilitychange', leave)
    reduced.addEventListener('change', leave)
    return () => { leave(); window.removeEventListener('scroll', schedule, true); window.removeEventListener('resize', schedule); document.removeEventListener('pointermove', move); document.removeEventListener('pointerleave', leave); document.removeEventListener('visibilitychange', leave); reduced.removeEventListener('change', leave) }
  }, [])
  return null
}
