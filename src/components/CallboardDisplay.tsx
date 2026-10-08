import { visibleCallboard } from '../lib/callboard'
import { useCallboard } from '../store/callboardStore'
import { useTournamentStore } from '../store/tournamentStore'
import { OBSFrame, OBSHeader } from './OBSScene'
export default function CallboardDisplay({preview=false}:{preview?:boolean}){
  const board=useCallboard(s=>s.data),eventId=useTournamentStore(s=>s.eventId),current=useTournamentStore(s=>s.currentStage),stages=useTournamentStore(s=>s.stages),stage=stages.find(s=>s.id===current)
  const view=visibleCallboard(board,eventId,current,stage?.players.map(p=>p.id)??[]),names=new Map(stage?.players.map(p=>[p.id,p.name])??[])
  const nameList=(ids:string[])=>ids.map(id=>names.get(id)).join(' / ')
  if (!preview) return <OBSFrame className="callboard-display obs-callboard">
    <OBSHeader title={stage?.name ?? '赛事叫号'} subtitle="选手叫号 · NOW PLAYING" status={view.stale ? '等待载入名单' : `${view.waiting} 人候场`}/>
    <div className="obs-callboard-current" key={view.current?.id ?? (view.stale ? 'stale' : 'waiting')}><span className="obs-eyebrow">{view.current ? 'PLEASE TAKE YOUR SEAT · 请上机' : '当前批次'}</span>
      {view.current ? <div className="obs-callboard-players" data-count={view.current.playerIds.length}>{view.current.playerIds.map((id, i) => <div className="obs-callboard-player" key={id} style={{ '--reveal-delay': `${i * 100}ms` } as React.CSSProperties}><span>PLAYER {String(i + 1).padStart(2, '0')}</span><strong title={names.get(id)}>{names.get(id)}</strong></div>)}</div> : <h2>{view.stale ? '等待叫号' : board.items.length && !view.next.length ? '本阶段叫号已结束' : '准备开始'}</h2>}
    </div>
    {view.next.length > 0 && <div className="callboard-next">{view.next.map((batch, i) => <div key={batch.id}><span>{i === 0 ? '下一批 · UP NEXT' : '随后 · ON DECK'}</span><strong title={nameList(batch.playerIds)}>{nameList(batch.playerIds)}</strong></div>)}</div>}
    {!view.stale && board.notice && <p className="obs-callboard-notice">{board.notice}</p>}
  </OBSFrame>
  return <div className={`callboard-display ${preview?'callboard-preview':'obs-callboard'}`}>
    <div className="callboard-heading"><span>{stage?.name??'赛事叫号'}</span><span>{view.stale?'等待载入名单':`${view.waiting} 人候场`}</span></div>
    <div className="callboard-now"><span className="field-caption">{view.current?'请上机':'当前批次'}</span><strong>{view.current?nameList(view.current.playerIds):view.stale?'等待叫号':board.items.length&&!view.next.length?'本阶段叫号已结束':'准备开始'}</strong></div>
    {view.next.length>0&&<div className="callboard-next">{view.next.map((batch,i)=><div key={batch.id}><span>{i===0?'下一批':'随后'}</span><strong>{nameList(batch.playerIds)}</strong></div>)}</div>}
    {!view.stale&&<p>{board.notice}</p>}
  </div>
}
