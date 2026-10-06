type Anchor = { top: number; bottom: number; right: number }
type Size = { width: number; height: number }
/** Fixed viewport coordinates, clamped with a safe margin on every side. */
export function placePopover(anchor: Anchor, panel: Size, viewport: Size) {
  const margin = 16, gap = 10
  const left = Math.max(margin, Math.min(anchor.right - panel.width, viewport.width - panel.width - margin))
  const below = anchor.bottom + gap, above = anchor.top - panel.height - gap
  const top = below + panel.height <= viewport.height - margin ? below : above >= margin ? above : Math.max(margin, viewport.height - panel.height - margin)
  return { left, top }
}
