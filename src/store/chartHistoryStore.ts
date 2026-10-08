import { create } from 'zustand'
import { load, save } from '../lib/storage'
import { CHART_HISTORY_KEY, emptyChartHistory, chartCandidates, recordCharts, songIdentity, type ChartHistory } from '../lib/chartHistory'
import type { Song } from '../types'
import { sample } from '../lib/songs'
export const useChartHistory=create<{data:ChartHistory}>(()=>({data:load(CHART_HISTORY_KEY,emptyChartHistory())}))
export function updateChartHistory(data:ChartHistory){if(!save(CHART_HISTORY_KEY,data))throw new Error('抽谱历史保存失败。');useChartHistory.setState({data})}
export function drawCharts(songs:Song[],count:number,eventId:string,stageId:string){
  const data=useChartHistory.getState().data
  // Shuffle charts before choosing one chart per song so difficulty is not biased by source order.
  const candidates=chartCandidates(sample(songs,songs.length),data,eventId,stageId)
  if(candidates.length<count)throw new Error(`符合条件且未重复的歌曲仅 ${candidates.length} 首，需要 ${count} 首；请调整筛选或去重范围。`)
  const selected=sample(candidates,count)
  updateChartHistory(recordCharts(data,selected,eventId,stageId));return selected
}
export { songIdentity }
window.addEventListener('pro-remote',e=>{if((e as CustomEvent<string>).detail===CHART_HISTORY_KEY)useChartHistory.setState({data:load(CHART_HISTORY_KEY,emptyChartHistory())})})
