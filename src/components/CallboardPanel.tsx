import { useState } from 'react'
import { advanceCallboard, createCallboard, editCallBatch, visibleCallboard } from '../lib/callboard'
import { setCallboard, useCallboard } from '../store/callboardStore'
import { useTournamentStore } from '../store/tournamentStore'
import { useNotice } from './Notice'
import Select from './Select'
import CallboardDisplay from './CallboardDisplay'
import { setDirector } from '../store/directorStore'
const labels={waiting:'候场',current:'正在上机',done:'已结束',skipped:'已跳过'}
export default function CallboardPanel(){
  const board=useCallboard(s=>s.data),eventId=useTournamentStore(s=>s.eventId),stages=useTournamentStore(s=>s.stages),current=useTournamentStore(s=>s.currentStage),stage=stages.find(s=>s.id===current)
  const [size,setSize]=useState(board.batchSize),[query,setQuery]=useState(''),[page,setPage]=useState(0),[showEnded,setShowEnded]=useState(false),notice=useNotice()
  const view=visibleCallboard(board,eventId,current,stage?.players.map(p=>p.id)??[]),names=new Map(stage?.players.map(p=>[p.id,p.name])??[])
  const removed=!view.stale&&board.items.some(item=>item.playerIds.some(id=>!names.has(id))),queued=new Set(board.items.flatMap(item=>item.playerIds)),newPlayers=!view.stale&&(stage?.players.filter(p=>!queued.has(p.id)).length??0)
  const run=(fn:()=>void)=>{try{fn()}catch(e){notice(e instanceof Error?e.message:'操作失败。')}}
  const items=view.stale?[]:board.items.filter(item=>(showEnded||['waiting','current'].includes(item.status))&&item.playerIds.some(id=>(names.get(id)??'').toLowerCase().includes(query.toLowerCase())))
  const currentPage=Math.min(page,Math.max(0,Math.ceil(items.length/40)-1))
  return <section className="panel content-panel callboard-panel">
    <div className="section-title"><h2>选手叫号板</h2><span className="tag">{stage?.name??'尚未开始'}</span></div>
    <p className="reading-copy">载入当前阶段名单，按批次叫选手上机。手机与电脑操作同步，OBS 选择「选手叫号」即可展示。</p>
    <div className="control-row"><label className="form-field">每批上机人数<Select label="每批上机人数" value={String(size)} options={[1,2,3,4].map(n=>({value:String(n),label:`${n} 人`}))} onChange={v=>setSize(Number(v))}/></label><button disabled={!stage?.players.length} onClick={()=>run(()=>{if(!view.stale&&board.items.length&&!confirm('重新载入将重建本阶段叫号顺序，可在操作日志撤销。继续？'))return;setCallboard(()=>createCallboard(eventId??'legacy-event',current,stage!.players.map(p=>p.id),size,board.notice));setPage(0)})}>载入本阶段名单</button><button onClick={()=>setDirector({scene:'callboard'})}>在 OBS 展示叫号</button></div>
    <CallboardDisplay preview/>
    {removed?<p className="hint" role="status">名单中有选手被移除，请重新载入本阶段名单后继续叫号。</p>:!!newPlayers&&<p className="hint" role="status">当前阶段有 {newPlayers} 名新选手尚未加入叫号队列，可重新载入名单。</p>}
    <div className="row wrap"><button className="primary" disabled={view.stale||removed||(!view.current&&!view.next.length)} onClick={()=>run(()=>setCallboard(b=>advanceCallboard(b)))}>{view.current?view.next.length?'结束并叫下一批':'结束当前批次':'开始叫号'}</button><button disabled={view.stale||removed||!view.current} onClick={()=>run(()=>setCallboard(b=>advanceCallboard(b,true)))}>跳过当前批次</button></div>
    {!view.stale&&<><label className="form-field">候场提示<input maxLength={120} value={board.notice} onChange={e=>run(()=>setCallboard(b=>({...b,notice:e.target.value})))}/></label><div className="callboard-list-tools"><label className="form-field">搜索选手<input type="search" value={query} onChange={e=>{setQuery(e.target.value);setPage(0)}} placeholder="选手昵称"/></label><label className="checkbox"><input type="checkbox" checked={showEnded} onChange={e=>{setShowEnded(e.target.checked);setPage(0)}}/><span>显示已结束与已跳过</span></label></div>
    <ol className="callboard-queue">{items.slice(currentPage*40,currentPage*40+40).map(item=><li key={item.id}><div><span className="field-caption">{labels[item.status]}</span><strong>{item.playerIds.map(id=>names.get(id)??'选手已移出名单').join(' / ')}</strong></div><div className="row wrap">{item.status==='waiting'?<><button aria-label="批次前移" onClick={()=>run(()=>setCallboard(b=>editCallBatch(b,item.id,'up')))}>前移</button><button aria-label="批次后移" onClick={()=>run(()=>setCallboard(b=>editCallBatch(b,item.id,'down')))}>后移</button><button onClick={()=>run(()=>setCallboard(b=>editCallBatch(b,item.id,'skip')))}>跳过</button></>:item.status!=='current'&&<button onClick={()=>run(()=>setCallboard(b=>editCallBatch(b,item.id,'return')))}>重新候场</button>}</div></li>)}</ol>{items.length>40&&<div className="row wrap"><button disabled={!currentPage} onClick={()=>setPage(currentPage-1)}>上一页</button><span>{currentPage+1} / {Math.ceil(items.length/40)}</span><button disabled={(currentPage+1)*40>=items.length} onClick={()=>setPage(currentPage+1)}>下一页</button></div>}</>}
  </section>
}
