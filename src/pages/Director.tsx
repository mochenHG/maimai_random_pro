import { useState } from 'react'
import { setDirector, useDirector, type DirectorState } from '../store/directorStore'
import { useTournamentStore } from '../store/tournamentStore'
import NetworkControl from '../components/NetworkControl'
import { AnimatedTitle } from '../components/HeroMotion'
import BackupPanel from '../components/BackupPanel'
import CopyButton from '../components/CopyButton'
import CallboardPanel from '../components/CallboardPanel'
import OperationsPanel from '../components/OperationsPanel'

export default function Director(){
  const {data}=useDirector(),[seconds,setSeconds]=useState(60),stages=useTournamentStore(s=>s.stages),current=useTournamentStore(s=>s.currentStage)
  const stage=stages.find(s=>s.id===current)
  return <>
    <div className="page-heading"><div><AnimatedTitle text="on air"/></div><a className="button" target="_blank" rel="noreferrer" href="/obs-live?clean=1">打开导播展示</a></div>
    <section className="panel director-panel content-panel">
      <div className="section-title"><h2>OBS 导播控制</h2><span className="tag">v3.6 · {stage?.name??'尚未开始'}</span></div>
      <div className="address-card"><span className="field-caption">OBS 浏览器来源</span><div className="address-copy-row"><a href="/obs-live?clean=1" target="_blank" rel="noreferrer">{location.origin}/obs-live?clean=1</a><CopyButton text={`${location.origin}/obs-live?clean=1`} ariaLabel="复制导播 OBS 地址"/></div></div>
      <div className="form-block"><span className="field-caption">展示场景</span><div className="scene-buttons">{([['standby','待机'],['song','歌曲'],['ranking','实时排名'],['advance','晋级揭晓'],['raffle','赛事抽奖'],['callboard','选手叫号']] as [DirectorState['scene'],string][]).map(([id,name])=><button key={id} className={data.scene===id?'primary':''} aria-pressed={data.scene===id} disabled={id==='advance'&&!stage?.locked} onClick={()=>setDirector({scene:id})}>{name}</button>)}</div><p className="hint reading-copy">确认晋级后可切换到晋级揭晓。歌曲展示优先使用阶段曲目，未设置时使用当前抽谱结果。</p></div>
      <div className="director-fields"><label className="form-field">待机标题<input aria-label="待机标题" maxLength={80} value={data.title} onChange={e=>setDirector({title:e.target.value})}/></label><label className="checkbox"><input type="checkbox" checked={data.hideScores} onChange={e=>setDirector({hideScores:e.target.checked})}/><span>隐藏分数与实时名次</span></label></div>
      <div className="countdown-controls control-row"><label className="form-field">倒计时<span className="input-with-unit"><input type="number" aria-label="倒计时秒数" min={1} max={86400} value={seconds} onChange={e=>setSeconds(Number(e.target.value))}/><span>秒</span></span></label><div className="row wrap"><button disabled={!Number.isInteger(seconds)||seconds<1||seconds>86400} onClick={()=>setDirector({endAt:Date.now()+seconds*1000})}>开始倒计时</button><button onClick={()=>setDirector({endAt:null})}>清除倒计时</button></div></div>
    </section>
    <CallboardPanel/><NetworkControl/><OperationsPanel/><BackupPanel/>
  </>
}
