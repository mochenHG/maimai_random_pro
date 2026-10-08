import { useEffect, useRef, useState } from 'react'
import type { ChartScore, Stage } from '../types'
import { parseScoreInput, type ScoreEdit } from '../lib/scoring'
import { useTournamentStore } from '../store/tournamentStore'
import { useNotice } from './Notice'
import Select from './Select'
import ScoreInput from './ScoreInput'
import TiebreakPanel from './TiebreakPanel'

interface Draft extends Omit<ScoreEdit,'value'> {text:string;mode:'total'|'songs'}
const draftKey=(mode:string,playerId:string,songId:string|undefined,field:string)=>JSON.stringify([mode,playerId,songId??'',field])
function readDraft(key:string):Record<string,Draft>{
  try{const data=JSON.parse(sessionStorage.getItem(key)??'{}');if(!data||Array.isArray(data)||typeof data!=='object')return {}
    return Object.fromEntries(Object.entries(data).slice(0,50000).filter(([,raw])=>{const d=raw as Draft;return d&&typeof d.playerId==='string'&&['songs','total'].includes(d.mode)&&['score','dxScore'].includes(d.field)&&typeof d.text==='string'&&d.text.length<=24&&(d.expected===null||typeof d.expected==='number')&&(!d.songId||typeof d.songId==='string')})) as Record<string,Draft>
  }catch{return {}}
}
function writeDraft(key:string,draft:Record<string,Draft>){try{if(Object.keys(draft).length)sessionStorage.setItem(key,JSON.stringify(draft));else sessionStorage.removeItem(key);return true}catch{return false}}
export default function StageScoring({stage,onDirtyChange}:{stage:Stage;onDirtyChange:(dirty:boolean)=>void}){
  const eventId=useTournamentStore(s=>s.eventId),storageKey=`maimai-pro-score-draft:${eventId}:${stage.id}`
  const [draft,setDraft]=useState<Record<string,Draft>>(()=>readDraft(storageKey)),[songId,setSongId]=useState(''),[search,setSearch]=useState(''),[page,setPage]=useState(0),[error,setError]=useState(''),[saved,setSaved]=useState(false),[storageFailed,setStorageFailed]=useState(false),[pendingOpen,setPendingOpen]=useState(false),[pendingPage,setPendingPage]=useState(0)
  const notice=useNotice(),mode=stage.scoreMode??'total',song=stage.songs.find(s=>s.id===songId)??stage.songs[0],changes=Object.values(draft),dirty=!!changes.length
  const latestDraft=useRef(draft);latestDraft.current=draft
  useEffect(()=>{onDirtyChange(dirty);return()=>onDirtyChange(false)},[dirty,onDirtyChange])
  // A local draft survives route changes and refreshes, and never goes to OBS before Save.
  useEffect(()=>{const flush=()=>{if(!writeDraft(storageKey,latestDraft.current))setStorageFailed(true)},hidden=()=>{if(document.hidden)flush()};window.addEventListener('pagehide',flush);document.addEventListener('visibilitychange',hidden);return()=>{flush();window.removeEventListener('pagehide',flush);document.removeEventListener('visibilitychange',hidden)}},[storageKey])
  useEffect(()=>{const timer=setTimeout(()=>{if(!writeDraft(storageKey,latestDraft.current))setStorageFailed(true)},180);return()=>clearTimeout(timer)},[draft,storageKey])
  const clearDraft=()=>{latestDraft.current={};writeDraft(storageKey,{});setDraft({});setError('')}
  const filtered=stage.players.filter(p=>p.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())),pages=Math.max(1,Math.ceil(filtered.length/40)),actualPage=Math.min(page,pages-1),players=filtered.slice(actualPage*40,actualPage*40+40)
  const completed=stage.players.filter(p=>p.score!==null).length,byId=new Map(stage.players.map(p=>[p.id,p])),pendingPlayers=new Set(changes.map(d=>d.playerId)),pendingPages=Math.max(1,Math.ceil(changes.length/40)),actualPendingPage=Math.min(pendingPage,pendingPages-1)
  const savedValue=(id:string,field:keyof ChartScore)=>{const p=byId.get(id)!;return mode==='songs'?p.chartScores?.[song?.id??'']?.[field]??null:p[field]}
  const value=(id:string,field:keyof ChartScore)=>draft[draftKey(mode,id,mode==='songs'?song?.id:undefined,field)]?.text??String(savedValue(id,field)??'')
  const change=(id:string,field:keyof ChartScore,text:string)=>{const key=draftKey(mode,id,mode==='songs'?song?.id:undefined,field),expected=savedValue(id,field);setDraft(prev=>{
    const next={...prev},before=prev[key];if(!before&&text===String(expected??''))return prev
    if(before&&text===String(before.expected??'')){delete next[key];return next}
    next[key]={playerId:id,songId:mode==='songs'?song?.id:undefined,field,text,expected:before?before.expected:expected,mode};return next
  });setSaved(false);setError('')}
  const save=()=>{try{
    if(changes.some(d=>d.mode!==mode))throw new Error('计分方式已在其他设备修改。请核对下方暂存记录，取消后重新录入。')
    const edits=changes.map(d=>{try{return {...d,value:parseScoreInput(d.text,d.field,mode)}}catch(e){throw new Error(`${stage.players.find(p=>p.id===d.playerId)?.name??'选手'}：${e instanceof Error?e.message:'成绩无效。'}`)}})
    useTournamentStore.getState().saveScores(stage.id,mode,edits);clearDraft();setSaved(true);notice('成绩已保存，排名已更新。')
  }catch(e){const message=e instanceof Error?e.message:'成绩保存失败。';setError(message);notice(message)}}
  return <><section className="panel scoring-panel content-panel" id="score-entry" aria-labelledby="score-entry-title">
    <div className="section-title"><div><span className="eyebrow">SCORE ENTRY</span><h2 id="score-entry-title">成绩录入</h2></div><span className="tag">{completed} / {stage.players.length} 人已完成</span></div>
    <div className="scoring-toolbar"><label className="form-field">计分方式<Select label="计分方式" disabled={stage.locked||dirty} value={mode} options={[{value:'songs',label:'逐曲录入 · 自动合计'},{value:'total',label:'直接录入合计'}]} onChange={v=>{try{useTournamentStore.getState().setScoreMode(stage.id,v as 'total'|'songs');setSaved(false)}catch(e){notice(e instanceof Error?e.message:'无法切换计分方式。')}}}/></label><label className="form-field">查找选手<input type="search" aria-label="查找计分选手" placeholder="输入昵称" value={search} onChange={e=>{setSearch(e.target.value);setPage(0)}}/></label></div>
    <p className="hint reading-copy">{mode==='songs'?'选择一首歌曲，按行填写选手成绩；完成率填齐后自动合计。':'按行填写每位选手的完成率合计。'}完成率必填，DX 分可留空。Tab 切换输入框，Enter 移至下一位；保存后更新排名与 OBS。两种方式的成绩分别保留。</p>
    {mode==='songs'&&!!stage.songs.length&&<div className="score-song-tabs" role="group" aria-label="选择计分歌曲">{stage.songs.map((s,i)=><button key={s.id} type="button" aria-pressed={song?.id===s.id} className={song?.id===s.id?'selected':''} onClick={()=>{setSongId(s.id);setPage(0)}}><span className="mono">{String(i+1).padStart(2,'0')}</span><span>{s.name}<small>{s.difficulty} · {stage.players.filter(p=>p.chartScores?.[s.id]?.score!=null).length}/{stage.players.length} 已录</small></span></button>)}</div>}
    {!stage.players.length?<div className="empty score-empty"><p>先在上方导入或添加选手。</p></div>:mode==='songs'&&!song?<div className="empty score-empty"><p>先设置本阶段歌曲，再逐曲录入成绩。</p></div>:<form className="score-entry-form" onSubmit={e=>{e.preventDefault();save()}}>
      <div className="table-scroll score-matrix"><table><thead><tr><th>选手</th><th>完成率{mode==='total'?'合计':''}</th><th>DX 分{mode==='total'?'合计':''}</th><th>本阶段进度</th></tr></thead><tbody>{players.map(p=>{const pending=pendingPlayers.has(p.id),count=stage.songs.filter(s=>p.chartScores?.[s.id]?.score!=null).length;return <tr key={p.id}><td><strong>{p.name}</strong>{pending&&<small>有未保存修改</small>}</td><td data-label="完成率"><ScoreInput field="score" label={`${p.name} ${mode==='songs'?song.name:'合计'} 完成率`} value={value(p.id,'score')} disabled={stage.locked} onChange={text=>change(p.id,'score',text)}/></td><td data-label="DX 分"><ScoreInput field="dxScore" label={`${p.name} ${mode==='songs'?song.name:'合计'} DX`} value={value(p.id,'dxScore')} disabled={stage.locked} onChange={text=>change(p.id,'dxScore',text)}/></td><td className="score-progress">{mode==='songs'?`${count} / ${stage.songs.length} 首`:p.score===null?'待录入':'已录入'}<small>已保存合计 {p.score===null?'—':`${p.score.toFixed(4)}%`}</small></td></tr>})}</tbody></table>{!players.length&&<div className="empty"><p>没有匹配的选手。</p></div>}</div>
      {pages>1&&<div className="pagination"><span>{actualPage+1} / {pages} 页 · {filtered.length} 人</span><div className="row"><button type="button" disabled={!actualPage} onClick={()=>setPage(actualPage-1)}>上一页</button><button type="button" disabled={actualPage+1>=pages} onClick={()=>setPage(actualPage+1)}>下一页</button></div></div>}
      <div className="score-save-bar"><p role="status">{stage.locked?'本阶段已锁定':dirty?`${changes.length} 项修改待保存 · 切换歌曲会保留暂存` :saved?'已保存 · 排名已更新':'当前显示已保存成绩'}{storageFailed&&<small>暂存不可用，请及时保存成绩。</small>}</p><div className="row wrap"><button type="button" disabled={!dirty} onClick={clearDraft}>取消修改</button><button data-save-scores type="submit" className="primary" disabled={!dirty||stage.locked}>保存成绩{dirty?`（${changes.length}）`:''}</button></div></div>
    </form>}
    {error&&<p className="error" role="alert">{error}</p>}
    {dirty&&<details className="inline-disclosure" onToggle={e=>setPendingOpen(e.currentTarget.open)}><summary>查看未保存修改（{changes.length}）</summary>{pendingOpen&&<><div className="pending-score-list">{changes.slice(actualPendingPage*40,actualPendingPage*40+40).map(d=><p key={draftKey(d.mode,d.playerId,d.songId,d.field)}>{byId.get(d.playerId)?.name??'选手已移除'} · {d.songId?stage.songs.find(s=>s.id===d.songId)?.name??'歌曲已移除':'合计'} · {d.field==='score'?'完成率':'DX 分'}：{String(d.expected??'未填写')} → {d.text||'留空'}</p>)}</div>{pendingPages>1&&<div className="pagination"><span>{actualPendingPage+1} / {pendingPages} 页</span><div className="row"><button onClick={()=>setPendingPage(actualPendingPage-1)} disabled={!actualPendingPage}>上一页</button><button onClick={()=>setPendingPage(actualPendingPage+1)} disabled={actualPendingPage+1===pendingPages}>下一页</button></div></div>}<button onClick={clearDraft}>取消所有未保存修改</button></>}</details>}
  </section><TiebreakPanel stage={stage} pending={dirty}/></>
}
