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

/** Match the field width where possible and keep long option lists inside the viewport. */
export function placeSelect(anchor: Anchor & {left:number;width:number}, desiredHeight:number, viewport:Size){
  const margin=16,gap=8
  const width=Math.min(Math.max(anchor.width,220),420,Math.max(0,viewport.width-margin*2))
  const below=Math.max(0,viewport.height-margin-anchor.bottom-gap),above=Math.max(0,anchor.top-margin-gap)
  const flip=below<Math.min(desiredHeight,180)&&above>below
  const maxHeight=Math.max(0,Math.min(desiredHeight,flip?above:below,360))
  const left=Math.max(margin,Math.min(anchor.left,viewport.width-width-margin))
  const top=flip?Math.max(margin,anchor.top-gap-maxHeight):Math.max(margin,Math.min(anchor.bottom+gap,viewport.height-margin-maxHeight))
  return {left,top,width,maxHeight}
}
