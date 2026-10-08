import { Component, lazy, Suspense, useEffect, useLayoutEffect, useState } from 'react'
import MainNav from './components/MainNav'
import { NoticeProvider } from './components/Notice'
import { enableSync, useSyncStatus } from './lib/sync'
import ThemeToggle from './components/ThemeToggle'
import ClickSpark from './components/ClickSpark'
import CelebrationProvider from './components/Celebration'
import LauncherPreview from './pages/LauncherPreview'
import DotBackground from './components/DotBackground'
import { publishRaffle } from './store/raffleStore'
import { save } from './lib/storage'
import { useTournamentStore } from './store/tournamentStore'
import SurfaceMotion from './components/SurfaceMotion'
import LogoGallery from './pages/LogoGallery'
import BrandLogo from './components/BrandLogo'
import GlassEffects from './components/GlassEffects'
import { startSnapshots } from './lib/snapshots'
import NetworkControl from './components/NetworkControl'
const Raffle = lazy(() => import('./pages/Raffle'))
const Director = lazy(() => import('./pages/Director'))
const OBSLive = lazy(() => import('./pages/OBSLive'))
const Draw = lazy(() => import('./pages/Draw'))
const Library = lazy(() => import('./pages/Library'))
const Tournament = lazy(() => import('./pages/Tournament'))
const OBSRaffle = lazy(() => import('./pages/OBSRaffle'))
const OBS = lazy(() => import('./pages/OBS'))
type Page = 'raffle' | 'director' | 'obs-live' | 'draw' | 'library' | 'tournament' | 'obs' | 'obs-tournament' | 'obs-raffle' | 'launcher-preview' | 'logos'
function currentPage(): Page {
  const path = window.location.pathname; const query = new URLSearchParams(window.location.search)
  if(path === '/raffle') return 'raffle'
  if(path === '/director') return 'director'
  if(path === '/obs-live') return 'obs-live'
  if(path === '/obs-raffle' || query.get('obs-raffle') === '1') return 'obs-raffle'
  if(path === '/obs-tournament' || query.get('obs-tournament') === '1') return 'obs-tournament'
  if(path === '/obs' || query.get('obs') === '1') return 'obs'
  if(path === '/launcher-preview') return 'launcher-preview'
  if(path === '/logos') return 'logos'
  if(path === '/tournament') return 'tournament'
  if(path === '/library') return 'library'
  return 'draw'
}
class ErrorBoundary extends Component<{children: React.ReactNode}, {failed: boolean}> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() { return this.state.failed ? <div className="empty"><h2>页面加载遇到问题</h2><p>本地数据仍保存在浏览器中，请刷新重试。</p><button onClick={() => location.reload()}>刷新页面</button></div> : this.props.children }
}
function Loader() { return <div className="empty" role="status">正在加载…</div> }
function Workspace() {
  const [page, setPage] = useState<Page>(currentPage)
  const sync = useSyncStatus()
  const tournamentStarted = useTournamentStore(s => s.started)
  useEffect(() => {if (!page.startsWith('obs')) {if(!localStorage.getItem('maimai-pro-tournament')){const {eventId,stages,currentStage,started,customMode}=useTournamentStore.getState();save('maimai-pro-tournament',{eventId,stages,currentStage,started,customMode})}publishRaffle()} enableSync(!page.startsWith('obs'))}, [page])
  useEffect(() => {const change = () => setPage(currentPage()); window.addEventListener('popstate', change); return () => window.removeEventListener('popstate', change)}, [])
  useEffect(() => page.startsWith('obs') ? undefined : startSnapshots(), [page])
  useLayoutEffect(()=>{if(!page.startsWith('obs'))window.scrollTo({top:0,left:0,behavior:'instant'})},[page])
  const navigate = (target: Page) => {if(target===page){window.scrollTo({top:0,left:0,behavior:'instant'});return}history.pushState({},'',target === 'draw' ? '/' : `/${target}`); setPage(target)}
  if(page === 'obs-live') return <Suspense fallback={null}><OBSLive/></Suspense>
  if(page === 'obs-raffle') return <Suspense fallback={null}><OBSRaffle/></Suspense>
  if(page === 'obs' || page === 'obs-tournament') return <Suspense fallback={null}><OBS tournament={page === 'obs-tournament'}/></Suspense>
  if(page === 'launcher-preview') return <><LauncherPreview/><ClickSpark/></>
  if(page === 'logos') return <><LogoGallery/><ClickSpark/></>
  return <div className={`app-frame${navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4 ? ' glass-lite' : ''}`}><DotBackground active={tournamentStarted}/><div className="ambient-light" aria-hidden="true"><i className="ambient-source"/></div><header className="topbar"><div className="header-prism" aria-hidden="true"/><a className="brand" aria-label="random · 返回随机选曲" href="/" onClick={e => {e.preventDefault(); navigate('draw')}}><BrandLogo page={page}/></a><MainNav page={page} navigate={navigate}/><div className="header-tools"><ThemeToggle/><span className={`status-dot ${sync}`} title={sync === 'connected' ? 'OBS 同步已连接' : 'OBS 同步未连接'}/></div></header>
    {sync==='pairing'?<main className="workspace"><NetworkControl gate/></main>:<main key={page} className="workspace"><div className="accent-orbit" aria-hidden="true"><i/><i/><i/></div><ErrorBoundary key={page}><Suspense fallback={<Loader/>}>{page === 'draw' && <Draw openLibrary={() => navigate('library')}/>} {page === 'library' && <Library/>} {page === 'tournament' && <Tournament/>} {page === 'raffle' && <Raffle/>} {page === 'director' && <Director/>}</Suspense></ErrorBoundary></main>}<ClickSpark/>
  </div>
}
export default function App() { return <NoticeProvider><CelebrationProvider><ErrorBoundary><Workspace/><SurfaceMotion/><GlassEffects/></ErrorBoundary></CelebrationProvider></NoticeProvider> }
