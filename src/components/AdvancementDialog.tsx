import { useEffect, useRef } from 'react'
import { Check, X } from 'lucide-react'
import type { Stage } from '../types'
import { rankPlayers } from '../lib/tournament'
import ClickSpark from './ClickSpark'

export default function AdvancementDialog({ stage, onConfirm, onClose }: { stage: Stage; onConfirm: () => void; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => { dialog.current?.showModal() }, [])
  const players = rankPlayers(stage).players.filter(p => p.advanced).sort((a, b) => a.rank! - b.rank!)
  const others = stage.players.length - players.length
  return <dialog ref={dialog} className="stage-dialog advancement-dialog" aria-labelledby="advancement-title" onCancel={e => { e.preventDefault(); onClose() }}>
    <div className="section-title dialog-heading"><h2 id="advancement-title">确认晋级</h2><button className="icon-button" aria-label="关闭晋级确认" onClick={onClose}><X size={22}/></button></div>
    <p className="advancement-summary">{stage.name} · {players.length} 人晋级{others > 0 ? ` · ${others} 人${stage.loserStageId ? '进入败者组' : '淘汰'}` : ''}</p>
    <div className="advancement-roster">{players.map(p => <div key={p.id}><Check size={18}/><strong>{p.name}</strong><span className="mono">{p.score?.toFixed(4)}</span></div>)}</div>
    <div className="dialog-actions"><button onClick={onClose}>取消</button><button className="primary" onClick={onConfirm}>确认晋级</button></div>
    <ClickSpark/>
  </dialog>
}
