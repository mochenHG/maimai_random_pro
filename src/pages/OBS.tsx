import { useEffect, useState } from 'react'
import { load } from '../lib/storage'
import type { Song, Stage } from '../types'
import { OBSSongScene, OBSWaiting, useOBSPresentation } from '../components/OBSScene'
import { enableSync, useSyncStatus } from '../lib/sync'
import OBSStandings from '../components/OBSStandings'
const TOURNAMENT_KEY = 'maimai-pro-tournament'
const DRAW_KEY = 'maimai-pro-draw'
interface TournamentData { stages: Stage[]; currentStage: string }
export default function OBS({ tournament }: { tournament: boolean }) {
  const sync = useSyncStatus()
  const clean = new URLSearchParams(location.search).get('clean') === '1'
  const [songs, setSongs] = useState(() => load<Song[]>(DRAW_KEY, []))
  const [data, setData] = useState(() => load<TournamentData | null>(TOURNAMENT_KEY, null))
  const [revision, setRevision] = useState(0)
  useOBSPresentation()
  useEffect(() => {
    enableSync(false)
    const update = (key: string | null) => {
      if (key === DRAW_KEY) { setSongs(load<Song[]>(DRAW_KEY, [])); setRevision(v => v + 1) }
      if (key === TOURNAMENT_KEY) setData(load<TournamentData | null>(TOURNAMENT_KEY, null))
    }
    const storage = (event: StorageEvent) => update(event.key)
    const remote = (event: Event) => update((event as CustomEvent<string>).detail)
    window.addEventListener('storage', storage); window.addEventListener('pro-remote', remote)
    return () => { window.removeEventListener('storage', storage); window.removeEventListener('pro-remote', remote) }
  }, [])
  const stage = data?.stages.find(s => s.id === data.currentStage)
  if ((!tournament && !songs.length) || (tournament && !stage)) return clean ? null : <OBSWaiting title={sync === 'connected' ? '等待主页面内容' : sync === 'offline' ? '同步连接已断开' : '正在连接'}>
    <p>{tournament ? '保持主页面开启，添加选手后会自动显示赛事信息。' : '保持主页面开启，开始抽谱后会自动显示结果。'}</p>
    <p className="hint">OBS 来源：{location.origin}/{tournament ? 'obs-tournament' : 'obs'}?clean=1 · 建议 1920 × 1080</p>
    {sync === 'offline' && <button onClick={() => enableSync(false)}>重新连接</button>}
  </OBSWaiting>
  if (!tournament) return <OBSSongScene songs={songs} revision={revision}/>
  if (!stage) return null
  return <OBSStandings stage={stage} connected={sync === 'connected'} key={stage.id}/>
}

