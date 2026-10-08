import { useEffect, useState } from 'react'
import { Gift } from 'lucide-react'
import type { RaffleDisplay } from '../lib/raffle'
import { REVEAL_STEP } from '../lib/raffle'
import '../raffle.css'

export function useRevealCount(data:RaffleDisplay) {
  const [now,setNow] = useState(Date.now)
  const timestamp = data.round?.timestamp ?? 0, count = data.round?.winners.length ?? 0
  useEffect(() => {
    setNow(Date.now())
    if (data.phase !== 'revealed') return
    const timers = Array.from({length:count},(_,i) => timestamp + (i+1)*REVEAL_STEP).filter(time=>time>Date.now()).map(time=>setTimeout(() => setNow(Date.now()),time-Date.now()+10))
    return () => timers.forEach(clearTimeout)
  },[timestamp,count,data.phase])
  return Math.max(0,Math.min(count,Math.floor((now-timestamp)/REVEAL_STEP)))
}
export default function RaffleResults({data}:{data:RaffleDisplay}) {
  const revealed = useRevealCount(data)
  const winners = data.phase === 'revealed' ? data.round?.winners ?? [] : []
  return <div className={`raffle-results raffle-${data.phase}`} aria-live="polite">
    {data.phase === 'idle' ? <div className="raffle-standby"><Gift size={38}/><h3>好运，即将揭晓</h3><p>{data.eligibleCount} 人可抽取 · 本轮 {data.count} 个名额</p></div> : <>
      <div className="raffle-result-heading"><span className="eyebrow">{data.phase === 'drawing' ? 'GOOD LUCK' : 'LUCKY WINNERS'}</span><h3>{data.phase === 'drawing' ? '正在抽取，等待揭晓' : revealed < winners.length ? '正在揭晓中奖者' : '本轮中奖者'}</h3></div>
      <div className="raffle-cards" data-count={data.phase === 'drawing' ? data.count : winners.length}>{Array.from({length:data.phase === 'drawing' ? data.count : winners.length},(_,i) => <div className={`raffle-card${i < revealed && winners[i] ? ' is-revealed' : ''}`} key={`${data.round?.id ?? 'pending'}-${i}`}><div className="raffle-card-inner"><div className="raffle-card-back" aria-hidden="true"><img className="raffle-logo-light" src="/logo-concepts/02-orbit.png" alt=""/><img className="raffle-logo-dark" src="/logo-concepts/02-orbit-dark.png" alt=""/><span>好运待揭晓</span></div><div className="raffle-card-front">{i < revealed && winners[i] && <><span className="eyebrow">WINNER {String(i+1).padStart(2,'0')}</span><strong title={winners[i].name}>{winners[i].name}</strong><Gift size={22}/></>}</div></div></div>)}</div>
    </>}
  </div>
}
