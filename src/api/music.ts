import { normalizeSongs } from '../lib/songs.ts'
import { DIFFICULTIES, type Song } from '../types.ts'
interface DifficultyData { difficulty: number; level: string; level_value?: number; note_designer?: string; version?: number }
interface MusicData { id: number; title: string; artist: string; genre: string; bpm: number; version: number; disabled?: boolean; difficulties: { standard?: DifficultyData[]; dx?: DifficultyData[]; utage?: DifficultyData[] } }
export function convertMusic(data: { songs: MusicData[] }): Song[] {
  if (!Array.isArray(data.songs)) throw new Error('在线曲库格式无效。')
  const songs: Song[] = []
  for (const song of data.songs) {
    if (song.disabled) continue
    const name = song.title.trim() ? song.title : `无标题（#${song.id}）`
    for (const type of ['standard', 'dx', 'utage'] as const) {
      for (const [index, diff] of (song.difficulties[type] || []).entries()) {
        const difficulty = type === 'utage' ? 'UTAGE' : DIFFICULTIES[diff.difficulty]
        if (!difficulty) continue
        songs.push({ id: `${song.id}-${type}-${diff.difficulty}${type === 'utage' ? `-${index}` : ''}`, songId: song.id, name, author: song.artist, bpm: song.bpm, genre: song.genre, difficulty, level: Number.parseInt(diff.level) || 0, isPlus: diff.level.includes('+'), levelValue: diff.level_value ?? null, difficultyAuthor: diff.note_designer || '', version: diff.version ?? song.version, chartType: type === 'dx' ? 'dx' : 'standard', cover: `https://assets2.lxns.net/maimai/jacket/${song.id}.png` })
      }
    }
  }
  return normalizeSongs(songs)
}
export async function fetchMusic(): Promise<{ songs: Song[]; message: string }> {
  let response: Response
  try { response = await fetch('/api/music', { signal: AbortSignal.timeout(28000) }) }
  catch { throw new Error('本地曲库服务没有响应，请使用新版 run.bat 启动网站后重试。') }
  if (!response.ok) throw new Error(`在线曲库请求失败（${response.status}），请导入 JSON 或稍后重试。`)
  let data: {songs: MusicData[]; source: string; fetchedAt: string; warning?: string}
  try { data = await response.json() } catch { throw new Error('启动的是旧版服务，请关闭旧版窗口，再运行当前版本的 run.bat。') }
  return { songs: convertMusic(data), message: data.warning || `已获取曲库（${data.source === 'cache' ? '本次启动缓存' : '在线最新数据'}，${data.fetchedAt?.slice(0,10)}）。` }
}
