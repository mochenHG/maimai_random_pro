import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { ArrowDownRight, Check, Radio, Trophy, X } from 'lucide-react'
import type { Stage } from '../types'
import { broadcastCapacity, broadcastStandings } from '../lib/standings'
import SongCard from './SongCard'
import OBSScore from './OBSScore'

export default function OBSStandings({ stage, connected }: { stage: Stage; connected: boolean }) {
  const rows = useMemo(() => broadcastStandings(stage), [stage])
  const [screen, setScreen] = useState(() => ({ width: innerWidth, height: innerHeight }))
  const [page, setPage] = useState(0)
  const { size, perColumn } = broadcastCapacity(screen.width, screen.height, !!stage.songs.length)
  const pages = Math.max(1, Math.ceil(rows.length / size))
  const actualPage = page % pages
  const visible = useMemo(() => rows.slice(actualPage * size, (actualPage + 1) * size), [rows, actualPage, size])
  const list = useRef<HTMLOListElement>(null)
  const positions = useRef(new Map<string, { top: number; left: number }>())
  const animations = useRef(new Map<string, Animation>())
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
  useLayoutEffect(() => {
    const next = new Map<string, { top: number; left: number }>()
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    list.current?.querySelectorAll<HTMLElement>('[data-player-id]').forEach(element => {
      const id = element.dataset.playerId!
      const previous = positions.current.get(id)
      const running = animations.current.get(id)
      const transform = running ? getComputedStyle(element).transform : 'none'
      const matrix = transform === 'none' ? null : new DOMMatrix(transform)
      running?.cancel()
      const { top, left } = element.getBoundingClientRect()
      next.set(id, { top, left })
      const dx = previous ? previous.left + (matrix?.m41 ?? 0) - left : 0
      const dy = previous ? previous.top + (matrix?.m42 ?? 0) - top : 0
      if ((Math.abs(dx) > .5 || Math.abs(dy) > .5) && !reduced && !document.hidden) {
        animations.current.set(id, element.animate([{ transform: `translate(${dx}px,${dy}px)` }, { transform: 'translate(0,0)' }], { duration: 480, easing: 'cubic-bezier(.16,1,.3,1)' }))
      }
    })
    for (const [id, animation] of animations.current) if (!next.has(id)) { animation.cancel(); animations.current.delete(id) }
    positions.current = next
  }, [visible])
  useEffect(() => {
    const running = animations.current
    return () => running.forEach(animation => animation.cancel())
  }, [])
  const advanced = rows.filter(p => p.status === 'advanced').length
  return <section className={`obs-ranking${stage.locked ? ' is-announced' : ''}`} aria-label={`${stage.name} 排名展示`}>
    <header className="obs-ranking-header"><div><h1>{stage.name}</h1><h2>{stage.locked ? '晋级结果' : '实时排名'}</h2></div><div className={`obs-live-state${connected ? '' : ' is-offline'}`}><span />{!connected ? '连接中断' : stage.locked ? `${advanced} 人晋级` : '实时同步'}</div></header>
    {!rows.length ? <div className="obs-ranking-empty"><Radio size={32}/><span>等待选手</span></div> : <>
      <ol ref={list} className={`obs-ranking-list${screen.width >= 1200 && visible.length > perColumn ? ' is-two-columns' : ''}`} key={actualPage}>
        {visible.map((player, index) => <li data-player-id={player.id} data-result={player.status} className={`obs-player obs-player-${player.status}`} key={player.id} style={{ '--reveal-delay': `${Math.min(index, 7) * 75}ms` } as React.CSSProperties}>
          <span className="obs-rank">{player.rank === null ? '—' : String(player.rank).padStart(2, '0')}</span>
          <div className="obs-player-identity"><strong>{player.name}</strong><span className="obs-group">{player.group && `${player.group} · `}Rating {player.rating ?? '—'}</span></div>
          <div className="obs-player-score"><OBSScore value={player.score}/><span className="obs-dx">DX {player.dxScore ?? '—'}</span></div>
          <span className={`obs-result obs-result-${player.status}`} aria-label={player.status === 'live' ? '成绩待确认' : undefined}>{player.status === 'advanced' ? <><Check size={18}/>晋级</> : player.status === 'eliminated' ? <><X size={18}/>淘汰</> : player.status === 'repechage' ? <><ArrowDownRight size={18}/>败者组</> : <span className="obs-pending-dot"/>}</span>
        </li>)}
      </ol>
      <footer className="obs-ranking-footer"><span>{stage.locked ? <Trophy size={18}/> : <Radio size={18}/>} {stage.locked ? '成绩已确认' : '完成率'}</span>{pages > 1 && <span>{actualPage + 1} / {pages}</span>}</footer>
    </>}
    {!!stage.songs.length && <div className="stage-song-cards obs-ranking-songs">{stage.songs.map((song, i) => <SongCard key={song.id} song={song} index={i}/>)}</div>}
  </section>
}
