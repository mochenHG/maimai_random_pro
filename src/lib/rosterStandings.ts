import type { Stage } from '../types.ts'
import { rankPlayers } from './tournament.ts'
import { activeTiebreaks, comparePlayers } from './scoring.ts'

export type RosterStatus='pending'|'unassigned'|'tie'|'in-range'|'out-of-range'|'advanced'|'eliminated'|'repechage'
/** A display projection only. Neither sorting nor provisional status changes the
    persisted roster, grouping, scores, or official advancement flags. */
export function rosterStandings(stage:Stage) {
  const ranked=rankPlayers(stage),players=stage.locked?stage.players:ranked.players
  const grouped=stage.rankingMethod==='group',groups=grouped?stage.groups??[]:[]
  const membership=new Map(groups.flatMap((group,index)=>group.playerIds.map(id=>[id,{index,id:group.id,name:group.name}] as const)))
  const ordered=players.map(player=>({...player,group:membership.get(player.id)?.name??(grouped?'未分组':''),groupOrder:membership.get(player.id)?.index??groups.length}))
    .sort((a,b)=>a.groupOrder-b.groupOrder||(a.rank??Infinity)-(b.rank??Infinity)||0)
  const complete=ranked.players.every(p=>p.score!==null),tied=new Set<string>(),rounds=activeTiebreaks(stage),cutoff=grouped?stage.advancePerGroup??1:stage.advanceCount
  if(!stage.locked&&cutoff>0){
    const pools=grouped?groups.map((_,index)=>ordered.filter(p=>p.groupOrder===index&&p.score!==null)): [ordered.filter(p=>p.score!==null)]
    for(const pool of pools)if(pool.length>cutoff&&!comparePlayers(pool[cutoff-1],pool[cutoff],rounds))for(const player of pool)if(!comparePlayers(player,pool[cutoff],rounds))tied.add(player.id)
  }
  return ordered.map(player=>{
    const status:RosterStatus=stage.locked?player.advanced?'advanced':stage.loserStageId?'repechage':'eliminated'
      :grouped&&!membership.has(player.id)?'unassigned':player.score===null?'pending':tied.has(player.id)?'tie':player.advanced?'in-range':'out-of-range'
    const label=({pending:'待录入',unassigned:'待分组',tie:complete?'待加赛':'同分 · 待补齐','in-range':'暂列晋级区','out-of-range':'暂列区外',advanced:'已晋级',eliminated:'未晋级',repechage:'进入败者组'} as const)[status]
    return {...player,status,label}
  })
}
