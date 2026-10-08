import { useEffect, useMemo, useRef, useState } from 'react'
import { Radio, Trophy } from 'lucide-react'
import type { Stage } from '../types'
import { broadcastCapacity, broadcastStandings } from '../lib/standings'
import SongCard from './SongCard'
import OBSScore from './OBSScore'
import MorphIcon from './MorphIcon'
import { OBSBackdrop, OBSHeader } from './OBSScene'
import { useRankMotion } from '../hooks/useRankMotion'

export default function OBSStandings({ stage, connected, bottomInset = 0 }: { stage: Stage; connected: boolean; bottomInset?: number }) {
  const rows = useMemo(() => broadcastStandings(stage), [stage])
  const [screen, setScreen] = useState(() => ({ width: innerWidth, height: innerHeight }))
  const [page, setPage] = useState(0)
  const { size, perColumn } = broadcastCapacity(screen.width, screen.height - bottomInset - (stage.locked ? 72 : 0), !!stage.songs.length)
  const pages = Math.max(1, Math.ceil(rows.length / size))
  const actualPage = page % pages
  const visible = useMemo(() => rows.slice(actualPage * size, (actualPage + 1) * size), [rows, actualPage, size])
  const list = useRef<HTMLOListElement>(null)
  useEffect(() => {
    const change = () => setScreen({ width: innerWidth, height: innerHeight })
    window.addEventListener('resize', change)
    return () => window.removeEventListener('resize', change)
  }, [])
  useEffect(() => {
    if (pages <= 1) return
    const timer = setInterval(() => { if (!document.hidden) setPage(p => (p + 1) % pages) }, 10000)
    return () => clearInterval(timer)
  }, [pages, stage.locked])
  useEffect(() => { setPage(0) }, [stage.locked])
  useRankMotion(list,JSON.stringify(visible.map(p=>[p.id,p.rank,p.score,p.status])),`${stage.id}:${actualPage}`)
  const advanced = rows.filter(p => p.status === 'advanced').length
  return <section className={`obs-surface obs-ranking${stage.locked ? ' is-announced' : ''}`} data-obs-glass="" aria-label={`${stage.name} 排名展示`}>
    <OBSBackdrop/>
    <OBSHeader title={stage.name} subtitle={stage.locked ? '晋级结果 · RESULTS' : '实时排名 · LIVE RANKING'} connected={connected} status={!connected ? '连接中断' : stage.locked ? `${advanced} 人晋级` : '实时同步'}/>
    {stage.locked && <div className="obs-result-banner" role="status"><span className="obs-reveal-seal" aria-hidden="true"><Trophy size={27}/><i/></span><div><strong>晋级名单已揭晓</strong><span>{advanced} 人晋级 · {rows.length-advanced} 人{stage.loserStageId?'进入败者组':'未晋级'}</span></div><span className="obs-reveal-word" aria-hidden="true">QUALIFIED<span>.</span></span></div>}
    {!rows.length ? <div className="obs-ranking-empty"><Radio size={32}/><span>等待选手</span></div> : <>
      <ol ref={list} className={`obs-ranking-list${screen.width >= 1200 && visible.length > perColumn ? ' is-two-columns' : ''}`} key={actualPage}>
        {visible.map((player, index) => <li data-player-id={player.id} data-result={player.status} className={`obs-player obs-player-${player.status}`} key={player.id} style={{ '--reveal-delay': `${Math.min(index, 7) * 75}ms` } as React.CSSProperties}>
          <span className="obs-rank">{player.rank === null ? '—' : String(player.rank).padStart(2, '0')}</span>
          <div className="obs-player-identity"><strong title={player.name}>{player.name}</strong><span className="obs-group">{player.group && `${player.group} · `}Rating {player.rating ?? '—'}</span></div>
          <div className="obs-player-score"><OBSScore value={player.score}/><span className="obs-dx">DX {player.dxScore ?? '—'}</span></div>
          <span className={`obs-result obs-result-${player.status}`} aria-label={player.status === 'live' ? '成绩待确认' : undefined}><MorphIcon name={player.status === 'advanced' ? 'check' : player.status === 'repechage' ? 'down' : 'minus'}/>{player.status === 'advanced' ? '晋级' : player.status === 'eliminated' ? '淘汰' : player.status === 'repechage' ? '败者组' : '待确认'}</span>
        </li>)}
      </ol>
      <footer className="obs-ranking-footer"><span>{stage.locked ? <Trophy size={18}/> : <Radio size={18}/>} {stage.locked ? '成绩已确认' : '完成率'}</span>{pages > 1 && <span>{actualPage + 1} / {pages}</span>}</footer>
    </>}
    {!!stage.songs.length && <div className="stage-song-cards obs-ranking-songs">{stage.songs.map((song, i) => <SongCard key={song.id} song={song} index={i} compact/>)}</div>}
  </section>
}
