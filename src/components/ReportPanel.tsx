import { useState } from 'react'
import type { Stage } from '../types'
import { exportResultImage, exportWorkbook } from '../lib/reports'
import { useNotice } from './Notice'
import AnimatedDisclosure from './AnimatedDisclosure'
import Select from './Select'

export default function ReportPanel({stages,stage}:{stages:Stage[];stage:Stage}){
  const notice=useNotice(),[busy,setBusy]=useState(false),[page,setPage]=useState(0)
  const run=async(fn:()=>Promise<void>)=>{setBusy(true);try{await fn();notice('已生成导出文件。')}catch(e){notice(e instanceof Error?e.message:'导出失败。')}finally{setBusy(false)}}
  const pages=Math.max(1,Math.ceil(stage.players.length/25))
  return <AnimatedDisclosure title="赛后报告导出" className="report-panel"><div className="panel-content report-content">
    <div className="export-option"><div><h3>完整赛事表格</h3><p className="hint reading-copy">包含所有阶段的逐曲成绩、排名、晋级状态和加赛依据。</p></div><button disabled={busy} onClick={()=>void run(()=>exportWorkbook(stages))}>导出赛事表格</button></div>
    <div className="export-option"><div><h3>可分享的结果图片</h3><p className="hint reading-copy">导出当前阶段的排名，每页 25 人。</p></div><div className="control-row"><label className="form-field">图片页码<Select label="结果图片页码" value={Math.min(page,pages-1)} options={Array.from({length:pages},(_,i)=>({value:i,label:`第 ${i+1} 页 / 共 ${pages} 页`}))} onChange={v=>setPage(Number(v))}/></label><button disabled={busy||!stage.players.length} onClick={()=>void run(()=>exportResultImage(stage,Math.min(page,pages-1)))}>导出结果图片</button></div></div>
  </div></AnimatedDisclosure>
}
