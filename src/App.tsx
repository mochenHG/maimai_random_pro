import { Component, lazy, Suspense, useEffect, useState } from 'react'
import { Database, Shuffle, Trophy } from 'lucide-react'
import { NoticeProvider } from './components/Notice'
import { enableSync, useSyncStatus } from './lib/sync'
import ThemeToggle from './components/ThemeToggle'
import ClickSpark from './components/ClickSpark'
import CelebrationProvider from './components/Celebration'
import LauncherPreview from './pages/LauncherPreview'
import DotBackground from './components/DotBackground'
import { useTournamentStore } from './store/tournamentStore'
import SurfaceMotion from './components/SurfaceMotion'
import LogoGallery from './pages/LogoGallery'
import BrandLogo from './components/BrandLogo'
import GlassEffects from './components/GlassEffects'
const Draw = lazy(() => import('./pages/Draw'))
const Library = lazy(() => import('./pages/Library'))
const Tournament = lazy(() => import('./pages/Tournament'))
const OBS = lazy(() => import('./pages/OBS'))
type Page = 'draw' | 'library' | 'tournament' | 'obs' | 'obs-tournament' | 'launcher-preview' | 'logos'
function currentPage(): Page {
  const path = window.location.pathname; const query = new URLSearchParams(window.location.search)
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
  useEffect(() => {enableSync(page !== 'obs' && page !== 'obs-tournament')}, [page])
  useEffect(() => {const change = () => setPage(currentPage()); window.addEventListener('popstate', change); return () => window.removeEventListener('popstate', change)}, [])
  const navigate = (target: Page) => {history.pushState({},'',target === 'draw' ? '/' : `/${target}`); setPage(target); window.scrollTo(0,0)}
  if(page === 'obs' || page === 'obs-tournament') return <Suspense fallback={<Loader/>}><OBS tournament={page === 'obs-tournament'}/></Suspense>
  if(page === 'launcher-preview') return <><LauncherPreview/><ClickSpark/></>
  if(page === 'logos') return <><LogoGallery/><ClickSpark/></>
  return <div className={`app-frame${navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4 ? ' glass-lite' : ''}`}><DotBackground active={tournamentStarted}/><div className="ambient-light" aria-hidden="true"><i className="ambient-source"/><i className="ambient-halo"/></div><header className="topbar"><div className="header-prism" aria-hidden="true"/><a className="brand" aria-label="random · 返回随机选曲" href="/" onClick={e => {e.preventDefault(); navigate('draw')}}><BrandLogo page={page}/></a><nav className="main-nav" aria-label="主要功能" style={{'--nav-index':page==='draw'?0:page==='library'?1:2} as React.CSSProperties}>{([{id:'draw',name:'随机选曲',Icon:Shuffle},{id:'library',name:'曲库',Icon:Database},{id:'tournament',name:'赛事',Icon:Trophy}] as const).map(({id,name,Icon}) => <button key={id} aria-current={page === id ? 'page' : undefined} className={page === id ? 'selected' : ''} onClick={() => navigate(id)}><Icon size={16}/>{name}</button>)}</nav><div className="header-tools"><ThemeToggle/><span className={`status-dot ${sync}`} title={sync === 'connected' ? 'OBS 同步已连接' : 'OBS 同步未连接'}/></div></header>
    <main key={page} className="workspace"><div className="accent-orbit" aria-hidden="true"><i/><i/><i/></div><ErrorBoundary key={page}><Suspense fallback={<Loader/>}>{page === 'draw' && <Draw openLibrary={() => navigate('library')}/>} {page === 'library' && <Library/>} {page === 'tournament' && <Tournament/>}</Suspense></ErrorBoundary></main><ClickSpark/>
  </div>
}
export default function App() { return <NoticeProvider><CelebrationProvider><ErrorBoundary><Workspace/><SurfaceMotion/><GlassEffects/></ErrorBoundary></CelebrationProvider></NoticeProvider> }
