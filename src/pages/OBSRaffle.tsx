import { useEffect, useState } from 'react'
import { load } from '../lib/storage'
import { enableSync, useSyncStatus } from '../lib/sync'
import { RAFFLE_DISPLAY_KEY } from '../lib/raffle'
import type { RaffleDisplay } from '../lib/raffle'
import RaffleResults from '../components/RaffleResults'
import { OBSFrame, OBSHeader, OBSWaiting, useOBSPresentation } from '../components/OBSScene'

export default function OBSRaffle({ embedded = false }: { embedded?: boolean }) {
  const [data, setData] = useState(() => load<RaffleDisplay | null>(RAFFLE_DISPLAY_KEY, null))
  const sync = useSyncStatus(), clean = new URLSearchParams(location.search).get('clean') === '1'
  useOBSPresentation(!embedded)
  useEffect(() => {
    enableSync(false)
    const update = () => setData(load<RaffleDisplay | null>(RAFFLE_DISPLAY_KEY, null))
    const storage = (e: StorageEvent) => { if (e.key === RAFFLE_DISPLAY_KEY) update() }
    const remote = (e: Event) => { if ((e as CustomEvent<string>).detail === RAFFLE_DISPLAY_KEY) update() }
    window.addEventListener('storage', storage); window.addEventListener('pro-remote', remote)
    return () => { window.removeEventListener('storage', storage); window.removeEventListener('pro-remote', remote) }
  }, [])
  if (!data?.poolCount) return clean ? null : <OBSWaiting title="等待赛事抽奖"><p>从导航栏打开「赛事抽奖」，载入名单后自动同步。</p><p className="hint">OBS 来源：{location.origin}/obs-raffle?clean=1 · 建议 1920 × 1080</p>{sync === 'offline' && <button onClick={() => enableSync(false)}>重新连接</button>}</OBSWaiting>
  return <OBSFrame className="obs-ranking obs-raffle"><OBSHeader title={data.title} subtitle="LUCKY DRAW" connected={sync === 'connected'} status={clean ? undefined : sync === 'connected' ? '实时同步' : '同步未连接'}/><RaffleResults data={data}/><footer className="obs-ranking-footer"><span>{data.eligibleCount} 人可抽取</span><span>已揭晓 {data.rounds} 轮</span></footer></OBSFrame>
}

