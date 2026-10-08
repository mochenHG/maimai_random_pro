import { drawCharts } from './chartHistoryStore'
import { useTournamentStore } from './tournamentStore'
import { create } from 'zustand'
import type { Pool, Song } from '../types'
import { load, save } from '../lib/storage'
import { normalizeSongs } from '../lib/songs'
const POOLS_KEY = 'maimai-pro-pools'
export const DRAW_KEY = 'maimai-pro-draw'
function loadPools(): Pool[] {
  const saved = load<Pool[] | null>(POOLS_KEY, null)
  if (Array.isArray(saved)) return saved.flatMap(p => { try { return [{ ...p, songs: normalizeSongs(p.songs) }] } catch { return [] } })
  const legacy = load<{ songs?: Song[]; songPools?: Pool[] }>('maimai-draw-pools', {})
  const pools = [...(legacy.songs?.length ? [{ id: 'main', name: '主库', songs: legacy.songs }] : []), ...(legacy.songPools || [])]
  return pools.flatMap(p => { try { return [{ ...p, songs: normalizeSongs(p.songs) }] } catch { return [] } })
}
interface SongState {
  pools: Pool[]; selectedSongs: Song[]; history: Set<string>; drawKey: number
  addPool: (name: string, songs: Song[], replaceId?: string) => boolean
  removePool: (id: string) => boolean
  draw: (candidates: Song[], count: number) => { count: number; reset: boolean }
  select: (song: Song) => void
  clear: () => void
}
export const useSongStore = create<SongState>((set, get) => ({
  pools: loadPools(), selectedSongs: load<Song[]>(DRAW_KEY, []), history: new Set(), drawKey: 0,
  addPool: (name, songs, replaceId) => {
    const existing = get().pools.find(p => p.id === replaceId)
    const pool = { id: existing?.id || crypto.randomUUID(), name, songs }
    const pools = existing ? get().pools.map(p => p.id === existing.id ? pool : p) : [...get().pools, pool]
    if (!save(POOLS_KEY, pools)) return false
    set({ pools }); return true
  },
  removePool: id => {
    const pools = get().pools.filter(p => p.id !== id)
    if (!save(POOLS_KEY, pools)) return false
    set({ pools }); return true
  },
  draw: (candidates, count) => {
    const state=useTournamentStore.getState()
    const selectedSongs=drawCharts(candidates,count,state.eventId??'legacy-event',state.currentStage)
    save(DRAW_KEY,selectedSongs);set({selectedSongs,drawKey:get().drawKey+1});return {count:selectedSongs.length,reset:false}
  },
  select: song => { save(DRAW_KEY, [song]); set({ selectedSongs: [song], drawKey: get().drawKey + 1 }) },
  clear: () => { save(DRAW_KEY, []); set({ selectedSongs: [] }) },
}))

window.addEventListener('pro-remote',e=>{const key=(e as CustomEvent<string>).detail;if(key===DRAW_KEY)useSongStore.setState(s=>({selectedSongs:load<Song[]>(DRAW_KEY,[]),drawKey:s.drawKey+1}));if(key===POOLS_KEY)useSongStore.setState({pools:loadPools()})})
