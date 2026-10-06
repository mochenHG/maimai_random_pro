/** Precomputed convex edge normals. All distances are in CSS pixels. */
export function glassDisplacement(width: number, height: number, radius: number) {
  const actualWidth = Math.max(1, width), actualHeight = Math.max(1, height)
  const ratio = Math.min(1, 384 / actualWidth, 256 / actualHeight)
  const w = Math.max(1, Math.round(actualWidth * ratio))
  const h = Math.max(1, Math.round(actualHeight * ratio))
  const r = Math.max(0, Math.min(radius, actualWidth / 2, actualHeight / 2))
  const bevel = Math.max(3, Math.min(18, r * .65, actualHeight * .22))
  const pixels = new Uint8ClampedArray(w * h * 4)
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const px = (x + .5) / w * actualWidth - actualWidth / 2
    const py = (y + .5) / h * actualHeight - actualHeight / 2
    const qx = Math.abs(px) - actualWidth / 2 + r
    const qy = Math.abs(py) - actualHeight / 2 + r
    const cx = Math.max(qx, 0), cy = Math.max(qy, 0)
    const length = Math.hypot(cx, cy)
    const depth = r - length - Math.min(Math.max(qx, qy), 0)
    const t = Math.max(0, Math.min(1, depth / bevel))
    // A rounded shoulder flattens to an undistorted center.
    const bend = depth >= 0 ? (1 - t) ** 2 * 112 : 0
    const nx = length ? cx / length * Math.sign(px) : qx > qy ? Math.sign(px) : 0
    const ny = length ? cy / length * Math.sign(py) : qx > qy ? 0 : Math.sign(py)
    const i = (y * w + x) * 4
    pixels[i] = 128 - nx * bend
    pixels[i + 1] = 128 - ny * bend
    pixels[i + 2] = 128; pixels[i + 3] = 255
  }
  return { width: w, height: h, pixels }
}
