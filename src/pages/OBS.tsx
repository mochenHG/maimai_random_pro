import { useEffect, useState } from 'react'
import { load } from '../lib/storage'
import type { Song, Stage } from '../types'
import SongCard from '../components/SongCard'
import { enableSync, useSyncStatus } from '../lib/sync'
import OBSStandings from '../components/OBSStandings'
import '../obs.css'
const TOURNAMENT_KEY = 'maimai-pro-tournament'
const DRAW_KEY = 'maimai-pro-draw'
interface TournamentData { stages: Stage[]; currentStage: string }
export default function OBS({ tournament }: { tournament: boolean }) {
  const sync = useSyncStatus()
  const clean = new URLSearchParams(location.search).get('clean') === '1'
  const [songs, setSongs] = useState(() => load<Song[]>(DRAW_KEY, []))
  const [data, setData] = useState(() => load<TournamentData | null>(TOURNAMENT_KEY, null)); const [revision, setRevision] = useState(0)
  useEffect(() => {
    document.body.classList.add('obs-body')
    enableSync(false)
    const storage = (event: StorageEvent) => { if(event.key === DRAW_KEY) { setSongs(load<Song[]>(DRAW_KEY, [])); setRevision(v => v + 1) } if(event.key === TOURNAMENT_KEY) setData(load<TournamentData | null>(TOURNAMENT_KEY, null)) }
    window.addEventListener('storage', storage)
    const remote = (event: Event) => {const key = (event as CustomEvent<string>).detail; if (key === DRAW_KEY) {setSongs(load<Song[]>(DRAW_KEY, [])); setRevision(v => v + 1)} if (key === TOURNAMENT_KEY) setData(load<TournamentData | null>(TOURNAMENT_KEY, null))}
    window.addEventListener('pro-remote', remote)
    return () => {window.removeEventListener('storage', storage); window.removeEventListener('pro-remote', remote); document.body.classList.remove('obs-body')}
  }, [])
  const stage = data?.stages.find(s => s.id === data.currentStage)
  const waiting = <section className="obs-waiting panel"><h2>{sync === 'connected' ? '已连接，等待主页面内容' : sync === 'offline' ? '同步连接已断开' : '正在连接主页面…'}</h2><p>{tournament ? '保持主页面开启，添加选手后会自动显示赛事信息。' : '保持主页面开启，开始抽谱后会自动显示结果。'}</p><p className="hint">OBS 浏览器来源请使用 {location.origin}/{tournament ? 'obs-tournament' : 'obs'}?clean=1 · 建议 1920 × 1080</p>{sync === 'offline' && <button onClick={() => enableSync(false)}>重新连接</button>}</section>
  if((!tournament && !songs.length) || (tournament && !stage)) return clean ? null : waiting
  if(!tournament) return <div className="obs-cards cards" key={revision}>{songs.map((s,i) => <SongCard key={s.id} song={s} index={i} reveal/>)}</div>
  if(!stage) return null
  return <OBSStandings stage={stage} connected={sync === 'connected'} key={stage.id}/>
}
