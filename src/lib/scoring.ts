import type { ChartScore, Player, Stage, Tiebreak } from '../types.ts'
export function aggregatePlayer(player:Player,songs:Stage['songs']):Player {
  const rows=songs.map(song=>player.chartScores?.[song.id])
  const sum=(key:keyof ChartScore)=>rows.length && rows.every(r=>r?.[key]!=null) ? Math.round(rows.reduce((n,r)=>n+r![key]!,0)*10000)/10000 : null
  return {...player,score:sum('score'),dxScore:sum('dxScore')}
}
export function scoredStage(stage:Stage):Stage {return stage.scoreMode==='songs'?{...stage,players:stage.players.map(p=>aggregatePlayer(p,stage.songs))}:stage}
export function scoreFingerprint(stage:Stage) {
  return JSON.stringify({players:scoredStage(stage).players.map(p=>[p.id,p.score,p.dxScore]).sort((a,b)=>String(a[0]).localeCompare(String(b[0]))),groups:stage.groups??[],advance:stage.advanceCount,perGroup:stage.advancePerGroup??1,method:stage.rankingMethod??'global',songs:stage.songs.map(s=>s.id),mode:stage.scoreMode??'total'})
}
export function compareScores(a:ChartScore,b:ChartScore) {return ((b.score??-Infinity)-(a.score??-Infinity)) || ((b.dxScore??0)-(a.dxScore??0)) || 0}
export function comparePlayers(a:Player,b:Player,rounds:Tiebreak[]) {
  const base=compareScores(a,b); if(base)return base
  // Every resolved round precedes the next; a later round can only break remaining ties.
  for(const round of rounds) {const x=round.scores[a.id],y=round.scores[b.id];if(x&&y){const comparison=compareScores(x,y);if(comparison)return comparison}}
  return 0
}
export function activeTiebreaks(stage:Stage) {const fp=scoreFingerprint(stage);return (stage.tiebreaks??[]).filter(r=>r.fingerprint===fp)}
export function cutoffTies(input:Stage):Player[][] {
  const stage=scoredStage(input), rounds=activeTiebreaks(stage)
  // Start the tiebreak step only after the base-score sheet is complete.
  if(stage.players.some(p=>p.score===null))return []
  const groups=stage.rankingMethod==='group'?(stage.groups??[]).map(g=>stage.players.filter(p=>g.playerIds.includes(p.id))):[stage.players]
  const cutoff=stage.rankingMethod==='group'?(stage.advancePerGroup??1):stage.advanceCount
  return groups.flatMap(group=>{const players=group.filter(p=>p.score!==null).sort((a,b)=>comparePlayers(a,b,rounds)); if(cutoff<1||players.length<=cutoff||comparePlayers(players[cutoff-1],players[cutoff],rounds))return [];return [players.filter(p=>!comparePlayers(p,players[cutoff],rounds))]})
}
export function validateChartScore(value:ChartScore,max=101) {
  if(!value || !['score','dxScore'].every(k=>value[k as keyof ChartScore]===null || (typeof value[k as keyof ChartScore]==='number' && Number.isFinite(value[k as keyof ChartScore]) && value[k as keyof ChartScore]!>=0 && value[k as keyof ChartScore]!<=(k==='score'?max:100000))))throw new Error('完成率或 DX 分数无效。')
  if(value.dxScore!==null && !Number.isInteger(value.dxScore))throw new Error('DX 分数必须是整数。')
}

export interface ScoreEdit {playerId:string;songId?:string;field:keyof ChartScore;value:number|null;expected:number|null}

