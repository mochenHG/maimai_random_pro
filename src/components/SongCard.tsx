import { memo, useState } from 'react'
import type { Song } from '../types'
import { coverSources } from '../lib/covers'
function Cover({song}:{song:Song}) {
  const sources=coverSources(song);const [attempt,setAttempt]=useState(0)
  return sources[attempt]?<img src={sources[attempt]} alt={`${song.name} 曲绘`} loading="lazy" decoding="async" onError={()=>setAttempt(n=>n+1)}/>:<span role="img" aria-label={`${song.name} 暂无曲绘`}>♪</span>
}
export default memo(function SongCard({ song, index, reveal = false }: { song: Song; index: number; reveal?: boolean }) {
  const front = <><div className="cover"><Cover key={`${song.songId}-${song.cover}`} song={song}/></div><div className="card-body"><div className="row"><span className={`difficulty difficulty-${song.difficulty.replace(':', '')}`}>{song.difficulty}</span><span className="mono level">{Math.min(15,song.level)}{song.isPlus && song.level<15 ? '+' : ''}</span></div><h3>{song.name}</h3><div className="card-constant">定数 <b>{song.levelValue?.toFixed(1) ?? '—'}</b></div></div></>
  return <article aria-label={`${index+1}. ${song.name}`} className={`song-card song-difficulty-${song.difficulty.replace(':','')}${reveal ? ' has-flip-reveal' : ''}`} style={reveal ? {'--flip-delay':`${500 + index * 300}ms`} as React.CSSProperties : undefined}>{reveal ? <div className="song-card-turn"><div className="song-card-front">{front}</div><div className="song-card-back" aria-hidden="true"><span className="card-back-disc"/><span className="card-back-logo"><img src="/logo-concepts/02-orbit.png" width={2172} height={724} alt="" decoding="async"/></span></div></div> : front}</article>
})
