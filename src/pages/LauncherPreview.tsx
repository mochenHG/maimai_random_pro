import { Check, Copy } from 'lucide-react'
import { useState } from 'react'
import BrandLogo from '../components/BrandLogo'
export default function LauncherPreview() {
  const [copied,setCopied]=useState(false)
  return <main className="launcher-preview is-dark"><section className="launcher-window is-dark" aria-label="启动器外观预览"><div className="launcher-top"><span className="brand"><BrandLogo/></span><span className="status-dot" aria-label="本地服务已启动"/></div><div className="launcher-card"><h1>ready <em>to play</em><span>.</span></h1><div className="launcher-status"><span className="status-dot"/>本地服务已启动</div></div><div className="launcher-actions"><a className="primary button" href="/">打开页面</a><button onClick={async()=>{try{await navigator.clipboard.writeText(`${location.origin}/obs?clean=1`);setCopied(true)}catch{setCopied(false)}}}>{copied?<Check size={18}/>:<Copy size={18}/>}复制 OBS 地址</button></div></section></main>
}
