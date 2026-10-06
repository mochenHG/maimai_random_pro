import { useState } from 'react'
import { Moon, Sun } from 'lucide-react'
function preferred() {try {const value=localStorage.getItem('maimai-pro-theme'); if(value==='light'||value==='dark')return value} catch { /* Use system preference. */ } return matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}
export function initializeTheme() {document.documentElement.dataset.theme=preferred()}
export default function ThemeToggle() {
  const [theme,setTheme]=useState(preferred)
  const toggle=(event:React.MouseEvent<HTMLButtonElement>)=>{
    const next=theme==='dark'?'light':'dark'
    const apply=()=>{document.documentElement.dataset.theme=next; setTheme(next); try {localStorage.setItem('maimai-pro-theme',next)} catch { /* Theme remains usable during the session. */ }}
    const r=event.currentTarget.getBoundingClientRect()
    document.documentElement.style.setProperty('--theme-x',`${r.left+r.width/2}px`)
    document.documentElement.style.setProperty('--theme-y',`${r.top+r.height/2}px`)
    if(document.startViewTransition && !matchMedia('(prefers-reduced-motion: reduce)').matches) document.startViewTransition(apply)
    else apply()
  }
  return <button className="theme-toggle" aria-label={theme==='dark'?'切换浅色模式':'切换深色模式'} title={theme==='dark'?'切换浅色模式':'切换深色模式'} onClick={toggle}><span key={theme}>{theme==='dark'?<Sun size={18}/>:<Moon size={18}/>}</span></button>
}
