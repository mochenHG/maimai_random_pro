import { memo, useState } from 'react'
import type { Song } from '../types'
import { coverSources } from '../lib/covers'
function Cover({song}:{song:Song}) {
  const sources=coverSources(song);const [attempt,setAttempt]=useState(0)
  return sources[attempt]?<img src={sources[attempt]} alt={`${song.name} 曲绘`} loading="lazy" decoding="async" onError={()=>setAttempt(n=>n+1)}/>:<span role="img" aria-label={`${song.name} 暂无曲绘`}>♪</span>
}
export default memo(function SongCard({ song, index, reveal = false, compact = false }: { song: Song; index: number; reveal?: boolean; compact?: boolean }) {
  const level=`${Math.min(15,song.level)}${song.isPlus && song.level<15 ? '+' : ''}`
  const author=song.author?.trim()||'作曲家未提供',designer=song.difficultyAuthor?.trim()||'未提供'
  const genre=song.genre?.trim()||'分类未提供',bpm=Number.isFinite(song.bpm)&&song.bpm>0?song.bpm:'—'
  // All information comes from the existing chart. The reference jacket's own
  // artwork/letterboxing is preserved; it is not recreated or cropped to fill.
  const front = <div className="collectible-face">
    <div className="cover card-jacket"><Cover key={`${song.songId}-${song.cover}`} song={song}/><span className="card-chart-type" aria-label={`谱面类型 ${song.chartType==='dx'?'DX':'STANDARD'}`}>{song.chartType==='dx'?'DX':'STD'}</span></div>
    <div className="card-details">
      <div className="card-grade-band"><div className="card-level-tile"><span>LEVEL</span><strong>{level}</strong></div><div className="card-difficulty-label">{song.difficulty}</div></div>
      <div className="card-name-block"><div className="card-title-slot"><h3 title={song.name}>{song.name}</h3></div>{!compact&&<div className="card-author-slot"><p className="card-author" title={author}>{author}</p></div>}</div>
      {!compact&&<><div className="card-info-band"><span className="card-constant-value"><span>CONST</span><strong>{song.levelValue?.toFixed(1)??'—'}</strong></span><span className="card-genre" title={genre}>{genre}</span></div>
        <div className="card-credits"><span className="card-designer" title={designer}><span>NOTES DESIGNER:</span> {designer}</span><span className="card-bpm">BPM: {bpm}</span></div></>}
    </div>
  </div>
  return <article aria-label={`${index+1}. ${song.name} · ${song.difficulty} · 等级 ${level}`} className={`song-card collectible-card song-difficulty-${song.difficulty.replace(':','')}${compact?' is-compact':''}${reveal ? ' has-flip-reveal' : ''}`} style={reveal ? {'--flip-delay':`${500 + index * 300}ms`} as React.CSSProperties : undefined}>{reveal ? <div className="song-card-turn"><div className="song-card-front">{front}</div><div className="song-card-back" aria-hidden="true"><span className="card-back-disc"/><span className="card-back-logo"><img src="/logo-concepts/02-orbit.png" width={2172} height={724} alt="" decoding="async"/></span></div></div> : front}</article>
})
