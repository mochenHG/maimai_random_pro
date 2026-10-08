import { useState } from 'react'
import { useOperations } from '../lib/operations'
import { undoOperation, useSyncStatus } from '../lib/sync'
import { download } from '../lib/storage'
import { useNotice } from './Notice'
import Select from './Select'
export default function OperationsPanel(){
  const items=useOperations(),sync=useSyncStatus(),notice=useNotice(),[filter,setFilter]=useState('all'),[page,setPage]=useState(0),[busy,setBusy]=useState('')
  const filtered=items.filter(item=>filter==='all'||item.category===filter),currentPage=Math.min(page,Math.max(0,Math.ceil(filtered.length/20)-1))
  return <section className="panel content-panel operations-panel" id="operations">
    <div className="section-title"><h2>操作日志与撤销</h2><span className="tag">主机最近 50 次</span></div>
    <p className="reading-copy">记录主机已确认的操作。撤销会恢复该记录所属的整项数据；有后续修改时，旧记录不能撤销。已揭晓中奖结果保留。</p>
    <div className="control-row"><label className="form-field">查看记录<Select label="日志分类" value={filter} onChange={v=>{setFilter(v);setPage(0)}} options={['all','赛事','叫号','导播','抽奖','抽谱','抽谱历史','曲库','筛选'].map(v=>({value:v,label:v==='all'?'全部操作':v}))}/></label><button disabled={!items.length} onClick={()=>download(`maimai-操作日志-${new Date().toISOString().slice(0,10)}.json`,JSON.stringify({version:1,exportedAt:new Date().toISOString(),operations:items},null,2))}>导出日志</button></div>
    {sync!=='connected'&&<p className="hint" role="status">当前未连接主机，日志可能尚未更新；连接恢复后可撤销。</p>}
    {!filtered.length?<div className="empty">{sync==='connected'?'暂时没有匹配的操作记录。':'等待主机操作记录。'}</div>:<ol className="operation-list">{filtered.slice(currentPage*20,currentPage*20+20).map(item=><li key={item.id}><div className="operation-info"><div><span className="tag">{item.category}</span><strong>{item.label}</strong></div><p className="hint"><time>{new Date(item.time).toLocaleString('zh-CN')}</time><span>{item.actor}</span></p></div>{item.canUndo?<button disabled={sync!=='connected'||!!busy} onClick={async()=>{if(!confirm(`撤销「${item.label}」将恢复此前的整项${item.category}数据，并同步所有设备。继续？`))return;setBusy(item.id);try{await undoOperation(item.id,item.revision);notice('主机已确认撤销，所有设备已同步。')}catch(e){notice(e instanceof Error?e.message:'撤销失败。')}finally{setBusy('')}}}>{busy===item.id?'撤销中…':'撤销'}</button>:<span className="hint operation-state">{item.undone?'已撤销':item.undoOf?'撤销记录':'已归档'}</span>}</li>)}</ol>}
    {filtered.length>20&&<div className="row wrap"><button disabled={!currentPage} onClick={()=>setPage(currentPage-1)}>上一页</button><span>{currentPage+1} / {Math.ceil(filtered.length/20)}</span><button disabled={(currentPage+1)*20>=filtered.length} onClick={()=>setPage(currentPage+1)}>下一页</button></div>}
    <p className="hint">仅提供仍有效且保留恢复副本的撤销。抽谱和历史互有关联，使用原历史管理与快照恢复；日志导出不含恢复副本、配对码或中奖者姓名。</p>
  </section>
}
