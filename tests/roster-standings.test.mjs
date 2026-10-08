import test from 'node:test'
import assert from 'node:assert/strict'
import { rosterStandings } from '../src/lib/rosterStandings.ts'
import { scoreFingerprint } from '../src/lib/scoring.ts'
const player=(id,score,extra={})=>({id,name:id,rating:15000,score,dxScore:null,rank:null,advanced:false,...extra})
const stage=(players,extra={})=>({id:'round',name:'预赛',players,advanceCount:1,locked:false,songs:[],...extra})

test('live roster sorts saved scores without changing source order or official flags',()=>{
  const source=stage([player('low',98),player('pending',null),player('high',100)])
  const before=structuredClone(source),rows=rosterStandings(source)
  assert.deepEqual(rows.map(p=>[p.id,p.rank,p.status]),[['high',1,'in-range'],['low',2,'out-of-range'],['pending',null,'pending']])
  assert.equal(rows[0].label,'暂列晋级区');assert.deepEqual(source,before)
  source.players[0].score=101;assert.equal(rosterStandings(source)[0].id,'low')
})
test('cutoff ties remain neutral even before all base scores have arrived',()=>{
  let source=stage([player('a',100),player('b',100),player('c',null)])
  assert.deepEqual(rosterStandings(source).map(p=>p.status),['tie','tie','pending'])
  assert.equal(rosterStandings(source)[0].label,'同分 · 待补齐')
  source.players[2].score=99;assert.equal(rosterStandings(source)[0].label,'待加赛')
  source.players[1].dxScore=1;assert.deepEqual(rosterStandings(source).map(p=>p.status),['in-range','out-of-range','out-of-range'])
})
test('valid tiebreaks determine live status; stale rounds cannot pick a winner',()=>{
  const source=stage([player('a',100),player('b',100),player('c',98)])
  source.tiebreaks=[{id:'tie',timestamp:1,note:'',fingerprint:scoreFingerprint(source),scores:{a:{score:99,dxScore:null},b:{score:100,dxScore:null}}}]
  assert.equal(rosterStandings(source)[0].id,'b');assert.equal(rosterStandings(source)[0].status,'in-range')
  source.players[2].score=97;assert.ok(rosterStandings(source).slice(0,2).every(p=>p.status==='tie'))
})
test('group-local ranks stay together and unassigned players cannot enter the range',()=>{
  const source=stage([player('a',90),player('b',100),player('c',95),player('d',97),player('unknown',101)],{rankingMethod:'group',advancePerGroup:1,groups:[{id:'g1',name:'甲组',playerIds:['a','c']},{id:'g2',name:'乙组',playerIds:['b','d']}]})
  assert.deepEqual(rosterStandings(source).map(p=>[p.id,p.group,p.rank,p.status]),[['c','甲组',1,'in-range'],['a','甲组',2,'out-of-range'],['b','乙组',1,'in-range'],['d','乙组',2,'out-of-range'],['unknown','未分组',null,'unassigned']])
})
test('locked roster uses published ranks and explicit final outcomes',()=>{
  const source=stage([player('a',99,{rank:1,advanced:true}),player('b',100,{rank:2})],{locked:true})
  assert.deepEqual(rosterStandings(source).map(p=>[p.id,p.status,p.label]),[['a','advanced','已晋级'],['b','eliminated','未晋级']])
  source.loserStageId='lower';assert.equal(rosterStandings(source)[1].status,'repechage')
})
test('per-song totals are derived before assigning live ranks and progress status',()=>{
  const source=stage([player('a',null,{chartScores:{s1:{score:100,dxScore:50},s2:{score:99,dxScore:60}}}),player('b',null,{chartScores:{s1:{score:100,dxScore:50}}})],{scoreMode:'songs',songs:[{id:'s1'},{id:'s2'}]})
  const rows=rosterStandings(source)
  assert.equal(rows[0].score,199);assert.equal(rows[0].dxScore,110);assert.equal(rows[0].status,'in-range');assert.equal(rows[1].status,'pending')
})
