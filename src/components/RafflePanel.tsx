import { useEffect, useRef, useState } from 'react'
import { Download, Gift, X } from 'lucide-react'
import { useTournamentStore } from '../store/tournamentStore'
import { raffleActions, useRaffleStore } from '../store/raffleStore'
import { displayRaffle, eligiblePlayers, manualPool } from '../lib/raffle'
import { download } from '../lib/storage'
import { useNotice } from './Notice'
import Select from './Select'
import OBSLink from './OBSLink'
import AnimatedDisclosure from './AnimatedDisclosure'
import RaffleResults, { useRevealCount } from './RaffleResults'

export default function RafflePanel({onClose}:{onClose?:()=>void}) {
  const {data,error} = useRaffleStore()
  const stages = useTournamentStore(s => s.stages), currentStage = useTournamentStore(s => s.currentStage)
  const [source,setSource] = useState(data.source === '手动名单' ? 'manual' : data.source.startsWith('当前阶段') ? 'current' : 'initial'), [names,setNames] = useState(data.source === '手动名单' ? data.pool.map(p=>p.name).join('\n') : '')
  const [title,setTitle] = useState(data.title), [count,setCount] = useState(String(data.count)), [working,setWorking] = useState(false)
  const [historyPage,setHistoryPage] = useState(0)
  const file = useRef<HTMLInputElement>(null), heading = useRef<HTMLHeadingElement>(null)
  const notice = useNotice(), display = displayRaffle(data), revealed = useRevealCount(display)
  const busy = data.phase === 'drawing' || (data.phase === 'revealed' && revealed < (data.history[0]?.winners.length ?? 0))
  const eligible = eligiblePlayers(data)
  const savedNames = data.source === '手动名单' ? data.pool.map(p=>p.name).join('\n') : ''
  // Embedded drawers may move to their heading; the standalone page retains its hero at the top.
  useEffect(() => {if(onClose){heading.current?.focus({preventScroll:true});heading.current?.scrollIntoView({block:'start',behavior:'instant'})}},[onClose])
  useEffect(() => {setTitle(data.title); setCount(String(data.count))},[data.title,data.count])
  useEffect(() => {setSource(data.source === '手动名单' ? 'manual' : data.source.startsWith('当前阶段') ? 'current' : 'initial'); setNames(savedNames)},[data.source,savedNames])
  const run = async (action:()=>Promise<void>) => {setWorking(true); try {await action()} catch(e) {notice(e instanceof Error ? e.message : '抽奖操作失败。')} finally {setWorking(false)}}
  const loadPool = () => run(async () => {
    const selected = source === 'initial' ? stages[0] : stages.find(s => s.id === currentStage)!
    const pool = source === 'manual' ? manualPool(names) : selected.players
    const label = source === 'manual' ? '手动名单' : `${source === 'initial' ? '初始选手' : '当前阶段'} · ${selected.name}`
    await raffleActions.pool(pool,label)
    notice(`已载入 ${useRaffleStore.getState().data.pool.length} 人，同名合并，既有中奖记录保留。`)
  })
  const page = Math.min(historyPage,Math.max(0,Math.ceil(data.history.length/10)-1))
  return <section className="panel raffle-panel" aria-labelledby="raffle-title">
    <div className="section-title"><div><span className="eyebrow">LUCKY DRAW</span><h2 ref={heading} tabIndex={-1} id="raffle-title">赛事抽奖</h2></div><div className="row"><OBSLink raffle/>{onClose && <button className="icon-button" aria-label="收起赛事抽奖" onClick={onClose}><X size={21}/></button>}</div></div>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="raffle-layout"><div className="raffle-controls">
      <fieldset disabled={busy || working || !!error}>
        <label>名单来源<Select label="抽奖名单来源" value={source} options={[{value:'initial',label:'初始选手名单'},{value:'current',label:'当前阶段选手'},{value:'manual',label:'手动录入名单'}]} onChange={setSource}/></label>
        {source === 'manual' && <label>每行一位昵称<textarea aria-label="抽奖手动名单" rows={5} value={names} maxLength={810000} placeholder={'小舞\n小萌\n小星'} onChange={e=>setNames(e.target.value)}/></label>}
        <button onClick={loadPool}>载入抽奖名单</button>
        <p className="hint">{data.source || '尚未载入名单'} · {data.pool.length} 人</p>
        <div className="raffle-config"><label>抽奖标题<input aria-label="抽奖标题" maxLength={80} value={title} onChange={e=>setTitle(e.target.value)}/></label><label>抽取人数<input aria-label="抽取人数" type="number" min={1} max={10} step={1} value={count} onChange={e=>setCount(e.target.value)}/></label></div>
        <label className="checkbox"><input type="checkbox" checked={data.preventRepeat} onChange={e=>{const preventRepeat=e.target.checked; void run(()=>raffleActions.configure({preventRepeat}))}}/>避免重复中奖</label>
        <p className="hint">{eligible.length} 人可抽取 · 每轮 1–10 人；每轮内始终不重复。同名视为一人。</p>
      </fieldset>
      <div className="raffle-draw-actions">{data.phase === 'drawing' ? <button className="primary" disabled={working || !!error} onClick={()=>run(raffleActions.reveal)}><Gift size={18}/>揭晓中奖者</button> : <button className="primary" disabled={busy || working || !eligible.length || !!error} onClick={()=>run(()=>raffleActions.draw({title:title.trim() || '赛事抽奖',count:Number(count)}))}><Gift size={18}/>{data.phase === 'revealed' ? '抽取下一轮' : '开始抽取'}</button>}
      {data.phase === 'revealed' && <button disabled={busy || working} onClick={()=>run(raffleActions.standby)}>回到待机</button>}</div>
      {data.phase === 'drawing' && <p className="hint" role="status">本轮已保存，点击揭晓；刷新后仍可继续。</p>}
      <details className="raffle-pool inline-disclosure"><summary>查看可抽取名单（{eligible.length} 人）</summary><p>{eligible.slice(0,100).map(p=>p.name).join(' · ') || '暂无可抽取选手'}{eligible.length>100 ? ` · 另 ${eligible.length-100} 人` : ''}</p></details>
    </div><div className="raffle-stage"><h3 className="raffle-custom-title">{display.title}</h3><RaffleResults data={display}/></div></div>
    <AnimatedDisclosure title={`中奖记录 · ${data.history.length} 轮`} className="raffle-history"><div className="raffle-history-body">{!data.history.length && <p className="hint">揭晓后自动记录。更换名单不会清除记录。</p>}
      {data.history.slice(page*10,page*10+10).map((round,i)=><div className="raffle-history-row" key={round.id}><div><strong>第 {data.history.length-page*10-i} 轮 · {round.title}</strong><time>{new Date(round.timestamp).toLocaleString('zh-CN',{hour12:false})}</time></div><p>{round.id === data.history[0]?.id && busy ? '正在揭晓…' : round.winners.map(p=>p.name).join(' / ')}</p></div>)}
      {data.history.length>10 && <div className="pagination"><span>{page+1} / {Math.ceil(data.history.length/10)}</span><div className="row"><button disabled={!page} onClick={()=>setHistoryPage(page-1)}>上一页</button><button disabled={(page+1)*10>=data.history.length} onClick={()=>setHistoryPage(page+1)}>下一页</button></div></div>}
      <div className="row wrap"><button disabled={!!error || busy} onClick={()=>download('赛事抽奖备份.json',JSON.stringify(data,null,2))}><Download size={15}/>导出抽奖备份</button><button disabled={working || busy} onClick={()=>file.current?.click()}>恢复抽奖备份</button><button className="danger" disabled={working || busy} onClick={()=>{if(window.confirm('重置将清空抽奖名单及所有中奖记录，之后可重新中奖。赛事成绩不受影响。是否继续？'))void run(raffleActions.reset)}}>重置抽奖</button></div>
      <p className="hint">抽奖独立保存；赛事备份与重置赛事不包含抽奖。开启新赛事时，请在此重置抽奖。</p>
      <input ref={file} className="sr-only" type="file" accept=".json" onChange={async e=>{const selected=e.target.files?.[0];e.target.value='';if(!selected)return;if(selected.size>10*1024*1024){notice('备份文件不能超过 10 MB。');return}const text=await selected.text();if(window.confirm('恢复将替换抽奖名单和中奖记录，是否继续？'))void run(()=>raffleActions.restore(text))}}/>
    </div></AnimatedDisclosure>
  </section>
}
