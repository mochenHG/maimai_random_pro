export type Point = { x: number; y: number }
export type RippleState = { cycle: number; center: Point }
export const RIPPLE_PERIOD = 4400
export const RIPPLE_EXPAND = 3000
/** Broadcast canvas allocation is capped even at 8K or high pixel density. */
export function broadcastCanvasSize(width:number,height:number,dpr:number) {
  if(!Number.isFinite(width)||!Number.isFinite(height)||width<=0||height<=0)return {width:0,height:0,scale:1}
  const scale=Math.min(Number.isFinite(dpr)&&dpr>0?dpr:1,1.25,Math.sqrt(1_600_000/(width*height)))
  return {width:Math.floor(width*scale),height:Math.floor(height*scale),scale}
}
/** Static grid capped independently of viewport size or pixel density. */
export function dotGrid(width: number, height: number, budget = 2200) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || budget < 1) return []
  const spacing = Math.max(23, Math.sqrt(width * height / Math.floor(budget)))
  const columns = Math.floor(width / spacing), rows = Math.floor(height / spacing)
  return Array.from({ length: columns * rows }, (_, i) => ({ x: 12 + i % columns * spacing, y: 12 + Math.floor(i / columns) * spacing }))
}
/** Capture the origin once per pulse; mouse movement never drags a live ring. */
export function rippleAt(elapsed: number, previous: RippleState, pointer: Point) {
  const cycle = Math.floor(elapsed / RIPPLE_PERIOD)
  const state = cycle === previous.cycle ? previous : { cycle, center: { ...pointer } }
  const phase = elapsed % RIPPLE_PERIOD
  return { state, progress: Math.min(phase / RIPPLE_EXPAND, 1), active: phase < RIPPLE_EXPAND, fade: Math.min(1, Math.max(0, (RIPPLE_EXPAND - phase) / 400)) }
}
