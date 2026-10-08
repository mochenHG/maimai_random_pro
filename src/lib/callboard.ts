export const CALLBOARD_KEY = 'maimai-pro-callboard'
export type CallStatus = 'waiting' | 'current' | 'done' | 'skipped'
export interface CallBatch { id:string; playerIds:string[]; status:CallStatus }
export interface Callboard { eventId:string; stageId:string; batchSize:number; notice:string; items:CallBatch[] }
export const emptyCallboard = ():Callboard => ({eventId:'',stageId:'',batchSize:2,notice:'请选手提前到机台附近等候',items:[]})
/** One current batch and one assignment per player keep backstage and OBS in agreement. */
export function validateCallboard(value:unknown):Callboard {
  const b=value as Callboard
  if(!b || typeof b.eventId!=='string' || typeof b.stageId!=='string' || typeof b.notice!=='string' || b.notice.length>120 || !Number.isInteger(b.batchSize) || b.batchSize<1 || b.batchSize>4 || !Array.isArray(b.items) || b.items.length>2000) throw Error('叫号数据无效。')
  const ids=new Set<string>(),players=new Set<string>();let current=0
  for(const item of b.items){
    if(!item || typeof item.id!=='string' || ids.has(item.id) || !['waiting','current','done','skipped'].includes(item.status) || !Array.isArray(item.playerIds) || !item.playerIds.length || item.playerIds.length>4) throw Error('叫号队列无效。')
    ids.add(item.id);if(item.status==='current')current++
    for(const id of item.playerIds){if(typeof id!=='string' || !id || players.has(id))throw Error('叫号名单中存在重复选手。');players.add(id)}
  }
  if(current>1)throw Error('同一时间只能叫一批选手。')
  return b
}
export function createCallboard(eventId:string,stageId:string,playerIds:string[],batchSize:number,notice:string):Callboard {
  if(!playerIds.length)throw Error('请先为当前阶段添加选手。')
  const items:CallBatch[]=[]
  if(!Number.isInteger(batchSize)||batchSize<1||batchSize>4)throw Error('每批人数应为 1–4 人。')
  for(let i=0;i<playerIds.length;i+=batchSize)items.push({id:crypto.randomUUID(),playerIds:playerIds.slice(i,i+batchSize),status:'waiting'})
  return validateCallboard({eventId,stageId,batchSize,notice:notice.slice(0,120),items})
}
export function advanceCallboard(board:Callboard,skip=false):Callboard {
  validateCallboard(board)
  const next=board.items.find(item=>item.status==='waiting')
  return {...board,items:board.items.map(item=>item.status==='current'?{...item,status:skip?'skipped':'done'}:item.id===next?.id?{...item,status:'current'}:item)}
}
export function editCallBatch(board:Callboard,id:string,action:'up'|'down'|'skip'|'return'):Callboard {
  const items=board.items.map(item=>({...item,playerIds:[...item.playerIds]})),index=items.findIndex(item=>item.id===id),item=items[index]
  if(!item)throw Error('这批选手已不在队列中。')
  if(action==='return'){if(item.status!=='done'&&item.status!=='skipped')throw Error('只能将已结束或已跳过的批次放回队列。');item.status='waiting'}
  else if(action==='skip'){if(item.status!=='waiting')throw Error('请使用上方按钮跳过当前批次。');item.status='skipped'}
  else {
    if(item.status!=='waiting')throw Error('只能调整候场批次。')
    const waiting=items.flatMap((value,i)=>value.status==='waiting'?[i]:[]),position=waiting.indexOf(index),target=waiting[position+(action==='up'?-1:1)]
    if(target!==undefined)[items[index],items[target]]=[items[target],items[index]]
  }
  return {...board,items}
}
export function visibleCallboard(board:Callboard,eventId:string|undefined,stageId:string,playerIds:string[]){
  // A stale queue must never call players from an earlier stage or an earlier event.
  if(board.eventId!==eventId||board.stageId!==stageId)return {current:null,next:[],waiting:0,done:0,stale:true}
  const known=new Set(playerIds),items=board.items.map(item=>({...item,playerIds:item.playerIds.filter(id=>known.has(id))})).filter(item=>item.playerIds.length)
  const waiting=items.filter(item=>item.status==='waiting')
  return {current:items.find(item=>item.status==='current')??null,next:waiting.slice(0,2),waiting:waiting.reduce((n,item)=>n+item.playerIds.length,0),done:items.filter(item=>item.status==='done').length,stale:false}
}
