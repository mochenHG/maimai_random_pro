import ChartHistoryPanel from '../components/ChartHistoryPanel'
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, RotateCcw, Search, Shuffle } from 'lucide-react'
import { DIFFICULTIES } from '../types'
import { useSongStore } from '../store/songStore'
import { parseLevel } from '../lib/songs'
import { useNotice } from '../components/Notice'
import SongCard from '../components/SongCard'
import OBSLink from '../components/OBSLink'
import { useDrawSettings } from '../hooks/useDrawSettings'
import Select from '../components/Select'
import RangeControl from '../components/RangeControl'
import { AnimatedTitle } from '../components/HeroMotion'
import AnimatedCount from '../components/AnimatedCount'
import { formatGrade, inSongRange, MAX_CONSTANT, MAX_GRADE } from '../lib/range'
export default function Draw({ openLibrary }: { openLibrary: () => void }) {
  const pools = useSongStore(s => s.pools); const selectedSongs = useSongStore(s => s.selectedSongs)
  const drawKey = useSongStore(s => s.drawKey)
  const notice = useNotice()
  const {settings,update,patch}=useDrawSettings(); const {difficulties,type,min,max,count,rangeMode}=settings
  const poolId=pools.some(p=>p.id===settings.poolId) ? settings.poolId : 'all'
  const setPoolId=(v:string)=>update('poolId',v); const setType=(v:string)=>update('type',v); const setCount=(v:number)=>update('count',v)
  const [query, setQuery] = useState(''); const q = useDeferredValue(query.trim().toLowerCase()); const [page, setPage] = useState(0)
  const minValue = rangeMode === 'constant' ? settings.constantMin : parseLevel(min); const maxValue = rangeMode === 'constant' ? settings.constantMax : parseLevel(max)
  const validRange = Number.isFinite(minValue) && Number.isFinite(maxValue) && minValue >= 0 && maxValue <= (rangeMode==='constant'?MAX_CONSTANT:MAX_GRADE) && minValue <= maxValue
  const songs = useMemo(() => [...new Map(pools.filter(p => poolId === 'all' || p.id === poolId).flatMap(p => p.songs).map(s => [s.id, s])).values()], [pools, poolId])
  const filtered = useMemo(() => validRange ? songs.filter(s => difficulties.includes(s.difficulty) && (type === 'all' || s.chartType === type) && inSongRange(s,rangeMode,minValue,maxValue) && (!q || `${s.name} ${s.id} ${s.author}`.toLowerCase().includes(q))) : [], [songs, difficulties, type, minValue, maxValue, validRange, q, rangeMode])
  const pages = Math.ceil(filtered.length / 24); const actualPage = Math.min(page, Math.max(0, pages - 1))
  const reset = () => { setPoolId('all'); update('difficulties',[...DIFFICULTIES]); setType('all'); patch({min:'1',max:'15',constantMin:1,constantMax:MAX_CONSTANT,rangeMode:'level'}); setQuery(''); setPage(0) }
  const [drawing,setDrawing]=useState(false); const drawTimer=useRef<ReturnType<typeof setTimeout>>()
  useEffect(()=>()=>clearTimeout(drawTimer.current),[])
  const missingConstants=songs.filter(s=>s.levelValue===null).length
  const rangeChange=(a:number,b:number)=>{patch(rangeMode==='constant'?{constantMin:a,constantMax:b}:{min:formatGrade(a),max:formatGrade(b)});setPage(0)}
  const draw = () => {if(drawing)return; setDrawing(true); drawTimer.current=setTimeout(()=>{try {const result = useSongStore.getState().draw(filtered, count); notice(`${result.reset ? '候选谱面已抽完，开始新一轮。' : ''}已抽取 ${result.count} 张${result.count < count ? '，本轮剩余谱面不足' : ''}。`); }catch(e){notice(e instanceof Error?e.message:'抽谱失败。')}finally{setDrawing(false)}}, matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 260) }
  return <>
    <div className="page-heading draw-heading"><div><AnimatedTitle text="next track"/></div><OBSLink/></div>
    <ChartHistoryPanel/>
    {!pools.length ? <div className="empty large"><div className="empty-symbol">♪</div><h2>先加入你的曲库</h2><p>导入 JSON，或手动获取在线曲库。</p><button className="primary" onClick={openLibrary}>导入曲库 <ArrowUpRight size={16}/></button></div> : <div className="draw-layout">
      <section className="panel settings"><div className="section-title"><h2>抽谱设置</h2><button className="icon-button" title="重置筛选" aria-label="重置筛选" onClick={reset}><RotateCcw size={16}/></button></div>
        <label>曲库<Select label="曲库" value={poolId} onChange={v => {setPoolId(v);setPage(0)}} options={[{value:'all',label:'所有曲库'},...pools.map(p=>({value:p.id,label:p.name}))]}/></label>
        <fieldset><legend>难度</legend><div className="difficulty-options">{DIFFICULTIES.map(d => <button key={d} aria-pressed={difficulties.includes(d)} className={`chip difficulty-chip difficulty-${d.replace(':','')} ${difficulties.includes(d) ? 'selected' : ''}`}  onClick={() => { update('difficulties', difficulties.includes(d) ? difficulties.filter(x => x !== d) : [...difficulties, d]); setPage(0) }}>{d}</button>)}</div></fieldset>
        <label>谱面类型<Select label="谱面类型" value={type} onChange={v=>{setType(v);setPage(0)}} options={[{value:'all',label:'全部类型'},{value:'dx',label:'DX'},{value:'standard',label:'STANDARD'}]}/></label>
        <RangeControl mode={rangeMode} min={validRange?minValue:1} max={validRange?maxValue:15} onChange={rangeChange} onMode={v=>{update('rangeMode',v);setPage(0)}}/>
        {rangeMode==='constant' && missingConstants>0 && <p className="hint">{missingConstants.toLocaleString()} 张谱面未提供定数，已从小数筛选中排除。可更新在线曲库或补充 levelValue。</p>}
        <fieldset><legend>抽取数量</legend><div className="segmented">{[1,2,3,4].map(n => <button key={n} aria-pressed={n === count} className={n === count ? 'selected' : ''} onClick={() => setCount(n)}>{n} 张</button>)}</div></fieldset>
        <div className="candidate-count"><span>符合条件</span><strong className="mono"><AnimatedCount value={filtered.length}/></strong></div><button className="primary draw-button" disabled={!filtered.length || drawing} onClick={draw}><Shuffle size={18} className={drawing?'shuffle-spin':''}/>{drawing?'正在洗牌…':'开始抽谱'}</button>
      </section>
      <div className={`draw-content ${drawing?'is-shuffling':''}`}><section className="results" aria-busy={drawing}><div className="section-title"><h2>抽谱结果 <span className="tag">{selectedSongs.length || '—'}</span></h2>{!!selectedSongs.length && <button className="text-button" onClick={() => useSongStore.getState().clear()}>清除结果</button>}</div>{selectedSongs.length ? <div className="cards" key={drawKey}>{selectedSongs.map((song, i) => <SongCard key={`${song.id}-${i}`} song={song} index={i} reveal/>)}</div> : <div className="empty result-empty"><Shuffle size={26}/><p>准备好了，就开始抽谱。</p></div>}</section>
      <section className="panel library-preview"><div className="section-title"><h2>候选谱面</h2><div className="search"><Search size={16}/><input aria-label="搜索谱面" placeholder="搜索曲名 / ID / 作曲家" value={query} onChange={e => {setQuery(e.target.value); setPage(0)}}/></div></div><div className="song-rows">{filtered.slice(actualPage * 24, actualPage * 24 + 24).map(s => <div className="song-row" key={s.id}><span className={`difficulty-dot difficulty-${s.difficulty.replace(':','')}`}/><div><strong>{s.name}</strong></div><b className="mono">{rangeMode==='constant'?s.levelValue?.toFixed(1):formatGrade(s.level+(s.isPlus?.5:0))}</b><button className="text-button" onClick={() => {useSongStore.getState().select(s); notice('已指定谱面并同步到 OBS。')}}>指定</button></div>)}{!filtered.length && <p className="empty">没有符合条件的谱面，试试调整筛选。</p>}</div>{pages > 1 && <div className="pagination"><span>{actualPage + 1} / {pages} 页</span><div className="row"><button disabled={!actualPage} onClick={() => setPage(actualPage - 1)}>上一页</button><button disabled={actualPage + 1 >= pages} onClick={() => setPage(actualPage + 1)}>下一页</button></div></div>}</section></div>
    </div>}
  </>
}
