import { useEffect, useRef, useState } from 'react'
import { Download, Plus, Trash2, Trophy, Undo2 } from 'lucide-react'
import { useTournamentStore } from '../store/tournamentStore'
import { useSongStore } from '../store/songStore'
import { rankPlayers } from '../lib/tournament'
import { parseRating } from '../lib/roster'
import { download } from '../lib/storage'
import type { Player, Stage } from '../types'
import StageScoring from '../components/StageScoring'
import ChartHistoryPanel from '../components/ChartHistoryPanel'
import ReportPanel from '../components/ReportPanel'
import { drawCharts } from '../store/chartHistoryStore'
import RosterImport from '../components/RosterImport'
import { useNotice } from '../components/Notice'
import OBSLink from '../components/OBSLink'
import SongCard from '../components/SongCard'
import StageEditor from '../components/StageEditor'
import RosterStandings from '../components/RosterStandings'
import { AnimatedTitle } from '../components/HeroMotion'
import { useCelebration } from '../components/Celebration'
import { useDrawSettings } from '../hooks/useDrawSettings'
import { parseLevel } from '../lib/songs'
import { inSongRange } from '../lib/range'
import { defaultStages } from '../lib/tournament'
import StageProgress from '../components/StageProgress'
import AnimatedDisclosure from '../components/AnimatedDisclosure'
import AdvancementDialog from '../components/AdvancementDialog'
function NumericCell({ value, disabled, label, onCommit, max = 100000, live = false }: { value: number | null; disabled: boolean; label: string; max?: number; live?: boolean; onCommit: (n: number | null) => void }) {
  const [draft, setDraft] = useState(value === null ? '' : String(value)); const notice = useNotice()
  const input = useRef<HTMLInputElement>(null)
  const timer = useRef<ReturnType<typeof setTimeout>>()
  useEffect(() => () => clearTimeout(timer.current), [])
  useEffect(() => { if (document.activeElement !== input.current) setDraft(value === null ? '' : String(value)) }, [value])
  return <input ref={input} className="numeric-cell mono" type="text" inputMode="decimal" aria-label={label} disabled={disabled} value={draft} placeholder="—" onChange={e => {const text = e.target.value; setDraft(text); clearTimeout(timer.current); const n = parseRating(text); if (live && !Number.isNaN(n) && (n === null || n <= max) && n !== value) timer.current = setTimeout(() => onCommit(n), 150)}} onBlur={() => { clearTimeout(timer.current); const n = parseRating(draft); if (Number.isNaN(n) || (n !== null && n > max)) {notice(`${label} 请输入 0–${max} 之间的数字。`); setDraft(value === null ? '' : String(value)); return} if (n !== value) onCommit(n) }} onKeyDown={e => {if(e.key === 'Enter') e.currentTarget.blur()}}/>
}
export default function Tournament() {
  const stages = useTournamentStore(s => s.stages); const currentStage = useTournamentStore(s => s.currentStage); const started = useTournamentStore(s => s.started); const undo = useTournamentStore(s => s.undo)
  const stage = stages.find(s => s.id === currentStage) || stages[0]; const notice = useNotice(); const fileInput = useRef<HTMLInputElement>(null)
  const [name, setName] = useState(''); const [rating, setRating] = useState(''); const [config, setConfig] = useState<Stage[] | null>(null)
  const customMode=useTournamentStore(s=>s.customMode);const templates=useTournamentStore(s=>s.templates);const [templateName,setTemplateName]=useState('');const celebrate=useCelebration();const {settings}=useDrawSettings()
  const [confirmAdvance, setConfirmAdvance] = useState(false),[scoresDirty,setScoresDirty]=useState(false)
  const eventId=useTournamentStore(s=>s.eventId)
  const run = (action: () => void) => { try { action() } catch(e) {notice(e instanceof Error ? e.message : '操作失败。')} }
  const add = () => { const r = parseRating(rating); if(!name.trim() || name.trim().length > 80 || Number.isNaN(r)) {notice('请输入有效的昵称与 rating。'); return} run(() => {notice(useTournamentStore.getState().importPlayers(stage.id, [{ name: name.trim(), rating: r }], 'append')); setName(''); setRating('')}) }
  const edit = (player: Player, field: 'rating' | 'score' | 'dxScore', value: number | null) => {useTournamentStore.getState().updatePlayer(stage.id, player.id, {[field]: value})}
  const ranking = rankPlayers(stage),allScoresComplete=ranking.players.every(p=>p.score!==null)
  const randomSongs=()=>run(()=>{
    const pools=useSongStore.getState().pools
    const songs=[...new Map(pools.filter(p=>settings.poolId==='all'||p.id===settings.poolId).flatMap(p=>p.songs).map(s=>[s.id,s])).values()]
    const min=settings.rangeMode==='constant'?settings.constantMin:parseLevel(settings.min);const max=settings.rangeMode==='constant'?settings.constantMax:parseLevel(settings.max)
    const candidates=songs.filter(s=>settings.difficulties.includes(s.difficulty)&&(settings.type==='all'||s.chartType===settings.type)&&inSongRange(s,settings.rangeMode,min,max))
    if(!candidates.length){notice('没有符合抽谱筛选的歌曲。');return}
    useTournamentStore.getState().setSongs(stage.id,drawCharts(candidates,stage.songCount??4,useTournamentStore.getState().eventId??'legacy-event',stage.id))
    notice('阶段歌曲已更新。')
  })
  return <><div className="page-heading"><div><AnimatedTitle text="game on"/></div><OBSLink tournament/></div>
    <div className="tournament-toolbar"><div className="row wrap"><span className="status-dot"/><span>{started ? '赛事进行中' : '准备选手名单'}</span><span className="tag">{stages.reduce((n,s) => n + s.players.length, 0) ? `${stages[0].players.length} 位初始选手` : '尚无选手'}</span></div><div className="row wrap">{!started && <button className="primary" disabled={!stages[0].players.length} onClick={() => run(()=>{useTournamentStore.getState().start();celebrate('赛事开始')})}>开始赛事</button>}</div><input className="sr-only" ref={fileInput} type="file" accept=".json" onChange={async e => {const file = e.target.files?.[0]; e.target.value=''; if(!file) return; if(file.size > 10 * 1024 * 1024) {notice('备份文件不能超过 10 MB。'); return} try { const text = await file.text(); if(window.confirm('恢复备份将替换当前赛事数据，是否继续？')) {useTournamentStore.getState().importBackup(text);  notice('赛事备份已恢复。')} } catch(error) {notice(error instanceof Error ? error.message : '恢复失败。')} }}/></div>
    <ChartHistoryPanel/>
    <StageProgress stages={stages} current={stage.id} onSelect={id => {useTournamentStore.getState().setCurrentStage(id);}}/>
    <div className="tournament-stage-content" key={stage.id}>
    <RosterImport stageId={stage.id} disabled={stage.locked}/>
    <section className="panel players-panel"><div className="section-title"><div><h2>选手名单 <span className="tag">{stage.players.length} 人</span></h2><p className="stage-summary">{stage.rankingMethod==='group'?`每组 ${stage.advancePerGroup??1} 人晋级`:`${stage.advanceCount} 人晋级`}</p></div><span className={stage.locked ? 'badge locked' : 'badge'}>{stage.locked ? '阶段已锁定' : '可编辑'}</span></div>
      {stage.rankingMethod==='group' && <div className="group-toolbar"><span>{stage.groups?.length??0} 组</span><button disabled={stage.locked || !stage.players.length} onClick={()=>run(()=>useTournamentStore.getState().generateGroups(stage.id))}>按 rating 分组</button></div>}
      {!stage.locked && <form className="add-player" onSubmit={e => {e.preventDefault(); add()}}><input aria-label="选手昵称" placeholder="选手昵称" value={name} onChange={e => setName(e.target.value)} maxLength={80}/><input aria-label="选手 rating" placeholder="rating（可留空）" inputMode="decimal" value={rating} onChange={e => setRating(e.target.value)}/><button type="submit"><Plus size={16}/>添加选手</button></form>}
      <RosterStandings key={`${eventId}-roster-${stage.id}`} stage={stage} dirty={scoresDirty} renderRating={p=><NumericCell key={`rating-${stage.id}-${p.id}`} value={p.rating} disabled={stage.locked} label={`${p.name} rating`} onCommit={v=>edit(p,'rating',v)}/>} onGroup={(id,group)=>run(()=>useTournamentStore.getState().assignGroup(stage.id,id,group))} onRemove={p=>{if(window.confirm(`删除选手「${p.name}」？`))useTournamentStore.getState().removePlayer(stage.id,p.id)}}/>
    </section>
    <section className="panel stage-songs-panel"><div className="section-title"><h2>阶段歌曲</h2><div className="row wrap"><button disabled={stage.locked} onClick={()=>{const songs=useSongStore.getState().selectedSongs;if(!songs.length){notice('请先抽取谱面。');return}useTournamentStore.getState().setSongs(stage.id,songs);notice('阶段歌曲已更新。')}}>使用当前抽谱结果</button><button className="primary" disabled={stage.locked} onClick={randomSongs}>随机阶段歌曲</button></div></div>{stage.songs.length?<div className="stage-song-cards" key={stage.songs.map(s=>s.id).join('-')}>{stage.songs.map((song,i)=><SongCard key={song.id} song={song} index={i}/>)}</div>:<div className="stage-song-empty">选择比赛曲目</div>}</section>
    <StageScoring stage={stage} key={`${eventId}-scoring-${stage.id}`} onDirtyChange={setScoresDirty}/>
    <section className="panel ranking-panel content-panel"><div className="section-title"><div><span className="eyebrow">RESULTS</span><h2>确认晋级</h2></div><span className="tag">{stage.locked?'晋级已确认':`${ranking.players.filter(p=>p.score!==null).length} / ${stage.players.length} 人已有成绩`}</span></div>
      <p className="hint reading-copy">按完成率合计、DX 合计依次排序。全部选手成绩保存后，自动识别晋级分界同分；加赛后再确认晋级。</p>
      {scoresDirty&&<p className="error" role="status">上方有未保存成绩。保存后才能确认晋级，当前排名尚未包含这些修改。</p>}
      {!started&&<p className="hint">完成名单后，先点击页面上方「开始赛事」。</p>}
      {ranking.unassigned&&<p className="error">请为所有选手分组。</p>}
      {allScoresComplete&&ranking.tieAtCutoff&&<p className="error">晋级分界出现同分，请在上方「同分加赛」处理。</p>}
      <div className="ranking-actions"><div className="row wrap">{undo&&<button onClick={()=>{useTournamentStore.getState().undoRanking();notice('已撤销排名与晋级。')}}><Undo2 size={16}/>撤销最近晋级</button>}</div><button className="primary advance-button" disabled={stage.locked||!stage.players.length||scoresDirty||!allScoresComplete} onClick={()=>run(()=>{
        const state=useTournamentStore.getState(),current=state.stages.find(s=>s.id===stage.id)!,result=rankPlayers(current)
        if(!state.started)throw new Error('请先开始赛事。');if(current.players.some(p=>p.score===null))throw new Error('请先填写所有选手的完成率。');if(result.unassigned)throw new Error('请为所有选手分组。');if(result.tieAtCutoff)throw new Error('晋级分界出现同分，请完成加赛。');setConfirmAdvance(true)
      })}><Trophy size={17}/>{stage.locked?'晋级已确认':!allScoresComplete?'等待成绩补齐':'核对并确认晋级'}</button></div>
    </section>
    </div>
    <ReportPanel stages={stages} stage={stage}/>
    <AnimatedDisclosure title="赛事模板" className="tournament-templates"><div className="template-body"><form className="template-save" onSubmit={e=>{e.preventDefault();run(()=>{useTournamentStore.getState().saveTemplate(templateName);setTemplateName('');notice('模板已保存。')})}}><input aria-label="模板名称" placeholder="模板名称" value={templateName} maxLength={80} onChange={e=>setTemplateName(e.target.value)}/><button type="submit">保存模板</button></form><div className="template-list">{templates.map(t=><div className="template-item" key={t.id}><strong>{t.name}</strong><button onClick={()=>{if(window.confirm('载入模板将替换当前赛事，是否继续？'))run(()=>{useTournamentStore.getState().loadTemplate(t.id);notice('模板已载入。')})}}>载入</button><button className="icon-button danger" aria-label={`删除模板 ${t.name}`} onClick={()=>{if(window.confirm(`删除模板「${t.name}」？`))run(()=>useTournamentStore.getState().deleteTemplate(t.id))}}><Trash2 size={17}/></button></div>)}</div></div></AnimatedDisclosure>
    <AnimatedDisclosure title="更多操作" className="tournament-more"><div className="tournament-more-body"><div className="row wrap tournament-management-actions"><button onClick={() => {const s = useTournamentStore.getState(); download('赛事备份.json', JSON.stringify({schemaVersion:2,eventId:s.eventId, stages:s.stages,currentStage:s.currentStage,started:s.started,customMode:s.customMode}, null, 2))}}><Download size={15}/>导出备份</button><button onClick={() => fileInput.current?.click()}>恢复备份</button><button className="custom-tournament-button" onClick={()=>setConfig(structuredClone(stages))}>自定义赛事</button>{!started && customMode && <button onClick={()=>run(()=>{const defaults=defaultStages();defaults[0]={...defaults[0],id:stages[0].id,players:stages[0].players,songs:stages[0].songs};useTournamentStore.getState().configure(defaults,false)})}>恢复固定赛制</button>}</div><div className="tournament-reset-actions"><button className="danger" onClick={()=>{if(window.confirm('清空当前赛事、选手和成绩？')){useTournamentStore.getState().reset();setConfig(null)}}}>重置赛事</button></div></div></AnimatedDisclosure>
    {confirmAdvance && <AdvancementDialog stage={stage} onClose={()=>setConfirmAdvance(false)} onConfirm={()=>run(()=>{useTournamentStore.getState().commit(stage.id);setConfirmAdvance(false);celebrate('晋级已确认');notice('晋级结果已同步至 OBS，选手已进入后续阶段。')})}/> }
    {config && <StageEditor stages={config} started={started} currentStage={currentStage} onClose={()=>setConfig(null)} onSave={draft=>run(()=>{useTournamentStore.getState().configure(draft);setConfig(null);notice('自定义赛事已保存。')})}/>}
  </>
}
