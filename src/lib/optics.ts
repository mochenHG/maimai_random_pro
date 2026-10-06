/** Viewport-relative motion, independent of the title's moving bounds. */
export function titleParallax(x: number, y: number, width: number, height: number) {
  const dx = Math.max(-1, Math.min(1, x / Math.max(1, width) * 2 - 1))
  const dy = Math.max(-1, Math.min(1, y / Math.max(1, height) * 2 - 1))
  return { rx: -dy * 18, ry: dx * 24, x: dx * 30, y: dy * 22 }
}

/** Static capsule normals: at most 512 × 96 pixels, regenerated only on resize. */
export function capsuleDisplacement(width: number, height: number) {
  const w = Math.max(1, Math.min(512, Math.round(width)))
  const h = Math.max(1, Math.min(96, Math.round(height * w / Math.max(1, width))))
  const pixels = new Uint8ClampedArray(w * h * 4)
  const r = h / 2, halfLine = Math.max(0, w / 2 - r)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const px = x + .5 - w / 2, py = y + .5 - r
    const nearest = Math.max(-halfLine, Math.min(halfLine, px))
    const nx = px - nearest, length = Math.hypot(nx, py)
    const edge = r - length
    const strength = edge >= 0 ? Math.max(0, 1 - edge / Math.max(3, h * .2)) ** 2 : 0
    const i = (y * w + x) * 4
    pixels[i] = 128 - (length ? nx / length : 0) * strength * 105
    pixels[i + 1] = 128 - (length ? py / length : 0) * strength * 105
    pixels[i + 2] = 128; pixels[i + 3] = 255
  }
  return { width: w, height: h, pixels }
}

export interface OrbRegion { left: number; right: number; top: number; bottom: number }
/** Enlarge near navigation/title; ease down to a 43px ball elsewhere. */
export function orbScale(x: number, y: number, regions: OrbRegion[]) {
  const distance = Math.min(...regions.map(r => Math.hypot(Math.max(r.left - x, 0, x - r.right), Math.max(r.top - y, 0, y - r.bottom))))
  const t = Math.max(0, Math.min(1, (distance - 36) / 100))
  return .18 + .82 * (1 - t * t * (3 - 2 * t))
}
