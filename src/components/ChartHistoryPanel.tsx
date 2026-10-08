import { useState } from 'react'
import { updateChartHistory, useChartHistory, songIdentity } from '../store/chartHistoryStore'
import { useSongStore } from '../store/songStore'
import { useNotice } from './Notice'
import AnimatedDisclosure from './AnimatedDisclosure'
import Select from './Select'

export default function ChartHistoryPanel(){
  const {data}=useChartHistory(),[search,setSearch]=useState(''),pools=useSongStore(s=>s.pools),notice=useNotice()
  const songs=[...new Map(pools.flatMap(p=>p.songs).map(s=>[songIdentity(s),s])).values()]
  const run=(fn:()=>void)=>{try{fn()}catch(e){notice(e instanceof Error?e.message:String(e))}}
  return <AnimatedDisclosure title="抽谱去重与排除" meta={`已记录 ${data.entries.length} 首`} className="history-controls">
    <div className="panel-content history-content">
      <div className="control-row"><label className="form-field">去重范围<Select label="抽谱去重范围" value={data.scope} options={[{value:'stage',label:'本阶段不重复'},{value:'event',label:'整场赛事不重复'},{value:'none',label:'允许重复'}]} onChange={scope=>run(()=>updateChartHistory({...data,scope:scope as typeof data.scope}))}/></label><button onClick={()=>{if(confirm('清空所有抽谱历史？指定排除歌曲将保留。'))run(()=>updateChartHistory({...data,entries:[]}))}}>清空抽谱历史</button></div>
      <p className="hint reading-copy">同一首歌的不同难度也视为重复。歌曲不足时会提示，抽取历史会保留。</p>
      <div className="form-block"><label className="form-field">排除指定歌曲<input aria-label="搜索排除歌曲" placeholder="搜索需要排除的歌曲" value={search} onChange={e=>setSearch(e.target.value)}/></label><p className="hint">已排除 {data.excluded.length} 首 · 搜索最多展示 30 项</p>
        <div className="exclusion-list">{songs.filter(s=>search?s.name.toLowerCase().includes(search.toLowerCase()):data.excluded.includes(songIdentity(s))).slice(0,30).map(s=><label key={songIdentity(s)} className="checkbox"><input type="checkbox" checked={data.excluded.includes(songIdentity(s))} onChange={e=>run(()=>updateChartHistory({...data,excluded:e.target.checked?[...data.excluded,songIdentity(s)]:data.excluded.filter(id=>id!==songIdentity(s))}))}/><span>{s.name}</span></label>)}</div>
      </div>
      <details className="inline-disclosure"><summary>最近抽取记录</summary><div className="record-list">{data.entries.length?data.entries.slice(-30).reverse().map((entry,i)=><div className="record-row" key={`${entry.time}-${i}`}><strong>{entry.name}</strong><time>{new Date(entry.time).toLocaleString('zh-CN')}</time></div>):<p className="hint">抽取歌曲后，记录会显示在这里。</p>}</div></details>
    </div>
  </AnimatedDisclosure>
}
