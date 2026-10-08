import { useDirector } from '../store/directorStore'
import { useTournamentStore } from '../store/tournamentStore'
import { useSongStore } from '../store/songStore'
import { useSyncStatus } from '../lib/sync'
import OBSStandings from '../components/OBSStandings'
import OBSRaffle from './OBSRaffle'
import CallboardDisplay from '../components/CallboardDisplay'
import OBSCountdown from '../components/OBSCountdown'
import { OBSSongScene, OBSStandby, useOBSPresentation } from '../components/OBSScene'

export default function OBSLive() {
  const { data } = useDirector(), stages = useTournamentStore(s => s.stages), current = useTournamentStore(s => s.currentStage)
  const draw = useSongStore(s => s.selectedSongs), sync = useSyncStatus()
  const drawKey=useSongStore(s=>s.drawKey)
  useOBSPresentation()
  const stage = stages.find(s => s.id === current), songs = stage?.songs.length ? stage.songs : draw
  const shown = stage && data.hideScores ? { ...stage, players: stage.players.map(p => ({ ...p, score: null, dxScore: null, chartScores: {} })), scoreMode: 'total' as const } : stage
  return <div className={`obs-director${data.hideScores ? ' scores-hidden' : ''}`} style={{ '--obs-bottom-inset': data.endAt === null ? '0px' : '128px' } as React.CSSProperties}>
    <div className="obs-scene" key={`${data.scene}-${stage?.id ?? ''}`}>
      {data.scene === 'standby' && <OBSStandby title={data.title} stage={stage?.name}/>}
      {data.scene === 'song' && <OBSSongScene songs={songs} revision={stage?.songs.length?0:drawKey} title={stage?.songs.length ? stage.name : 'next track'}/>}
      {(data.scene === 'ranking' || data.scene === 'advance') && shown && <OBSStandings stage={data.scene === 'ranking' ? { ...shown, locked: false } : shown} connected={sync === 'connected'} bottomInset={data.endAt === null ? 0 : 128}/>}
      {data.scene === 'raffle' && <OBSRaffle embedded/>}
      {data.scene === 'callboard' && <CallboardDisplay/>}
    </div>
    {data.endAt !== null && <OBSCountdown endAt={data.endAt}/>}
  </div>
}

