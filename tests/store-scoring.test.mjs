import test from 'node:test'
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
const {build}=createRequire(import.meta.resolve('vite'))('esbuild')
// Bundle only the store for a Node unit test; these mocks never connect to the preview or real storage.
const compiled=await build({entryPoints:[fileURLToPath(new URL('../src/store/tournamentStore.ts',import.meta.url))],bundle:true,platform:'node',format:'esm',write:false,logLevel:'silent'})
const local=new Map(),events=new EventTarget();let blocked=false,writes=0
Object.assign(globalThis,{window:events,localStorage:{getItem:key=>local.get(key)??null,setItem:(key,value)=>{if(blocked)throw new Error('quota');local.set(key,value)}}})
events.addEventListener('pro-data-write',()=>writes++)
const {useTournamentStore:store,TOURNAMENT_KEY}=await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString('base64')}`)
const player=(id,score=null)=>({id,name:id,rating:null,score,dxScore:1000,rank:null,advanced:false})
const stage=(mode='songs')=>({id:'first',name:'预赛',advanceCount:1,players:[player('a'),player('b')],songs:[{id:'s1',name:'曲目'}],locked:false,scoreMode:mode})
function reset(s){blocked=false;store.setState({eventId:'unit-event',stages:[s],currentStage:s.id,started:true,customMode:false,undo:null});writes=0}

test('saved score batch writes and publishes once, failed persistence leaves the stage untouched',()=>{
  reset(stage());const edit={playerId:'a',songId:'s1',field:'score',value:100,expected:null}
  blocked=true;const before=JSON.stringify(store.getState().stages)
  assert.throws(()=>store.getState().saveScores('first','songs',[edit]),/未保存/);assert.equal(JSON.stringify(store.getState().stages),before);assert.equal(writes,0)
  blocked=false;store.getState().saveScores('first','songs',[edit]);assert.equal(writes,1)
  assert.equal(store.getState().stages[0].players[0].score,100);assert.equal(JSON.parse(local.get(TOURNAMENT_KEY)).stages[0].players[0].score,100)
})
test('tiebreak save cannot consume a round when storage fails and publishes a complete round once',()=>{
  reset({...stage('total'),players:[player('a',100),player('b',100)]})
  const scores={a:{score:99,dxScore:null},b:{score:100,dxScore:null}}
  blocked=true;assert.throws(()=>store.getState().addTiebreak('first',scores,'加赛'),/未保存/);assert.equal(store.getState().stages[0].tiebreaks,undefined);assert.equal(writes,0)
  blocked=false;store.getState().addTiebreak('first',scores,'加赛');assert.equal(writes,1)
  const s=store.getState().stages[0];assert.equal(s.tiebreaks.length,1);assert.deepEqual(s.tiebreaks[0].scores,scores);assert.deepEqual(s.players.map(p=>p.score),[100,100])
})
