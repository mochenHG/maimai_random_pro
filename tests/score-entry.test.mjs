import test from 'node:test'
import assert from 'node:assert/strict'
import { applyScoreEdits, parseScoreInput, switchScoreMode, tiebreakPlaces, cutoffTies, scoreFingerprint } from '../src/lib/scoring.ts'
import { rankPlayers } from '../src/lib/tournament.ts'
const player=(id,score=null,dxScore=null)=>({id,name:id,rating:null,score,dxScore,rank:null,advanced:false})
const stage=()=>({id:'first',name:'预赛',advanceCount:1,players:[player('a'),player('b')],songs:[{id:'song1',name:'第一首'},{id:'song2',name:'第二首'}],locked:false,scoreMode:'songs'})
const edit=(playerId,songId,field,value,expected=null)=>({playerId,songId,field,value,expected})

test('entry accepts full-width digits and zero, rejects incomplete/fractional DX and excessive precision',()=>{
  assert.equal(parseScoreInput('１００.１２３４','score'),100.1234)
  assert.equal(parseScoreInput('.5%','score'),.5);assert.equal(parseScoreInput('１００％','score'),100)
  assert.equal(parseScoreInput('0','score'),0);assert.equal(parseScoreInput('  ','dxScore'),null)
  assert.equal(parseScoreInput('1,234','dxScore'),1234)
  for(const input of ['100abc','1e2','-1','100.12345','101.1'])assert.throws(()=>parseScoreInput(input,'score'))
  assert.throws(()=>parseScoreInput('1.5','dxScore'));assert.equal(parseScoreInput('400','score','total'),400)
})
test('incomplete base scores do not create premature tiebreak groups',()=>{
  const s={...stage(),scoreMode:'total',players:[player('a',100,1000),player('b',100,1000),player('c')]}
  assert.deepEqual(cutoffTies(s),[])
  s.players[2].score=90;assert.equal(cutoffTies(s)[0].length,2)
})
test('one batch aggregates edited charts and preserves unrelated entries and the original stage',()=>{
  const s=stage(),next=applyScoreEdits(s,'songs',[edit('a','song1','score',100.1234),edit('a','song1','dxScore',1000),edit('a','song2','score',99.9),edit('a','song2','dxScore',1001),edit('b','song1','score',0)])
  assert.equal(next.players[0].score,200.0234);assert.equal(next.players[0].dxScore,2001);assert.equal(next.players[1].score,null)
  assert.equal(s.players[0].chartScores,undefined);assert.equal(s.players[0].score,null)
  assert.equal(next.players[1].chartScores.song1.score,0)
})
test('invalid or stale edits reject the entire batch before any field is changed',()=>{
  const s=stage(),before=JSON.stringify(s)
  for(const second of [edit('a','song2','score',102),edit('missing','song2','score',99),edit('a','missing','score',99),edit('a','song2','score',99,98),edit('a','song1','score',99)])assert.throws(()=>applyScoreEdits(s,'songs',[edit('a','song1','score',100),second]))
  assert.equal(JSON.stringify(s),before)
  assert.throws(()=>applyScoreEdits({...s,locked:true},'songs',[edit('a','song1','score',100)]))
  assert.throws(()=>applyScoreEdits(s,'total',[edit('a',undefined,'score',100)]))
})
test('changing modes retains the latest totals as well as independent per-song scores',()=>{
  let s={...stage(),scoreMode:'total',players:[player('a',300,1234)]}
  s=switchScoreMode(s,'songs');assert.equal(s.players[0].score,null)
  s=applyScoreEdits(s,'songs',[edit('a','song1','score',100),edit('a','song2','score',99)])
  assert.equal(s.players[0].score,199);s=switchScoreMode(s,'total');assert.equal(s.players[0].score,300)
  s=applyScoreEdits(s,'total',[edit('a',undefined,'score',301,300)]);s=switchScoreMode(s,'songs');assert.equal(s.players[0].score,199)
  s=switchScoreMode(s,'total');assert.equal(s.players[0].score,301);assert.equal(s.players[0].dxScore,1234)
  assert.equal(switchScoreMode(s,'total'),s)
})
test('tiebreak states show the remaining places globally and per group without replacing original scores',()=>{
  const s={...stage(),scoreMode:'total',advanceCount:2,players:[player('top',101,1000),player('a',100,1000),player('b',100,1000),player('c',100,1000)]}
  const tied=cutoffTies(s)[0];assert.equal(tied.length,3);assert.equal(tiebreakPlaces(s,tied),1)
  const grouped={...s,rankingMethod:'group',advancePerGroup:2,groups:[{id:'g',name:'A组',playerIds:['top','a','b','c']}]};assert.equal(tiebreakPlaces(grouped,cutoffTies(grouped)[0]),1)
  s.tiebreaks=[{id:'r',timestamp:1,note:'加赛',fingerprint:scoreFingerprint(s),scores:{a:{score:99,dxScore:100},b:{score:99,dxScore:101},c:{score:90,dxScore:null}}}]
  assert.equal(rankPlayers(s).tieAtCutoff,false);assert.equal(rankPlayers(s).players.find(p=>p.id==='b').advanced,true);assert.equal(s.players[2].score,100)
})
