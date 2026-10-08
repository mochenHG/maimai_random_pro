export interface RafflePlayer { id: string; name: string }
export interface RaffleRound { id: string; timestamp: number; title: string; winners: RafflePlayer[] }
export interface RaffleState {
  title: string; source: string; pool: RafflePlayer[]; count: number; preventRepeat: boolean
  phase: 'idle' | 'drawing' | 'revealed'; pending: RafflePlayer[]; history: RaffleRound[]
}
export interface RaffleDisplay {
  title: string; poolCount: number; eligibleCount: number; count: number
  phase: RaffleState['phase']; round: RaffleRound | null; rounds: number
}
export const RAFFLE_KEY = 'maimai-pro-raffle-control'
export const RAFFLE_DISPLAY_KEY = 'maimai-pro-raffle'
export const REVEAL_STEP = 650
export const emptyRaffle = (): RaffleState => ({title: '赛事抽奖', source: '', pool: [], count: 1, preventRepeat: true, phase: 'idle', pending: [], history: []})
export const nameKey = (name: string) => name.trim().normalize('NFKC').toLocaleLowerCase()
export function uniquePlayers(players: RafflePlayer[]): RafflePlayer[] {
  const seen = new Set<string>()
  return players.filter(p => {const key = nameKey(p.name); if (!key || seen.has(key)) return false; seen.add(key); return true}).map(p => ({id:p.id, name:p.name.trim()}))
}
export function manualPool(text: string): RafflePlayer[] {
  const names = text.split(/\r?\n/).map(s => s.trim()).filter(Boolean)
  if (names.length > 10000 || names.some(n => n.length > 80)) throw new Error('名单最多 10,000 行，每个昵称最多 80 字。')
  return uniquePlayers(names.map(name => ({id:`manual:${nameKey(name)}`, name})))
}
export function eligiblePlayers(state: RaffleState) {
  const winners = state.preventRepeat ? state.history.flatMap(r => r.winners) : []
  const ids = new Set(winners.map(p => p.id)), names = new Set(winners.map(p => nameKey(p.name)))
  return uniquePlayers(state.pool).filter(p => !ids.has(p.id) && !names.has(nameKey(p.name)))
}
// Rejection sampling avoids modulo bias, including at a pool size that is not a power of two.
export function randomIndex(max: number): number {
  const limit = 0x100000000 - (0x100000000 % max)
  const value = new Uint32Array(1)
  do { crypto.getRandomValues(value) } while (value[0] >= limit)
  return value[0] % max
}
export function beginDraw(state: RaffleState, pick = randomIndex): RaffleState {
  if (isRaffleBusy(state)) throw new Error('请先完成本轮揭晓。')
  const pool = eligiblePlayers(state)
  if (!Number.isInteger(state.count) || state.count < 1 || state.count > 10) throw new Error('每轮可抽取 1–10 人。')
  if (state.count > pool.length) throw new Error(`可抽取人数不足，目前剩余 ${pool.length} 人。`)
  if (state.history.length >= 1000) throw new Error('已记录 1,000 轮，请先导出记录，再重置抽奖。')
  for (let i = 0; i < state.count; i++) { const j = i + pick(pool.length - i); [pool[i], pool[j]] = [pool[j], pool[i]] }
  return {...state, phase:'drawing', pending:pool.slice(0, state.count)}
}
export function revealDraw(state: RaffleState, now = Date.now()): RaffleState {
  if (state.phase !== 'drawing' || !state.pending.length) throw new Error('请先开始抽取。')
  return {...state, phase:'revealed', pending:[], history:[{id:crypto.randomUUID(),timestamp:now,title:state.title,winners:state.pending}, ...state.history]}
}
export function isRaffleBusy(state: RaffleState, now = Date.now()) {
  return state.phase === 'drawing' || (state.phase === 'revealed' && !!state.history[0] && now < state.history[0].timestamp + state.history[0].winners.length * REVEAL_STEP)
}
export function displayRaffle(state: RaffleState): RaffleDisplay {
  return {title:state.title,poolCount:state.pool.length,eligibleCount:eligiblePlayers(state).length,count:state.count,phase:state.phase,round:state.phase === 'revealed' ? state.history[0] ?? null : null,rounds:state.history.length}
}
export function validateRaffle(value: unknown): RaffleState {
  const s = value as RaffleState
  const player = (p: RafflePlayer) => p && typeof p.id === 'string' && p.id.length > 0 && typeof p.name === 'string' && !!p.name.trim() && p.name.length <= 80
  if (!s || typeof s.title !== 'string' || s.title.length > 80 || typeof s.source !== 'string' || !Array.isArray(s.pool) || s.pool.length > 10000 || !s.pool.every(player) || !Number.isInteger(s.count) || s.count < 1 || s.count > 10 || typeof s.preventRepeat !== 'boolean' || !['idle','drawing','revealed'].includes(s.phase) || !Array.isArray(s.pending) || s.pending.length > 10 || !s.pending.every(player) || !Array.isArray(s.history) || s.history.length > 1000 || !s.history.every(r => r && typeof r.id === 'string' && typeof r.title === 'string' && Number.isFinite(r.timestamp) && Array.isArray(r.winners) && r.winners.length > 0 && r.winners.length <= 10 && r.winners.every(player))) throw new Error('抽奖存档格式不正确，请从有效备份恢复。')
  if ((s.phase === 'drawing' && s.pending.length !== s.count) || (s.phase !== 'drawing' && s.pending.length) || (s.phase === 'revealed' && !s.history.length)) throw new Error('抽奖存档不完整，请从有效备份恢复。')
  return {...s, pool:uniquePlayers(s.pool)}
}