/** Keep entry forgiving about full-width digits, while rejecting partial numbers and fractional DX. */
export function parseScoreInput(text:string,field:keyof ChartScore,mode:'total'|'songs'='songs'):number|null {
  let value=text.normalize('NFKC').trim().replace(/,/g,'')
  if(field==='score')value=value.replace(/%$/,'').trim()
  if(!value)return null
  if(!/^(?:\d+(?:\.\d{1,4})?|\.\d{1,4})$/.test(value))throw new Error(field==='score'?'完成率最多保留四位小数。':'DX 分请输入整数。')
  const number=Number(value),max=field==='dxScore'?100000:mode==='songs'?101:10000
  if(number>max)throw new Error(`${field==='score'?'完成率':'DX 分'}应在 0–${max} 之间。`)
  if(field==='dxScore'&&!Number.isInteger(number))throw new Error('DX 分请输入整数。')
  return number
}

/** Validate the entire batch before publishing once; expected values protect pending edits from remote changes. */
export function applyScoreEdits(stage:Stage,mode:'total'|'songs',edits:ScoreEdit[]):Stage {
  if(stage.locked)throw new Error('阶段已锁定，不能修改成绩。')
  if((stage.scoreMode??'total')!==mode)throw new Error('计分方式已改变，请重新核对成绩。')
  const players=new Map(stage.players.map(p=>[p.id,p])),changed=new Map<string,Player>(),seen=new Set<string>()
  for(const edit of edits){
    const player=players.get(edit.playerId),key=JSON.stringify([edit.playerId,edit.songId??'',edit.field])
    if(!player||!['score','dxScore'].includes(edit.field))throw new Error('成绩对应的选手或字段已改变。')
    if(seen.has(key))throw new Error('同一成绩不能重复保存。');seen.add(key)
    if(mode==='songs'&&(!edit.songId||!stage.songs.some(s=>s.id===edit.songId)))throw new Error('阶段歌曲已改变，请重新核对成绩。')
    const current=mode==='songs'?player.chartScores?.[edit.songId!]?.[edit.field]??null:player[edit.field]
    if(current!==edit.expected)throw new Error(`${player.name} 的成绩已在其他位置修改，请核对后重新录入。`)
    validateChartScore({score:edit.field==='score'?edit.value:null,dxScore:edit.field==='dxScore'?edit.value:null},mode==='songs'?101:10000)
    const next=changed.get(player.id)??{...player}
    if(mode==='songs')next.chartScores={...next.chartScores,[edit.songId!]:{score:null,dxScore:null,...next.chartScores?.[edit.songId!],[edit.field]:edit.value}}
    else {next[edit.field]=edit.value;next.legacyTotals={score:next.score,dxScore:next.dxScore}}
    changed.set(player.id,next)
  }
  return {...stage,players:stage.players.map(p=>{const next=changed.get(p.id);return next?(mode==='songs'?aggregatePlayer(next,stage.songs):next):p})}
}

export function switchScoreMode(stage:Stage,mode:'total'|'songs'):Stage {
  if(stage.locked)throw new Error('阶段已锁定。')
  if(mode===(stage.scoreMode??'total'))return stage
  if(mode==='songs'&&!stage.songs.length)throw new Error('请先设置阶段歌曲。')
  return {...stage,scoreMode:mode,players:stage.players.map(p=>mode==='songs'?aggregatePlayer({...p,legacyTotals:{score:p.score,dxScore:p.dxScore}},stage.songs):{...p,score:p.legacyTotals?.score??null,dxScore:p.legacyTotals?.dxScore??null})}
}

export function tiebreakPlaces(input:Stage,tied:Player[]):number {
  const stage=scoredStage(input),rounds=activeTiebreaks(stage),first=tied[0]
  if(!first)return 0
  const group=stage.rankingMethod==='group'?stage.groups?.find(g=>g.playerIds.includes(first.id)):undefined
  const pool=group?stage.players.filter(p=>group.playerIds.includes(p.id)):stage.players
  const cutoff=stage.rankingMethod==='group'?stage.advancePerGroup??1:stage.advanceCount
  return Math.max(0,cutoff-pool.filter(p=>p.score!==null&&comparePlayers(p,first,rounds)<0).length)
}
