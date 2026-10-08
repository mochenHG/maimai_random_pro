import { useEffect, useState } from 'react'
import { Timer } from 'lucide-react'
import { countdownAt } from '../lib/obsCountdown'

/** One aligned timeout, isolated from the scene. Hidden sources stop scheduling. */
export default function OBSCountdown({ endAt }: { endAt: number }) {
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined
    const tick = () => {
      clearTimeout(timer)
      const time = Date.now()
      setNow(time)
      const delay = countdownAt(endAt, time).nextDelay
      if (delay !== null && !document.hidden) timer = setTimeout(tick, delay)
    }
    tick()
    document.addEventListener('visibilitychange', tick)
    return () => { clearTimeout(timer); document.removeEventListener('visibilitychange', tick) }
  }, [endAt])
  const { remaining, minutes, seconds } = countdownAt(endAt, now)
  return <aside className={`obs-countdown${remaining === 0 ? ' is-finished' : ''}`} aria-label={`倒计时 ${minutes} 分 ${seconds} 秒`}>
    <span className="obs-countdown-label"><Timer size={18}/>{remaining ? 'COUNTDOWN' : 'TIME UP'}</span>
    <strong><span key={`m${minutes}`} className="obs-countdown-number">{minutes}</span><b>:</b><span key={`s${seconds}`} className="obs-countdown-number">{seconds}</span></strong>
  </aside>
}
