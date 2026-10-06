import test from 'node:test'
import assert from 'node:assert/strict'
import { defaultStages, groupPlayers, rankPlayers, routeStageResults, validateStages } from '../src/lib/tournament.ts'
const player=(id,score,rating=15000)=>({id,name:id,rating,score,dxScore:0,rank:null,advanced:false})
const setup=()=>validateStages(defaultStages().slice(0,3).map((s,i)=>({...s,id:['main','losers','final'][i],name:['预选赛','败者组','决赛'][i],advanceCount:1,winnerStageId:i===0?'final':undefined,loserStageId:i===0?'losers':undefined})))
test('rating seeding produces balanced groups with exactly one assignment per player',()=>{
  const stage={...defaultStages()[0],groupCount:2,players:[player('a',null,16000),player('b',null,15500),player('c',null,15000),player('d',null,14500)]}
  const groups=groupPlayers(stage)
  assert.deepEqual(groups.map(g=>g.playerIds),[['a','d'],['b','c']])
  assert.equal(new Set(groups.flatMap(g=>g.playerIds)).size,4)
})
test('group cutoffs rank each group and block tied or unassigned players',()=>{
  const stage={...defaultStages()[0],rankingMethod:'group',advancePerGroup:1,players:[player('a',100),player('b',99),player('c',98),player('d',97)],groups:[{id:'1',name:'一组',playerIds:['a','b']},{id:'2',name:'二组',playerIds:['c','d']}]}
  assert.deepEqual(rankPlayers(stage).players.filter(p=>p.advanced).map(p=>p.id),['a','c'])
  stage.players[3].score=98;assert.equal(rankPlayers(stage).tieAtCutoff,true)
  stage.groups[1].playerIds=['c'];assert.equal(rankPlayers(stage).unassigned,true)
})
test('winners and losers route separately, merge finalists and preserve ratings',()=>{
  const stages=setup();stages[0].players=[player('a',100),player('b',99),player('c',98)]
  let routed=routeStageResults(stages,'main')
  assert.equal(routed[0].locked,true)
  assert.deepEqual(routed[1].players.map(p=>p.id),['b','c']);assert.deepEqual(routed[2].players.map(p=>p.id),['a'])
  routed[1].players[0].score=100;routed[1].players[1].score=99
  routed=routeStageResults(routed,'losers')
  assert.deepEqual(routed[2].players.map(p=>p.id),['a','b'])
  assert.equal(routed[2].players[1].rating,15000);assert.equal(routed[2].players[1].score,null)
  routed[2].players[0].score=100
  const scoredTarget=setup();scoredTarget[0].players=[player('a',100)];scoredTarget[2].players=[player('z',99)]
  assert.throws(()=>routeStageResults(scoredTarget,'main'),/已有成绩/)
})
test('custom backup validation rejects backward routes, duplicate assignments and invalid counts',()=>{
  const stages=setup();assert.equal(validateStages(stages)[0].songCount,4)
  assert.throws(()=>validateStages(stages.map((s,i)=>i===1?{...s,loserStageId:'main'}:s)),/后续阶段/)
  assert.throws(()=>validateStages(stages.map((s,i)=>i===0?{...s,songCount:17}:s)),/曲数/)
  stages[0].players=[player('a',null)];stages[0].groups=[{id:'1',name:'一组',playerIds:['a']},{id:'2',name:'二组',playerIds:['a']}]
  assert.throws(()=>validateStages(stages),/重复或未知/)
})
