import { useEffect, type ReactNode } from 'react'
import { Radio, Shuffle } from 'lucide-react'
import BrandLogo from './BrandLogo'
import MorphIcon from './MorphIcon'
import SongCard from './SongCard'
import type { Song } from '../types'
import { initializeTheme } from './ThemeToggle'
import { useSongExit } from '../hooks/useSongExit'
import DotBackground from './DotBackground'

/** Presentation-only lifecycle; never writes controller or remote appearance state. */
export function useOBSPresentation(active = true) {
  useEffect(() => {
    if (!active) return
    const root = document.documentElement, body = document.body
    const reduced = matchMedia('(prefers-reduced-motion: reduce)')
    root.dataset.presentation = 'obs'
    body.classList.add('obs-body')
    if (navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4) body.classList.add('obs-lite')
    const visibility = () => { body.classList.toggle('obs-motion-paused', document.hidden); body.classList.toggle('obs-reduced-motion', reduced.matches) }
    const theme = (event: StorageEvent) => { if (event.key === 'maimai-pro-theme' || event.key === null) initializeTheme() }
    visibility()
    document.addEventListener('visibilitychange', visibility)
    reduced.addEventListener('change', visibility)
    window.addEventListener('storage', theme)
    return () => {
      body.classList.remove('obs-body', 'obs-lite', 'obs-motion-paused', 'obs-reduced-motion')
      delete root.dataset.presentation
      document.removeEventListener('visibilitychange', visibility)
      reduced.removeEventListener('change', visibility)
      window.removeEventListener('storage', theme)
    }
  }, [active])
}

export function OBSHeader({ title, subtitle, connected, status }: { title: string; subtitle: string; connected?: boolean; status?: string }) {
  return <header className="obs-ranking-header">
    <div className="obs-heading"><span className="obs-eyebrow">MAIMAI RANDOM PRO · {subtitle}</span><h1>{title}<span className="obs-title-dot" aria-hidden="true">.</span></h1></div>
    <div className="obs-header-tools"><div className="obs-brand"><BrandLogo page="draw"/></div>{status && <span className={`obs-live-state${connected === false ? ' is-offline' : ''}`}><MorphIcon name={connected === false ? 'minus' : 'check'} size={18}/>{status}</span>}</div>
  </header>
}

export function OBSFrame({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`obs-surface ${className}`} data-obs-glass=""><OBSBackdrop/>{children}</section>
}

export function OBSBackdrop(){return <div className="obs-dots-clip" aria-hidden="true"><DotBackground active broadcast/></div>}

export function OBSSongScene({ songs, title = 'next track', revision = 0 }: { songs: Song[]; title?: string; revision?: number }) {
  const view=useSongExit(songs,revision),displayed=view.value
  return <OBSFrame className="obs-song-scene"><OBSHeader title={title} subtitle="CHART SELECTION"/>
    {displayed.length ? <div className={`obs-cards cards${view.leaving?' is-leaving':''}`} data-card-count={Math.min(displayed.length, 4)} key={view.generation}>{displayed.map((song, i) => <SongCard key={song.id} song={song} index={i} reveal={view.enter}/>)}</div> : <div className="obs-ranking-empty"><Shuffle size={36}/><strong>等待阶段曲目</strong><span>抽谱完成后自动展示</span></div>}
  </OBSFrame>
}

export function OBSStandby({ title, stage }: { title: string; stage?: string }) {
  return <OBSFrame className="obs-standby"><OBSHeader title="on air" subtitle="TOURNAMENT LIVE"/>
    <div className="obs-standby-content"><div className="obs-emissive-orb" aria-hidden="true"/><span className="obs-eyebrow">{stage ?? 'MAIMAI TOURNAMENT'}</span><h2>{title}</h2><p><Radio size={19}/>赛事直播 · 敬请期待</p><div className="obs-standby-rail" aria-hidden="true"><i/></div></div>
  </OBSFrame>
}

export function OBSWaiting({ title, children }: { title: string; children: ReactNode }) {
  return <OBSFrame className="obs-waiting"><OBSHeader title={title} subtitle="WAITING FOR LIVE"/><div className="obs-waiting-content">{children}</div></OBSFrame>
}
