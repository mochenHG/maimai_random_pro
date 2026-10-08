import test from 'node:test'
import assert from 'node:assert/strict'
import { aggregatePlayer, activeTiebreaks, cutoffTies, scoreFingerprint, validateChartScore } from '../src/lib/scoring.ts'
import { rankPlayers, routeStageResults, validateStages } from '../src/lib/tournament.ts'
import { chartCandidates, emptyChartHistory, recordCharts } from '../src/lib/chartHistory.ts'
import { reportRows } from '../src/lib/reports.ts'
const player=(id,score=100)=>({id,name:id,rating:10000,score,dxScore:1000,rank:null,advanced:false})
const song=(id,songId=id)=>({id,songId,name:id,difficulty:'MASTER',level:13,isPlus:false,levelValue:13,chartType:'dx'})
const stage=()=>({id:'first',name:'第一阶段',advanceCount:1,players:[player('甲'),player('乙')],songs:[],locked:false})
test('per-song aggregation requires completeness, preserves zero and rounds decimal sums',()=>{
  const songs=[song('a'),song('b')],p={...player('甲'),chartScores:{a:{score:100.1234,dxScore:1000},b:{score:0,dxScore:0}}}
  assert.equal(aggregatePlayer(p,songs).score,100.1234);assert.equal(aggregatePlayer(p,songs).dxScore,1000)
  assert.equal(aggregatePlayer({...p,chartScores:{a:p.chartScores.a}},songs).score,null)
  for(const bad of [{score:101.01,dxScore:0},{score:100,dxScore:1.5},{score:-1,dxScore:null}])assert.throws(()=>validateChartScore(bad))
})
test('tiebreak resolves cutoff without changing base totals and invalidates when rules change',()=>{
  const s=stage();assert.equal(cutoffTies(s)[0].length,2)
  s.tiebreaks=[{id:'round',timestamp:1,note:'加赛',fingerprint:scoreFingerprint(s),scores:{甲:{score:99,dxScore:0},乙:{score:100,dxScore:0}}}]
  const result=rankPlayers(s);assert.equal(result.tieAtCutoff,false);assert.equal(result.players.find(p=>p.advanced).id,'乙');assert.equal(result.players[0].score,100)
  assert.equal(activeTiebreaks(validateStages([s])[0]).length,1)
  assert.equal(activeTiebreaks({...s,advanceCount:2}).length,0)
  assert.equal(activeTiebreaks({...s,songs:[song('new')]}).length,0)
  const routed=routeStageResults([s,{...stage(),id:'final',players:[]}],'first');assert.equal(routed[1].players[0].score,null);assert.deepEqual(routed[1].players[0].chartScores,{})
})
test('additional tied rounds only decide ties still unresolved by earlier rounds',()=>{
  const s={...stage(),players:[player('a'),player('b'),player('c')]},fp=scoreFingerprint(s)
  s.tiebreaks=[{id:'1',timestamp:1,note:'',fingerprint:fp,scores:{a:{score:90,dxScore:null},b:{score:99,dxScore:null},c:{score:99,dxScore:null}}},{id:'2',timestamp:2,note:'',fingerprint:fp,scores:{b:{score:70,dxScore:null},c:{score:80,dxScore:null}}}]
  assert.equal(rankPlayers(s).players.find(p=>p.advanced).id,'c');assert.deepEqual(cutoffTies(s),[])
})
test('chart history survives JSON, distinguishes stage/event and excludes all charts of a song',()=>{
  const songs=[song('a-master','a'),song('a-expert','a'),song('b')],history=recordCharts(emptyChartHistory(),[songs[0]],'event','stage1'),restored=JSON.parse(JSON.stringify(history))
  assert.deepEqual(chartCandidates(songs,restored,'event','stage1').map(s=>s.id),['b'])
  assert.equal(chartCandidates(songs,restored,'event','stage2').length,2)
  assert.equal(chartCandidates(songs,{...restored,scope:'event'},'event','stage2').length,1)
  assert.equal(chartCandidates(songs,{...restored,scope:'none',excluded:['a']},'event','stage1').length,1)
  assert.equal(chartCandidates(songs,restored,'new-event','stage1').length,2)
})
test('reports preserve original totals, per-song records and spreadsheet formula safety',()=>{
  const s={...stage(),players:[{...player('=1+1'),chartScores:{a:{score:99,dxScore:12}}}],songs:[song('a')]},rows=reportRows([s]);assert.equal(rows.summary[1][1],"'=1+1");assert.equal(rows.songs[1][4],99);assert.equal(rows.summary[1][5],'未确认')
})
