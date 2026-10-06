import { create } from 'zustand'
import type { Player, RosterEntry, Song, Stage, TournamentTemplate } from '../types'
import { load, save } from '../lib/storage'
import { normalizeSongs } from '../lib/songs'
import { defaultStages, groupPlayers, mergeRoster, routeStageResults, validateStages } from '../lib/tournament'
export const TOURNAMENT_KEY = 'maimai-pro-tournament'
const TEMPLATE_KEY='maimai-pro-templates'
interface Persisted { stages: Stage[]; currentStage: string; started: boolean; customMode:boolean }
function legacySongs(value:unknown):Song[] {
  if(!Array.isArray(value))return []
  const songs=value.flatMap(entry=>{try{const song=entry && typeof entry==='object' && 'song' in entry?entry.song:entry;return song?normalizeSongs([song]):[]}catch{return []}})
  return [...new Map(songs.map(song=>[song.id,song])).values()]
}
function initial(): Persisted {
  const fallback={stages:validateStages(defaultStages()),currentStage:'n216',started:false,customMode:false}
  const data=load<Persisted|null>(TOURNAMENT_KEY,null)
  if(data){try{const stages=validateStages(data.stages);return {stages,currentStage:stages.some(s=>s.id===data.currentStage)?data.currentStage:stages[0].id,started:!!data.started,customMode:!!data.customMode || stages.some(s=>!defaultStages().some(d=>d.id===s.id && d.name===s.name && d.advanceCount===s.advanceCount))}}catch{return fallback}}
  const legacy=load<{stages?:Record<string,Stage>;currentStage?:string;isTournamentStarted?:boolean;isCustomMode?:boolean;customStages?:Stage[]}>('tournament-data',{})
  if(legacy.stages){try{
    const source=legacy.isCustomMode && legacy.customStages?.length?legacy.customStages:fallback.stages
    const stages=source.map(s=>{const old=legacy.stages?.[s.id];return {...s,groupCount:s.groupCount||2,songCount:s.songCount||4,players:old?.players.map(p=>({...p,rating:p.rating??null,score:p.score==null?null:Number(p.score),dxScore:p.dxScore==null || String(p.dxScore).trim()===''?null:Number(p.dxScore)}))??[],locked:!!old?.locked,songs:legacySongs(old?.songs),groups:old?.groups??[]}})
    return {stages:validateStages(stages),currentStage:stages.some(s=>s.id===legacy.currentStage)?legacy.currentStage!:stages[0].id,started:!!legacy.isTournamentStarted,customMode:!!legacy.isCustomMode}
  }catch{return fallback}}
  return fallback
}
function initialTemplates():TournamentTemplate[] {
  const data=load<TournamentTemplate[]|null>(TEMPLATE_KEY,null)
  if(Array.isArray(data))return data.flatMap(t=>{try{return [{id:t.id,name:t.name,stages:validateStages(t.stages)}]}catch{return []}})
  const legacy=load<{id:string;name:string;customStages:Stage[];isCustomMode:boolean;n216PlayerNames:string[]}[]>('tournament-templates',[])
  return Array.isArray(legacy)?legacy.flatMap(t=>{try{
    const stages=(t.isCustomMode && t.customStages?.length?t.customStages:defaultStages()).map((s,i)=>({...s,groupCount:s.groupCount||2,songCount:s.songCount||4,players:i===0?mergeRoster([],t.n216PlayerNames.map(name=>({name,rating:null})),'append').players:[],songs:[],locked:false,groups:[]}))
    return [{id:t.id,name:t.name,stages:validateStages(stages)}]
  }catch{return []}}):[]
}
interface TournamentState extends Persisted {
  undo:Persisted|null;templates:TournamentTemplate[]
  importPlayers:(stageId:string,entries:RosterEntry[],mode:'merge'|'append')=>string
  updatePlayer:(stageId:string,id:string,data:Partial<Player>)=>void
  removePlayer:(stageId:string,id:string)=>void
  setCurrentStage:(id:string)=>void;start:()=>void;commit:(id:string)=>void;undoRanking:()=>void
  configure:(stages:Stage[],customMode?:boolean)=>void
  setSongs:(id:string,songs:Song[])=>void;generateGroups:(id:string)=>void;assignGroup:(stageId:string,playerId:string,groupId:string)=>void
  importBackup:(text:string)=>void;reset:()=>void
  saveTemplate:(name:string)=>void;loadTemplate:(id:string)=>void;deleteTemplate:(id:string)=>void
}
export const useTournamentStore=create<TournamentState>((set,get)=>({
  ...initial(),undo:null,templates:initialTemplates(),
  importPlayers:(stageId,entries,mode)=>{
    const stage=get().stages.find(s=>s.id===stageId)
    if(!stage || stage.locked)throw new Error('当前阶段已锁定，无法导入。')
    const result=mergeRoster(stage.players,entries,mode)
    set({stages:get().stages.map(s=>s.id===stageId?{...s,players:result.players}:s),undo:null})
    return `新增 ${result.added} 人，更新 ${result.updated} 人。`
  },
  updatePlayer:(stageId,id,data)=>set(state=>({stages:state.stages.map(s=>s.id===stageId && !s.locked?{...s,players:s.players.map(p=>p.id===id?{...p,...data,id:p.id}:p)}:s),undo:null})),
  removePlayer:(stageId,id)=>set(state=>({stages:state.stages.map(s=>s.id===stageId && !s.locked?{...s,players:s.players.filter(p=>p.id!==id),groups:s.groups?.map(g=>({...g,playerIds:g.playerIds.filter(pid=>pid!==id)}))}:s),undo:null})),
  setCurrentStage:currentStage=>{if(get().stages.some(s=>s.id===currentStage))set({currentStage})},
  start:()=>{if(!get().stages[0].players.length)throw new Error('请先添加选手。');set({started:true,currentStage:get().stages[0].id})},
  commit:id=>{
    const state=get();if(!state.started)throw new Error('请先开始赛事。')
    const stages=routeStageResults(state.stages,id)
    set({stages,undo:{stages:state.stages,currentStage:state.currentStage,started:state.started,customMode:state.customMode}})
  },
  undoRanking:()=>{const undo=get().undo;if(undo)set({...undo,undo:null})},
  configure:(stages,customMode=true)=>{
    const state=get();const current=state.stages.findIndex(s=>s.id===state.currentStage)
    if(state.stages.some(s=>s.players.length && !stages.some(next=>next.id===s.id)))throw new Error('不能删除已有选手的阶段。')
    if(state.started){
      const protectedStages=state.stages.slice(0,current+1)
      for(const [i,old] of protectedStages.entries())if(JSON.stringify(stages[i])!==JSON.stringify(old))throw new Error('只能修改当前阶段之后的赛制。')
      for(const old of state.stages.filter(s=>s.locked))if(JSON.stringify(stages.find(s=>s.id===old.id))!==JSON.stringify(old))throw new Error('已锁定阶段不可修改。')
    }
    const configured=stages.map(s=>{const old=state.stages.find(v=>v.id===s.id);return old?{...s,players:old.players,songs:old.songs,locked:old.locked,groups:s.rankingMethod!==old.rankingMethod || s.groupCount!==old.groupCount?[]:old.groups}:s})
    const validated=validateStages(configured)
    set({stages:validated,currentStage:validated.some(s=>s.id===state.currentStage)?state.currentStage:validated[0].id,customMode,undo:null})
  },
  setSongs:(id,songs)=>set(state=>({stages:state.stages.map(s=>s.id===id && !s.locked?{...s,songs}:s)})),
  generateGroups:id=>{const stage=get().stages.find(s=>s.id===id);if(!stage || stage.locked)return;set({stages:get().stages.map(s=>s.id===id?{...s,groups:groupPlayers(s)}:s),undo:null})},
  assignGroup:(stageId,playerId,groupId)=>set(state=>({stages:state.stages.map(s=>s.id===stageId && !s.locked && s.players.some(p=>p.id===playerId)?{...s,groups:s.groups?.map(g=>({...g,playerIds:[...g.playerIds.filter(id=>id!==playerId),...(g.id===groupId?[playerId]:[])]}))}:s),undo:null})),
  importBackup:text=>{
    const data=JSON.parse(text) as Persisted;const stages=validateStages(data.stages)
    if(!stages.some(s=>s.id===data.currentStage))throw new Error('备份的当前阶段无效。')
    set({stages,currentStage:data.currentStage,started:!!data.started,customMode:!!data.customMode,undo:null})
  },
  reset:()=>set({stages:validateStages(defaultStages()),currentStage:'n216',started:false,customMode:false,undo:null}),
  saveTemplate:name=>{
    if(!name.trim() || name.trim().length>80)throw new Error('请输入模板名称。')
    const stages=get().stages.map((s,i)=>({...s,locked:false,groups:[],songs:[],players:i===0?s.players.map(p=>({...p,score:null,dxScore:null,rank:null,advanced:false})):[]}))
    const existing=get().templates.find(t=>t.name===name.trim());const template={id:existing?.id??crypto.randomUUID(),name:name.trim(),stages}
    const templates=[...get().templates.filter(t=>t.id!==template.id),template]
    if(templates.length>50)throw new Error('最多保存 50 个模板。')
    if(!save(TEMPLATE_KEY,templates))throw new Error('模板保存失败。')
    set({templates})
  },
  loadTemplate:id=>{const template=get().templates.find(t=>t.id===id);if(!template)throw new Error('模板不存在。');const stages=validateStages(structuredClone(template.stages));set({stages,currentStage:stages[0].id,started:false,customMode:true,undo:null})},
  deleteTemplate:id=>{const templates=get().templates.filter(t=>t.id!==id);if(!save(TEMPLATE_KEY,templates))throw new Error('模板未删除，请重试。');set({templates})},
}))
useTournamentStore.subscribe(state=>save(TOURNAMENT_KEY,{stages:state.stages,currentStage:state.currentStage,started:state.started,customMode:state.customMode}))
