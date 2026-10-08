import { create } from 'zustand'
import { save } from '../lib/storage'
import { beginDraw, displayRaffle, emptyRaffle, isRaffleBusy, RAFFLE_DISPLAY_KEY, RAFFLE_KEY, revealDraw, uniquePlayers, validateRaffle } from '../lib/raffle'
import type { RafflePlayer, RaffleState } from '../lib/raffle'

function read(): RaffleState {
  const raw = localStorage.getItem(RAFFLE_KEY)
  return raw ? validateRaffle(JSON.parse(raw)) : emptyRaffle()
}
function initial() {try {return {data:read(),error:''}} catch {return {data:emptyRaffle(),error:'抽奖存档读取失败。请恢复有效的抽奖备份，或重置抽奖。'}}}
export const useRaffleStore = create<{data:RaffleState;error:string}>(() => initial())
async function change(edit: (state:RaffleState) => RaffleState, replace = false) {
  const commit = () => {
    const next = validateRaffle(edit(replace ? emptyRaffle() : read()))
    if (!save(RAFFLE_KEY,next)) throw new Error('抽奖未保存，请检查浏览器存储后重试。')
    useRaffleStore.setState({data:next,error:''})
    if (!save(RAFFLE_DISPLAY_KEY,displayRaffle(next))) throw new Error('抽奖已保存，但 OBS 同步失败，请刷新主页面重试。')
  }
  if (navigator.locks) await navigator.locks.request(RAFFLE_KEY, commit)
  else commit()
}
const ensureEditable = (s:RaffleState) => {if(isRaffleBusy(s)) throw new Error('请先完成本轮揭晓。')}
export const raffleActions = {
  configure: (patch:Partial<Pick<RaffleState,'title'|'count'|'preventRepeat'>>) => change(s => {ensureEditable(s); return {...s,...patch}}),
  pool: (pool:RafflePlayer[],source:string) => change(s => {ensureEditable(s); if (!pool.length) throw new Error('该名单为空，请先添加选手。'); return {...s,pool:uniquePlayers(pool),source}}),
  draw: (patch:Pick<RaffleState,'title'|'count'>) => change(s => {ensureEditable(s); return beginDraw({...s,...patch})}),
  reveal: () => change(revealDraw),
  standby: () => change(s => {ensureEditable(s); return {...s,phase:'idle'}}),
  reset: () => change(() => emptyRaffle(),true),
  restore: (text:string) => {const restored = validateRaffle(JSON.parse(text)); return change(() => restored,true)},
}
// A second controller tab receives the saved state, but an OBS viewer never writes control data.
window.addEventListener('storage', e => {if(e.key === RAFFLE_KEY) useRaffleStore.setState(initial())})
export function publishRaffle() {if (!useRaffleStore.getState().error) save(RAFFLE_DISPLAY_KEY,displayRaffle(useRaffleStore.getState().data))}

window.addEventListener('pro-remote',e=>{if((e as CustomEvent<string>).detail===RAFFLE_KEY)useRaffleStore.setState(initial())})
