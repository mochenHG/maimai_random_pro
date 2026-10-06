import test from 'node:test'
import assert from 'node:assert/strict'
import { broadcastCapacity, broadcastStandings } from '../src/lib/standings.ts'

const player = (id, score, extra = {}) => ({ id, name: id, score, rating: 15000, dxScore: null, rank: null, advanced: false, ...extra })
const stage = (players, extra = {}) => ({ id: 'round', name: '预选赛', players, advanceCount: 1, locked: false, songs: [], ...extra })
test('OBS pagination bounds animated rows and leaves space for jackets at 1080p', () => {
  assert.equal(broadcastCapacity(1920, 1080, false).size, 16)
  assert.equal(broadcastCapacity(1920, 1080, true).size, 12)
  assert.ok(broadcastCapacity(1098, 1066, true).size < broadcastCapacity(1098, 1066, false).size)
  assert.equal(broadcastCapacity(7680, 4320, false).size, 16)
})

test('live OBS ranks current scores and DX without announcing provisional advancement', () => {
  const source = stage([player('A', 99), player('B', 100, { advanced: true, rank: 9 }), player('C', null), player('D', 100, { dxScore: 500 })])
  const snapshot = structuredClone(source)
  const rows = broadcastStandings(source)
  assert.deepEqual(rows.map(p => p.id), ['D', 'B', 'A', 'C'])
  assert.deepEqual(rows.map(p => p.rank), [1, 2, 3, null])
  assert.ok(rows.every(p => p.status === 'live'))
  assert.deepEqual(source, snapshot)
  source.players[0].score = 101
  assert.equal(broadcastStandings(source)[0].id, 'A')
})
test('published outcomes persist on reconnection and return to live after undo', () => {
  const source = stage([player('winner', 100, { rank: 1, advanced: true }), player('loser', 98, { rank: 2 })], { locked: true })
  assert.deepEqual(broadcastStandings(source).map(p => p.status), ['advanced', 'eliminated'])
  assert.deepEqual(broadcastStandings(structuredClone(source)).map(p => p.status), ['advanced', 'eliminated'])
  assert.ok(broadcastStandings({ ...source, locked: false }).every(p => p.status === 'live'))
  assert.deepEqual(broadcastStandings({ ...source, loserStageId: 'lower' }).map(p => p.status), ['advanced', 'repechage'])
})
test('grouped standings retain group-local ranks and do not mix different groups', () => {
  const source = stage([player('A', 90), player('B', 100), player('C', 95), player('D', null)], {
    rankingMethod: 'group', advancePerGroup: 1,
    groups: [{ id: 'g1', name: '第一组', playerIds: ['A', 'C'] }, { id: 'g2', name: '第二组', playerIds: ['B', 'D'] }],
  })
  const rows = broadcastStandings(source)
  assert.deepEqual(rows.map(p => [p.id, p.rank, p.group]), [['C', 1, '第一组'], ['A', 2, '第一组'], ['B', 1, '第二组'], ['D', null, '第二组']])
  assert.ok(rows.every(p => p.status === 'live'))
})
