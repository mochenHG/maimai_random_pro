import { readFile } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
const run = promisify(execFile)
const url = 'https://maimai.lxns.net/api/v0/maimai/song/list'
let cached = null
let pending = null
async function requestMusic() {
  let data
  if (process.platform === 'win32') {
    // Windows' HTTPS client uses the user's system proxy and certificate store.
    const { stdout } = await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', `[Console]::OutputEncoding = [System.Text.UTF8Encoding]::new(); $ProgressPreference = 'SilentlyContinue'; $ErrorActionPreference = 'Stop'; $response = Invoke-WebRequest -UseBasicParsing -Uri '${url}' -TimeoutSec 18; [System.Text.Encoding]::UTF8.GetString($response.RawContentStream.ToArray())`], { windowsHide: true, timeout: 22000, maxBuffer: 8 * 1024 * 1024, encoding: 'utf8' })
    data = JSON.parse(stdout.replace(/^\uFEFF/, ''))
  } else {
    const response = await fetch(url, { signal: AbortSignal.timeout(18000) })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    data = await response.json()
  }
  if (!Array.isArray(data.songs) || !data.songs.length) throw new Error('Invalid upstream data')
  cached = { songs: data.songs, source: 'live', fetchedAt: new Date().toISOString() }
  return cached
}
export async function getMusic() {
  if (cached && Date.now() - Date.parse(cached.fetchedAt) < 3600000) return { ...cached, source: 'cache' }
  if (!pending) pending = requestMusic().catch(async () => {
    if (cached) return { ...cached, source: 'cache', warning: '在线服务暂时不可用，已使用上次获取的数据。' }
    const snapshot = JSON.parse(await readFile(new URL('./data/music-snapshot.json', import.meta.url), 'utf8'))
    return { songs: snapshot.songs, source: 'bundled', fetchedAt: '2026-10-06', warning: '在线服务暂时不可用，已使用 2026-10-06 的内置曲库。' }
  }).finally(() => { pending = null })
  return pending
}
export async function handleMusic(req, res) {
  if (new URL(req.url, 'http://localhost').pathname !== '/api/music') return false
  res.setHeader('Content-Type', 'application/json; charset=utf-8')
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'GET') { res.writeHead(405); res.end(JSON.stringify({ error: '只支持 GET 请求。' })); return true }
  try { res.end(JSON.stringify(await getMusic())) }
  catch { res.writeHead(502); res.end(JSON.stringify({ error: '曲库服务与本地备用数据均不可用，请导入 JSON。' })) }
  return true
}
