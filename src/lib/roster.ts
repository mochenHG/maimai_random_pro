import type { Cell, RosterEntry } from '../types.ts'
const nameHeaders = ['昵称', '选手昵称', '游戏昵称', '选手名', '选手名称', '姓名', 'name', 'nickname', 'player', 'playername', 'username']
const ratingHeaders = ['rating', 'ranting', 'ra', 'rt', '玩家rating', '选手rating', '舞萌rating', '段位分', '评分']
export function headerKey(value: Cell | undefined) { return String(value ?? '').normalize('NFKC').trim().toLowerCase().replace(/[\s_\-:：()（）]/g, '') }
export function detectColumns(rows: Cell[][]) {
  for (let row = 0; row < Math.min(rows.length, 30); row++) {
    const keys = rows[row].map(headerKey)
    const name = keys.findIndex(x => nameHeaders.includes(x))
    const rating = keys.findIndex(x => ratingHeaders.includes(x))
    if (name >= 0 && rating >= 0) return { headerRow: row, name, rating }
  }
  return { headerRow: 0, name: -1, rating: -1 }
}
export function parseRating(value: Cell | undefined) {
  if (value === null || value === undefined || String(value).trim() === '') return null
  const text = String(value).normalize('NFKC').trim()
  if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d+)?$/.test(text)) return NaN
  const n = Number(text.replaceAll(',', ''))
  return Number.isFinite(n) && n >= 0 && n <= 100000 ? n : NaN
}
export function parseRoster(rows: Cell[][], headerRow: number, nameColumn: number, ratingColumn: number) {
  const entries: RosterEntry[] = []; const issues: { row: number; message: string }[] = []; const seen = new Set<string>()
  if (nameColumn < 0 || ratingColumn < 0 || nameColumn === ratingColumn) return { entries, issues, emptyRatings: 0 }
  let emptyRatings = 0
  for (let i = headerRow + 1; i < rows.length; i++) {
    const row = rows[i]
    if (row.every(v => v === null || String(v).trim() === '')) continue
    const name = String(row[nameColumn] ?? '').trim()
    const rating = parseRating(row[ratingColumn])
    if (!name || name.length > 80) { issues.push({ row: i + 1, message: '昵称为空或超过 80 个字符' }); continue }
    if (Number.isNaN(rating)) { issues.push({ row: i + 1, message: `${name} 的 rating 不是 0–100000 之间的数字` }); continue }
    if (seen.has(name)) { issues.push({ row: i + 1, message: `昵称「${name}」重复，保留首次出现的记录` }); continue }
    seen.add(name); if (rating === null) emptyRatings++
    entries.push({ name, rating })
  }
  return { entries, issues, emptyRatings }
}
