import { useState } from 'react'
import type { ChartScore, Player, Stage, Tiebreak } from '../types'
import { activeTiebreaks, cutoffTies, parseScoreInput, scoreFingerprint, tiebreakPlaces } from '../lib/scoring'
import { useTournamentStore } from '../store/tournamentStore'
import { useNotice } from './Notice'
import ScoreInput from './ScoreInput'

function TiebreakEditor({stage,players,pending,index}:{stage:Stage;players:Player[];pending:boolean;index:number}){
  const [draft,setDraft]=useState<Record<string,{score:string;dxScore:string}>>({}),[note,setNote]=useState(''),[page,setPage]=useState(0),[error,setError]=useState(''),[fingerprint,setFingerprint]=useState(()=>scoreFingerprint(stage)),notice=useNotice(),stale=!!(Object.keys(draft).length||note)&&fingerprint!==scoreFingerprint(stage)
  const pages=Math.ceil(players.length/40),visible=players.slice(page*40,page*40+40),ready=players.filter(p=>draft[p.id]?.score.trim()).length
  const change=(id:string,field:keyof ChartScore,text:string)=>{if(!Object.keys(draft).length&&!note)setFingerprint(scoreFingerprint(stage));setDraft(d=>({...d,[id]:{...(d[id]??{score:'',dxScore:''}),[field]:text}}))}
  const submit=()=>{try{
    const current=useTournamentStore.getState().stages.find(s=>s.id===stage.id)
    if(!current||scoreFingerprint(current)!==fingerprint)throw new Error('原成绩或规则已变化，请重新核对加赛名单。')
    const scores=Object.fromEntries(players.map(p=>{try{const d=draft[p.id];if(!d?.score.trim())throw new Error('请填写加赛完成率。');return [p.id,{score:parseScoreInput(d.score,'score'),dxScore:parseScoreInput(d.dxScore,'dxScore')}]}catch(e){throw new Error(`${p.name}：${e instanceof Error?e.message:'成绩无效。'}`)}}))
    useTournamentStore.getState().addTiebreak(stage.id,scores,note);setDraft({});setNote('');setError('');notice('本轮加赛已保存，晋级排名已更新。')
  }catch(e){const message=e instanceof Error?e.message:'加赛保存失败。';setError(message);notice(message)}}
  return <form className="tiebreak-editor" onSubmit={e=>{e.preventDefault();submit()}}><div className="section-title"><h3>同分组 {index+1} · {players.length} 人争取 {tiebreakPlaces(stage,players)} 个名额</h3><span className="tag">{ready} / {players.length} 已填</span></div><p className="hint">原成绩保留。先比较本轮加赛完成率，再比较 DX 分；仍同分的选手进入下一轮。</p>
    <label className="form-field">加赛歌曲或说明<input aria-label={`同分组 ${index+1} 加赛说明`} placeholder="例如：加赛歌曲名称" maxLength={160} disabled={pending} value={note} onChange={e=>{if(!Object.keys(draft).length&&!note)setFingerprint(scoreFingerprint(stage));setNote(e.target.value)}}/></label>
    <div className="table-scroll score-matrix"><table><thead><tr><th>选手 / 原成绩</th><th>本轮完成率</th><th>本轮 DX 分</th></tr></thead><tbody>{visible.map(p=><tr key={p.id}><td><strong>{p.name}</strong><small>原成绩 {p.score?.toFixed(4)}% · DX {p.dxScore??'—'}</small></td><td data-label="本轮完成率"><ScoreInput field="score" label={`${p.name} 加赛完成率`} value={draft[p.id]?.score??''} disabled={pending} onChange={v=>change(p.id,'score',v)}/></td><td data-label="本轮 DX 分"><ScoreInput field="dxScore" label={`${p.name} 加赛 DX`} value={draft[p.id]?.dxScore??''} disabled={pending} onChange={v=>change(p.id,'dxScore',v)}/></td></tr>)}</tbody></table></div>
    {pages>1&&<div className="pagination"><span>{page+1} / {pages} 页</span><div className="row"><button type="button" disabled={!page} onClick={()=>setPage(page-1)}>上一页</button><button type="button" disabled={page+1===pages} onClick={()=>setPage(page+1)}>下一页</button></div></div>}
    <div className="score-save-bar"><p className="hint">{stale?'原成绩或规则已变化，请先核对并重置本轮输入。':pending?'请先保存上方原成绩，再填写加赛。':'填齐本组完成率后保存，原成绩不会被覆盖。'}</p><div className="row wrap">{stale&&<button type="button" onClick={()=>{setDraft({});setNote('');setError('');setFingerprint(scoreFingerprint(stage))}}>重置本轮输入</button>}<button data-save-scores className="primary" type="submit" disabled={pending||stale||ready!==players.length}>保存本轮加赛</button></div></div>{error&&<p className="error" role="alert">{error}</p>}
  </form>
}
function RoundHistory({round,index,stage,active}:{round:Tiebreak;index:number;stage:Stage;active:boolean}){
  const [open,setOpen]=useState(false),[page,setPage]=useState(0),rows=open?Object.entries(round.scores):[],pages=Math.ceil(rows.length/40)
  return <details className="inline-disclosure round-history" onToggle={e=>setOpen(e.currentTarget.open)}><summary><span>第 {index+1} 轮 · {round.note||'加赛'}<small>{active?'用于当前排名':'原成绩或规则变化，仅保留记录'} · {new Date(round.timestamp).toLocaleString('zh-CN')}</small></span></summary>{open&&<><div className="table-scroll"><table><thead><tr><th>选手</th><th>加赛完成率</th><th>加赛 DX 分</th></tr></thead><tbody>{rows.slice(page*40,page*40+40).map(([id,score])=><tr key={id}><td>{stage.players.find(p=>p.id===id)?.name??id}</td><td className="mono">{score.score?.toFixed(4)}%</td><td className="mono">{score.dxScore??'—'}</td></tr>)}</tbody></table></div>{pages>1&&<div className="pagination"><span>{page+1} / {pages} 页</span><div className="row"><button disabled={!page} onClick={()=>setPage(page-1)}>上一页</button><button disabled={page+1===pages} onClick={()=>setPage(page+1)}>下一页</button></div></div>}</>}</details>
}
export default function TiebreakPanel({stage,pending}:{stage:Stage;pending:boolean}){
  const ties=cutoffTies(stage),active=activeTiebreaks(stage)
  if(!ties.length&&!stage.tiebreaks?.length)return null
  const complete=stage.players.every(p=>p.score!==null)
  return <section className="panel tiebreak-panel content-panel" aria-labelledby="tiebreak-title"><div className="section-title"><div><span className="eyebrow">TIEBREAK</span><h2 id="tiebreak-title">同分加赛</h2></div><span className="tag">{ties.length?`${ties.length} 组待处理`:complete?'同分已解决':'等待成绩补齐'}</span></div>{!ties.length&&<p className="reading-copy">{complete?'当前晋级分界没有同分。核对下方记录后，可以确认晋级。':'原成绩尚未填齐。保存所有选手成绩后，再判断是否需要加赛。'}</p>}{!stage.locked&&ties.map((players,index)=><TiebreakEditor key={players.map(p=>p.id).sort().join(',')} stage={stage} players={players} pending={pending} index={index}/>)}{stage.tiebreaks?.map((round,index)=><RoundHistory key={round.id} round={round} index={index} stage={stage} active={active.some(r=>r.id===round.id)}/>)}</section>
}
