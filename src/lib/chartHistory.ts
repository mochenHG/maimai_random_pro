import type { Song } from '../types.ts'
export interface ChartHistory {scope:'stage'|'event'|'none';excluded:string[];entries:{songId:string;chartId:string;name:string;stageId:string;eventId:string;time:number}[]}
export const CHART_HISTORY_KEY='maimai-pro-chart-history'
export const emptyChartHistory=():ChartHistory=>({scope:'stage',excluded:[],entries:[]})
export const songIdentity=(song:Song)=>String(song.songId || song.name)
export function chartCandidates(songs:Song[],state:ChartHistory,eventId:string,stageId:string) {
  const blocked=new Set(state.excluded)
  if(state.scope!=='none')for(const entry of state.entries)if(entry.eventId===eventId && (state.scope==='event'||entry.stageId===stageId))blocked.add(entry.songId)
  return [...new Map(songs.filter(s=>!blocked.has(songIdentity(s))).map(s=>[songIdentity(s),s])).values()]
}
export function recordCharts(state:ChartHistory,songs:Song[],eventId:string,stageId:string):ChartHistory {
  if(state.entries.length+songs.length>20000)throw new Error('抽谱历史已达上限，请先导出备份并清空历史。')
  return {...state,entries:[...state.entries,...songs.map(s=>({songId:songIdentity(s),chartId:s.id,name:s.name,eventId,stageId,time:Date.now()}))]}
}
