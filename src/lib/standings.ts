import type { Stage } from '../types.ts'
import { rankPlayers } from './tournament.ts'

export type ResultStatus = 'live' | 'advanced' | 'eliminated' | 'repechage'
/** Reserve room for the header, footer and optional jackets in an OBS frame. */
export function broadcastCapacity(width: number, height: number, hasSongs: boolean) {
  const reserve = (width > 800 ? 350 : 260) + (hasSongs ? 130 : 0)
  const perColumn = Math.max(2, Math.min(8, Math.floor((height - reserve + 12) / 90)))
  return { perColumn, size: perColumn * (width >= 1200 ? 2 : 1) }
}
/** Live positions are provisional; only a locked stage can publish outcomes. */
export function broadcastStandings(stage: Stage) {
  const players = stage.locked ? stage.players : rankPlayers(stage).players
  const groups = stage.rankingMethod === 'group' ? stage.groups ?? [] : []
  const membership = new Map(groups.flatMap((group, index) => group.playerIds.map(id => [id, { index, name: group.name }] as const)))
  return players.map(player => ({
    ...player,
    group: membership.get(player.id)?.name ?? (groups.length ? '未分组' : ''),
    groupOrder: membership.get(player.id)?.index ?? groups.length,
    status: (!stage.locked ? 'live' : player.advanced ? 'advanced' : stage.loserStageId ? 'repechage' : 'eliminated') as ResultStatus,
  })).sort((a, b) => a.groupOrder - b.groupOrder || (a.rank ?? Number.MAX_SAFE_INTEGER) - (b.rank ?? Number.MAX_SAFE_INTEGER))
}
