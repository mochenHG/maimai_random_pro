import { ArrowLeft, Download } from 'lucide-react'
import ThemeToggle from '../components/ThemeToggle'
const concepts = [{file:'01-crossroads',name:'01 · 随机交汇'},{file:'02-orbit',name:'02 · 唱片轨道'},{file:'03-draw-cards',name:'03 · 卡片抽签'},{file:'04-r-monogram',name:'04 · 字母 r'}]
export default function LogoGallery() {
  return <main className="logo-gallery"><div className="logo-gallery-top"><a className="button" href="/"><ArrowLeft size={18}/>返回网站</a><div className="row"><a className="button" download="random-logos-v1.3.zip" href="/logos-v1.3.zip"><Download size={17}/>下载全部</a><ThemeToggle/></div></div><h1>Logo 方案<span className="heading-dot">.</span></h1><div className="logo-grid">{concepts.map(c=><article className={`logo-concept${c.file==='02-orbit'?' is-primary':''}`} key={c.file}><div className="logo-canvas"><img src={`/logo-concepts/${c.file}.png`} width={2172} height={724} alt={`${c.name} random 品牌标志`} decoding="async"/></div><div className="logo-concept-footer"><h2>{c.name}</h2><a className="button" download={`${c.file}.png`} href={`/logo-concepts/${c.file}.png`}><Download size={17}/>透明 PNG</a></div></article>)}</div></main>
}
