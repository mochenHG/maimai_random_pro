import type { Player, RosterEntry, Stage } from '../types.ts'
import { activeTiebreaks, comparePlayers, scoredStage, validateChartScore } from './scoring.ts'
import { normalizeSongs } from './songs.ts'
export function mergeRoster(players: Player[], entries: RosterEntry[], mode: 'merge' | 'append') {
  const result = players.map(p => ({ ...p })); const index = new Map(result.map((p, i) => [p.name, i]))
  let added = 0; let updated = 0; let skipped = 0
  for (const entry of entries) {
    const existing = index.get(entry.name)
    if (existing !== undefined) {
      if (mode === 'append') { skipped++; continue }
      if (entry.rating !== null) { result[existing].rating = entry.rating; updated++ } else skipped++
    } else {
      index.set(entry.name, result.length)
      result.push({ ...entry, id: crypto.randomUUID(), score: null, dxScore: null, rank: null, advanced: false }); added++
    }
  }
  return { players: result, added, updated, skipped }
}
export function rankPlayers(input: Stage) {
  const stage=scoredStage(input), rounds=activeTiebreaks(stage)
  const grouped=stage.rankingMethod==='group'
  const groups=grouped?(stage.groups || []).map(g=>stage.players.filter(p=>g.playerIds.includes(p.id))):[stage.players]
  const assigned=new Set((stage.groups || []).flatMap(g=>g.playerIds))
  const unassigned=grouped && stage.players.some(p=>!assigned.has(p.id))
  const positions=new Map<string,{rank:number;advanced:boolean}>();let tieAtCutoff=false
  for(const group of groups) {
    const scored=group.filter(p=>p.score!==null).sort((a,b)=>comparePlayers(a,b,rounds))
    const cutoff=grouped?(stage.advancePerGroup??1):stage.advanceCount
    if(cutoff>0 && scored.length>cutoff && comparePlayers(scored[cutoff-1],scored[cutoff],rounds)===0)tieAtCutoff=true
    scored.forEach((p,i)=>positions.set(p.id,{rank:i+1,advanced:i<cutoff}))
  }
  return {players:stage.players.map(p=>({...p,rank:positions.get(p.id)?.rank??null,advanced:positions.get(p.id)?.advanced??false})),tieAtCutoff,unassigned}
}
export function groupPlayers(stage:Stage) {
  const count=stage.groupCount??2
  const groups=Array.from({length:count},(_,i)=>({id:crypto.randomUUID(),name:`第 ${i+1} 组`,playerIds:[] as string[]}))
  const sorted=[...stage.players].sort((a,b)=>(b.rating??0)-(a.rating??0))
  sorted.forEach((p,i)=>{const offset=i%count;groups[Math.floor(i/count)%2?count-1-offset:offset].playerIds.push(p.id)})
  return groups
}
export function routeStageResults(stages:Stage[],id:string) {
  const index=stages.findIndex(s=>s.id===id);const stage=stages[index] && scoredStage(stages[index])
  if(!stage || stage.locked)throw new Error('当前阶段不可排名。')
  if(!stage.players.length)throw new Error('当前阶段没有选手。')
  if(stage.players.some(p=>p.score===null))throw new Error('请先填写所有选手的完成率。')
  const ranking=rankPlayers(stage)
  if(ranking.unassigned)throw new Error('请为所有选手分配组别。')
  if(ranking.tieAtCutoff)throw new Error('晋级分界处有同分，请填写 DX 分数或加赛成绩。')
  const loserIds=new Set(stages.map(s=>s.loserStageId).filter(Boolean))
  const winnerId=stage.winnerStageId || stages.slice(index+1).find(s=>!loserIds.has(s.id))?.id
  const destinations=[winnerId,stage.loserStageId].filter(Boolean)
  for(const target of destinations) {
    const next=stages.find(s=>s.id===target)
    if(!next || next.locked || next.players.some(p=>p.score!==null))throw new Error('目标阶段已有成绩或已锁定，无法覆盖。')
  }
  const fresh=(players:Player[])=>players.map(p=>({...p,score:null,dxScore:null,rank:null,advanced:false,chartScores:{},legacyTotals:undefined}))
  return stages.map(s=>{
    if(s.id===id)return {...s,players:ranking.players,locked:true}
    const incoming=s.id===winnerId?ranking.players.filter(p=>p.advanced):s.id===stage.loserStageId?ranking.players.filter(p=>!p.advanced):null
    if(!incoming)return s
    const ids=new Set(incoming.map(p=>p.id));const names=new Set(incoming.map(p=>p.name))
    if(s.players.some(p=>names.has(p.name)&&!ids.has(p.id)))throw new Error('目标阶段有同名选手，请先处理重名。')
    return {...s,players:[...s.players.filter(p=>!ids.has(p.id)),...fresh(incoming)],groups:[]}
  })
}
export function defaultStages(): Stage[] {
  return [['n216', 'N 进 16', 16], ['16to8', '16 进 8', 8], ['8to4', '8 进 4', 4], ['semi', '半决赛', 2], ['final', '决赛', 1]].map(([id, name, advanceCount]) => ({ id: String(id), name: String(name), advanceCount: Number(advanceCount), players: [], locked: false, songs: [] }))
}
export function validateStages(value: unknown): Stage[] {
  if (!Array.isArray(value) || !value.length || value.length > 20) throw new Error('赛事应包含 1–20 个阶段。')
  const ids = new Set<string>()
  return value.map((stage: Stage) => {
    if (!stage || typeof stage.id !== 'string' || ids.has(stage.id) || typeof stage.name !== 'string' || !stage.name.trim() || !Number.isInteger(stage.advanceCount) || stage.advanceCount < 0 || !Array.isArray(stage.players) || !Array.isArray(stage.songs)) throw new Error('赛事阶段格式无效。')
    ids.add(stage.id); const playerIds = new Set<string>(); const names = new Set<string>()
    const players = stage.players.map(p => {
      if (!p || typeof p.id !== 'string' || playerIds.has(p.id) || typeof p.name !== 'string' || !p.name.trim() || names.has(p.name)) throw new Error('选手 ID 或昵称无效、重复。')
      playerIds.add(p.id); names.add(p.name)
      for (const key of ['rating', 'score', 'dxScore'] as const) if (p[key] != null && (typeof p[key] !== 'number' || !Number.isFinite(p[key]) || p[key]! < 0)) throw new Error(`选手 ${p.name} 的数值无效。`)
      if(p.chartScores){if(typeof p.chartScores!=='object' || Array.isArray(p.chartScores))throw new Error('逐曲成绩格式无效。');Object.values(p.chartScores).forEach(v=>validateChartScore(v))}
      return { ...p, rating: p.rating ?? null, score: p.score ?? null, dxScore: p.dxScore ?? null, rank: p.rank ?? null, advanced: !!p.advanced }
    })
    const bounds={playerCount:[1,10000,32],groupCount:[1,64,2],advancePerGroup:[0,10000,1],songCount:[1,16,4]} as const
    const config:Record<string,number>={}
    for(const [key,[min,max,fallback]] of Object.entries(bounds)) {
      const number=stage[key as keyof typeof bounds]??fallback
      if(typeof number!=='number'||!Number.isInteger(number)||number<min||number>max)throw new Error(`${stage.name} 的人数、分组或曲数无效。`)
      config[key]=number
    }
    if(stage.rankingMethod!==undefined && !['global','group'].includes(stage.rankingMethod))throw new Error('排名方式无效。')
    const assigned=new Set<string>();const groupIds=new Set<string>()
    if(stage.groups!==undefined && !Array.isArray(stage.groups))throw new Error('分组格式无效。')
    const groups=(stage.groups||[]).map(g=>{
      if(!g || typeof g.id!=='string'||groupIds.has(g.id)||typeof g.name!=='string'||!g.name.trim()||!Array.isArray(g.playerIds))throw new Error('分组格式无效。')
      groupIds.add(g.id)
      for(const id of g.playerIds){if(typeof id!=='string'||!playerIds.has(id)||assigned.has(id))throw new Error('分组存在重复或未知选手。');assigned.add(id)}
      return {id:g.id,name:g.name,playerIds:g.playerIds}
    })
    for(const key of ['winnerStageId','loserStageId'] as const){const target=stage[key];if(target!==undefined && (typeof target!=='string'||!value.slice(value.indexOf(stage)+1).some(s=>s.id===target)))throw new Error('晋级或败者组必须指向后续阶段。')}
    if(stage.winnerStageId && stage.winnerStageId===stage.loserStageId)throw new Error('晋级与败者组不能是同一阶段。')
    if(stage.scoreMode && !['total','songs'].includes(stage.scoreMode))throw new Error('计分模式无效。')
    if(stage.tiebreaks && (!Array.isArray(stage.tiebreaks)||stage.tiebreaks.length>100))throw new Error('加赛记录无效。')
    for(const r of stage.tiebreaks??[]){if(!r || typeof r.id!=='string'||typeof r.note!=='string'||typeof r.fingerprint!=='string'||!Number.isFinite(r.timestamp)||!r.scores||Object.keys(r.scores).length<2)throw new Error('加赛记录无效。'); for(const [id,v] of Object.entries(r.scores)){if(typeof id!=='string'||!id)throw new Error('加赛选手标识无效。');validateChartScore(v);if(v.score===null)throw new Error('加赛完成率不能为空。')}}
    return scoredStage({ ...stage, ...config, rankingMethod:stage.rankingMethod??'global',locked: !!stage.locked, players,groups, songs: stage.songs.length ? normalizeSongs(stage.songs) : [] })
  })
}
