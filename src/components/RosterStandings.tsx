import { useMemo, useRef, useState, type ReactNode } from 'react'
import { Trash2 } from 'lucide-react'
import type { Player, Stage } from '../types'
import { rosterStandings } from '../lib/rosterStandings'
import { useRankMotion } from '../hooks/useRankMotion'
import Select from './Select'
import MorphIcon from './MorphIcon'
import OBSScore from './OBSScore'

export default function RosterStandings({stage,dirty,renderRating,onGroup,onRemove}:{stage:Stage;dirty:boolean;renderRating:(player:Player)=>ReactNode;onGroup:(id:string,group:string)=>void;onRemove:(player:Player)=>void}) {
  const rows=useMemo(()=>rosterStandings(stage),[stage]),[page,setPage]=useState(0)
  const pages=Math.max(1,Math.ceil(rows.length/40)),actualPage=Math.min(page,pages-1),visible=rows.slice(actualPage*40,actualPage*40+40)
  const body=useRef<HTMLTableSectionElement>(null)
  useRankMotion(body,JSON.stringify(visible.map(p=>[p.id,p.rank,p.score,p.status])),`${stage.id}:${actualPage}`)
  return <>
    <p className="roster-ranking-note" role="status">{stage.locked?'晋级已确认 · 当前显示正式排名':dirty?'有未保存成绩 · 排名将在保存后更新':'按已保存成绩实时排序 · 晋级区为暂列，确认晋级后生效'}{stage.rankingMethod==='group'?' · 每组独立排名':''}</p>
    <div className="table-scroll"><table className="players-table roster-table roster-live-table"><thead><tr><th>排名</th><th>选手昵称</th><th>rating</th>{stage.rankingMethod==='group'&&<th>组别</th>}<th>完成率合计</th><th>DX 合计</th><th>成绩进度</th><th>晋级状态</th><th aria-label="操作"/></tr></thead><tbody ref={body}>{visible.map(p=><tr key={p.id} data-player-id={p.id} data-status={p.status}>
      <td className="roster-rank mono">{p.rank===null?'—':`#${p.rank}`}</td><td><strong title={p.name}>{p.name}</strong></td><td>{renderRating(p)}</td>
      {stage.rankingMethod==='group'&&<td><Select label={`${p.name} 组别`} disabled={stage.locked} value={stage.groups?.find(g=>g.playerIds.includes(p.id))?.id??''} options={[{value:'',label:'未分组'},...(stage.groups??[]).map(g=>({value:g.id,label:g.name}))]} onChange={v=>onGroup(p.id,v)}/></td>}
      <td className="roster-score mono"><OBSScore value={p.score}/>{p.score!==null&&'%'}</td><td className="mono">{p.dxScore??'—'}</td><td><span className="muted">{stage.scoreMode==='songs'?`${stage.songs.filter(s=>p.chartScores?.[s.id]?.score!=null).length} / ${stage.songs.length} 首`:p.score===null?'待录入':'已录入'}</span></td>
      <td><span className={`rank-status is-${p.status}`}><MorphIcon name={p.status==='advanced'||p.status==='in-range'?'check':p.status==='tie'?'plus':p.status==='repechage'?'down':'minus'} size={15}/>{p.label}</span></td>
      <td>{!stage.locked&&<button className="icon-button danger" aria-label={`删除选手 ${p.name}`} onClick={()=>onRemove(p)}><Trash2 size={15}/></button>}</td>
    </tr>)}</tbody></table>{!rows.length&&<div className="empty roster-empty"><p>上传表格，或手动添加选手。</p></div>}</div>
    {pages>1&&<div className="pagination"><span>{actualPage+1} / {pages} 页 · 共 {rows.length} 人</span><div className="row"><button disabled={!actualPage} onClick={()=>setPage(actualPage-1)}>上一页</button><button disabled={actualPage+1>=pages} onClick={()=>setPage(actualPage+1)}>下一页</button></div></div>}
  </>
}
