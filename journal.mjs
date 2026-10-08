import { randomUUID } from 'node:crypto'
export const JOURNAL_LIMIT=50
const UNDO_BUDGET=8*1024*1024
const categories={'maimai-pro-tournament':'赛事','maimai-pro-director':'导播','maimai-pro-callboard':'叫号','maimai-pro-raffle-control':'抽奖','maimai-pro-draw':'抽谱','maimai-pro-chart-history':'抽谱历史','maimai-pro-pools':'曲库','maimai-pro-filters':'筛选'}
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b)
export function describeChange(key,before,after){
  if(!before)return '初始化'+(categories[key]??'数据')
  if(key==='maimai-pro-director'){
    const scenes={standby:'待机',song:'歌曲',ranking:'实时排名',advance:'晋级揭晓',raffle:'赛事抽奖',callboard:'选手叫号'}
    if(before.scene!==after.scene)return '切换展示 · '+(scenes[after.scene]??after.scene)
    if(before.hideScores!==after.hideScores)return after.hideScores?'隐藏成绩与名次':'显示成绩与名次'
    if(before.endAt!==after.endAt)return after.endAt?'开始倒计时':'清除倒计时'
    return '修改待机标题'
  }
  if(key==='maimai-pro-callboard'){
    if(before.stageId!==after.stageId||before.eventId!==after.eventId||!equal(before.items?.map(i=>i.id).sort(),after.items?.map(i=>i.id).sort()))return '载入叫号名单'
    if(before.notice!==after.notice)return '修改候场提示'
    if(before.items?.find(i=>i.status==='current')?.id!==after.items?.find(i=>i.status==='current')?.id)return '切换上机批次'
    return '调整叫号队列'
  }
  if(key==='maimai-pro-raffle-control'){
    if(before.phase!==after.phase)return after.phase==='drawing'?'抽取待揭晓结果':after.phase==='revealed'?'揭晓中奖者':'抽奖返回待机'
    if(!equal(before.history,after.history))return '更新抽奖记录'
    if(!equal(before.pool,after.pool))return '载入抽奖名单'
    return '调整抽奖设置'
  }
  if(key==='maimai-pro-tournament'){
    if(before.eventId!==after.eventId)return '载入或重置赛事'
    if(before.started!==after.started)return after.started?'开始赛事':'停止赛事'
    if(before.currentStage!==after.currentStage)return '切换赛事阶段'
    for(const stage of after.stages??[]){
      const old=before.stages?.find(s=>s.id===stage.id);if(!old)return '修改赛制'
      const prefix=String(stage.name??'阶段').slice(0,40)+' · '
      if(old.locked!==stage.locked)return prefix+(stage.locked?'确认晋级':'撤销晋级')
      if(!equal(old.tiebreaks,stage.tiebreaks))return prefix+'保存加赛成绩'
      if(!equal(old.songs,stage.songs))return prefix+'设置阶段歌曲'
      if(old.scoreMode!==stage.scoreMode)return prefix+'切换计分方式'
      if((old.players?.length??0)!==(stage.players?.length??0))return prefix+'更新选手名单'
      const oldPlayers=new Map(old.players?.map(p=>[p.id,p])??[])
      let count=0
      for(const p of stage.players??[]){const prev=oldPlayers.get(p.id);if(prev&&(!equal(prev.chartScores,p.chartScores)||prev.score!==p.score||prev.dxScore!==p.dxScore))count++}
      if(count)return prefix+`保存 ${count} 人成绩`
      if(!equal(old.groups,stage.groups))return prefix+'调整选手分组'
      if(!equal(old.players,stage.players))return prefix+'修改选手信息'
    }
    return '更新赛事设置'
  }
  return '更新'+(categories[key]??'数据')
}
function reversible(key,before,after){
  if(!before)return false
  if(['maimai-pro-tournament','maimai-pro-director','maimai-pro-callboard'].includes(key))return true
  // A revealed result cannot be made secret again. Only settings and an unrevealed draw may be undone.
  return key==='maimai-pro-raffle-control'&&equal(before.history,after.history)&&after.phase!=='revealed'&&before.phase!=='revealed'
}
export function appendOperation(journal,key,before,value,actor,undoOf){
  const entry={id:randomUUID(),key,category:categories[key]??'数据',label:undoOf?'撤销 · '+undoOf.label:describeChange(key,before,value.data),time:Date.now(),actor,revision:value.revision,undoOf:undoOf?.id,undone:false}
  if(!undoOf&&reversible(key,before,value.data))entry.before=before
  const previous=journal[0],merge=!undoOf&&previous&&!previous.undone&&!previous.undoOf&&previous.key===key&&previous.actor===actor&&previous.label===entry.label&&entry.time-previous.time<1500&&['修改待机标题','修改候场提示','更新筛选'].includes(entry.label)
  if(merge){entry.id=previous.id;if(previous.before!==undefined)entry.before=previous.before;else delete entry.before}
  // Cache snapshot sizes rather than repeatedly serializing megabytes of older score data on each edit.
  if(entry.before!==undefined)entry.beforeBytes=merge&&previous.beforeBytes!==undefined?previous.beforeBytes:Buffer.byteLength(JSON.stringify(entry.before))
  const list=[entry,...(merge?journal.slice(1):journal).map(item=>item.id===undoOf?.id?{...item,undone:true}:item)].slice(0,JOURNAL_LIMIT)
  let size=0
  return list.map(item=>{if(item.before===undefined)return item;const bytes=item.beforeBytes??Buffer.byteLength(JSON.stringify(item.before));size+=bytes;if(size<=UNDO_BUDGET)return {...item,beforeBytes:bytes};const {before,beforeBytes,...metadata}=item;void before;void beforeBytes;return metadata})
}
export function publicJournal(journal,snapshot){return journal.map(({before,beforeBytes,...item})=>{void beforeBytes;return {...item,canUndo:before!==undefined&&!item.undone&&snapshot.get(item.key)?.revision===item.revision}})}
export function undoEntry(journal,snapshot,id,revision){
  const item=journal.find(entry=>entry.id===id)
  if(!item||item.before===undefined||item.undone)throw Error('此记录不能撤销。揭晓结果与已归档记录保留。')
  if(item.revision!==revision||snapshot.get(item.key)?.revision!==revision)throw Error('该数据已被其他操作修改，无法撤销旧记录。请核对当前状态。')
  return item
}
