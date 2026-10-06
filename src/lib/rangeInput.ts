import { MAX_CONSTANT, MAX_GRADE, type RangeMode } from './range.ts'

/** A draft can be empty or incomplete without changing the active filter. */
export function parseRangeInput(text: string, mode: RangeMode): number | null {
  const value = text.trim().replace(/[０-９]/g, c => String(c.charCodeAt(0) - 0xff10)).replace(/＋/g, '+').replace(/．/g, '.')
  const valid = mode === 'constant' ? /^\d+(?:\.\d*)?$/.test(value) : /^\d+\+?$/.test(value)
  if (!valid) return null
  const number = mode === 'constant' ? Number(value) : Number.parseInt(value) + (value.endsWith('+') ? .5 : 0)
  return Number.isFinite(number) ? number : null
}
export function normalizeRangeInput(value: number, mode: RangeMode): number {
  const limit = mode === 'constant' ? MAX_CONSTANT : MAX_GRADE
  const scale = mode === 'constant' ? 10 : 2
  return Math.max(1, Math.min(limit, Math.round(value * scale) / scale))
}
/** Editing past the other endpoint moves it too, keeping a valid range. */
export function editRangeEndpoint(min: number, max: number, value: number, edge: 'min' | 'max', mode: RangeMode): [number, number] {
  const next = normalizeRangeInput(value, mode)
  return edge === 'min' ? [next, Math.max(next, max)] : [Math.min(min, next), next]
}
