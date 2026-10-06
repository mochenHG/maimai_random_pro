import test from 'node:test'
import assert from 'node:assert/strict'
import { detectColumns, parseRating, parseRoster } from '../src/lib/roster.ts'
import { mergeRoster, rankPlayers, defaultStages, validateStages } from '../src/lib/tournament.ts'
import { normalizeSongs, sample, parseLevel } from '../src/lib/songs.ts'
test('Chinese and English headers, title rows and ranting are identified', () => {
  assert.deepEqual(detectColumns([['赛事报名'], [], ['序号','选手昵称','ｒａｎｔｉｎｇ'],[1,'小舞',15000]]), {headerRow:2,name:1,rating:2})
  assert.deepEqual(detectColumns([['Player Name','Rating']]), {headerRow:0,name:0,rating:1})
  assert.equal(detectColumns([['任意字段','未知列']]).name, -1)
})
test('rating supports blanks, full-width digits, thousands separators and zero', () => {
  for(const [input, expected] of [['１５，０００',15000],['15,000.5',15000.5],[0,0],['',null],[null,null],['14500',14500]]) assert.equal(parseRating(input),expected)
  for(const input of ['15,00','abc','15000xx',-1,Infinity,100001,true]) assert.ok(Number.isNaN(parseRating(input)))
})
test('roster validation keeps valid rows, physical row numbers and duplicate warnings', () => {
  const result = parseRoster([['昵称','rating'],['甲',15000],[],['乙','bad'],['甲',16000],['',14000],['丙',null],['丁',0]],0,0,1)
  assert.deepEqual(result.entries,[{name:'甲',rating:15000},{name:'丙',rating:null},{name:'丁',rating:0}])
  assert.deepEqual(result.issues.map(x=>x.row),[4,5,6]); assert.equal(result.emptyRatings,1)
})
test('merge matches names, preserves results and existing IDs, does not erase rating on blank', () => {
  const players = [{id:'1',name:'甲',rating:14000,score:202.0123,dxScore:1200,rank:null,advanced:false}]
  const result = mergeRoster(players,[{name:'甲',rating:15000},{name:'乙',rating:13000}],'merge')
  assert.equal(result.added,1); assert.equal(result.updated,1); assert.equal(result.players[0].id,'1'); assert.equal(result.players[0].score,202.0123); assert.equal(result.players[0].dxScore,1200)
  assert.equal(players[0].rating,14000)
  assert.equal(mergeRoster(result.players,[{name:'甲',rating:null}],'merge').players[0].rating,15000)
  assert.equal(mergeRoster(players,[{name:'甲',rating:16000}],'append').players[0].rating,14000)
})
test('rankings use scores and DX, preserve rating, and flag ties at advancement cutoff', () => {
  const players = [ ['甲',14000,202,100], ['乙',16000,202,200], ['丙',17000,null,null] ].map(([name,rating,score,dxScore],i)=>({id:String(i),name,rating,score,dxScore,rank:null,advanced:false}))
  const stage = {...defaultStages()[0],advanceCount:1,players}
  const ranked = rankPlayers(stage); assert.equal(ranked.players[1].rank,1); assert.equal(ranked.players[1].advanced,true); assert.equal(ranked.players[2].rank,null); assert.equal(ranked.tieAtCutoff,false)
  stage.players[0].dxScore=200; assert.equal(rankPlayers(stage).tieAtCutoff,true)
})
test('untrusted backup validation rejects duplicate stages and non-numeric scores', () => {
  const stages=defaultStages(); assert.equal(validateStages(stages).length,5)
  assert.throws(()=>validateStages([stages[0],stages[0]]))
  assert.throws(()=>validateStages([{...stages[0],players:[{id:'x',name:'甲',rating:'bad',score:null,dxScore:null}]}]))
})
test('legacy song JSON normalization, duplicate detection and partial unbiased sample', () => {
  const raw={id:'1-dx-3',name:'示例谱面',difficulty:'MASTER',level:'14+',chartType:'dx'}
  const songs=normalizeSongs([raw]); assert.equal(songs[0].level,14); assert.equal(songs[0].isPlus,true)
  assert.equal(parseLevel('14+'),14.5); assert.ok(Number.isNaN(parseLevel('x')))
  assert.throws(()=>normalizeSongs([raw,raw])); assert.throws(()=>normalizeSongs([{...raw,level:99}]))
  const data=Array.from({length:100},(_,i)=>i); const result=sample(data,4); assert.equal(result.length,4); assert.equal(new Set(result).size,4); assert.equal(data[0],0); assert.deepEqual(sample([],4),[])
})
