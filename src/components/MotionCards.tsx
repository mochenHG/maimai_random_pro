import { useState } from 'react'
export default function MotionCards() {
  const [replay, setReplay] = useState(0)
  return <button className="motion-deck" aria-label="重播卡片弹跳动效" title="点击重播卡片动效" onClick={() => setReplay(v => v + 1)}><span className="motion-stack" key={replay} aria-hidden="true">{['STD', 'DX', '♪'].map((label,i) => <span className={`motion-card motion-card-${i}`} key={label}><b>{label}</b></span>)}</span></button>
}
