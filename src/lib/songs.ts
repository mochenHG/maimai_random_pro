import { DIFFICULTIES, type Song } from '../types.ts'
import { MAX_CONSTANT } from './range.ts'
export function parseLevel(value: string) { const level=Number.parseInt(value);return /^\d{1,2}\+?$/.test(value.trim()) && level<=15 ? Math.min(15,level + (value.includes('+') ? 0.5 : 0)) : NaN }
export function normalizeSongs(data: unknown): Song[] {
  const input = Array.isArray(data) ? data : data && typeof data === 'object' && 'songs' in data ? data.songs : null
  if (!Array.isArray(input) || !input.length) throw new Error('曲库必须包含非空的谱面数组。')
  if (input.length > 50000) throw new Error('单个曲库最多支持 50,000 张谱面。')
  const ids = new Set<string>()
  return input.map((raw, i) => {
    if (!raw || typeof raw !== 'object') throw new Error(`第 ${i + 1} 项不是谱面。`)
    const x = raw as Record<string, unknown>
    const level = typeof x.level === 'string' ? parseLevel(x.level) : Number(x.level)
    if (!String(x.id ?? '').trim() || typeof x.name !== 'string' || !x.name.trim() || !DIFFICULTIES.includes(x.difficulty as Song['difficulty']) || !Number.isFinite(level) || level < 0 || level > 15.5 || !['dx', 'standard'].includes(String(x.chartType))) throw new Error(`第 ${i + 1} 项的 ID、名称、难度、等级或谱面类型无效。`)
    const id = String(x.id)
    if (ids.has(id)) throw new Error(`曲库内有重复的谱面 ID：${id}`)
    ids.add(id)
    const isPlus = level < 15 && (typeof x.isPlus === 'boolean' ? x.isPlus : typeof x.level === 'string' && x.level.includes('+'))
    const str = (v: unknown) => typeof v === 'string' ? v : ''
    const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v) ? v : 0
    const cover = str(x.cover)
    const candidateId=Number(x.songId??x.song_id??(/^\d+(?:-(?:standard|dx|utage)-\d.*)?$/.test(id)?id.split('-')[0]:0))
    const songId=Number.isSafeInteger(candidateId) && candidateId>0?candidateId:0
    const constant = x.levelValue ?? x.level_value ?? x.ds
    const levelValue = constant !== null && constant !== undefined && constant !== '' && Number.isFinite(Number(constant)) && Number(constant)>0 && Number(constant)<=MAX_CONSTANT ? Number(constant) : null
    return { id, songId, name: x.name.trim(), difficulty: x.difficulty as Song['difficulty'], level: Math.min(15,Math.floor(level)), isPlus, cover: /^(https?:\/\/|\/|\.?\.?\/)/i.test(cover) ? cover.replace(/^\.\/public\//,'/') : '', author: str(x.author), difficultyAuthor: str(x.difficultyAuthor), bpm: num(x.bpm), chartType: x.chartType as Song['chartType'], genre: str(x.genre), levelValue, version: num(x.version) }
  })
}
// Rejection sampling avoids modulo bias. Only shuffle the requested portion.
export function randomIndex(max: number) {
  const limit = Math.floor(0x100000000 / max) * max
  const data = new Uint32Array(1)
  do { crypto.getRandomValues(data) } while (data[0] >= limit)
  return data[0] % max
}
export function sample<T>(source: T[], count: number): T[] {
  const copy = source.slice(); const n = Math.min(count, copy.length)
  for (let i = 0; i < n; i++) { const j = i + randomIndex(copy.length - i); [copy[i], copy[j]] = [copy[j], copy[i]] }
  return copy.slice(0, n)
}
