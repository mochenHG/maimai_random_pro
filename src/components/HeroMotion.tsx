import { useEffect, useRef } from 'react'
import { Disc3, Music2, Shuffle } from 'lucide-react'
export function AnimatedTitle({text}:{text:string}) {
  const split = text.indexOf(' ')
  const letters = () => <>{Array.from(text).map((letter,i)=><span aria-hidden="true" className={`${letter===' '?'title-space':''}${split>=0&&i>split?' title-light':''}`} style={{animationDelay:`${i*35}ms`}} key={i}>{letter===' '?'\u00a0':letter}</span>)}<span aria-hidden="true" className="heading-dot">.</span></>
  return <div className="title-optics"><h1 className="animated-title" aria-label={`${text}.`}>{letters()}</h1><div className="title-inverse-mask" aria-hidden="true"><div className="animated-title title-inverse">{letters()}</div></div></div>
}
export default function HeroMotion() {
  const ref=useRef<HTMLDivElement>(null)
  useEffect(()=>{
    const element=ref.current; if(!element || matchMedia('(prefers-reduced-motion: reduce)').matches)return
    let frame=0
    const move=(event:PointerEvent)=>{if(event.pointerType!=='mouse')return; cancelAnimationFrame(frame); frame=requestAnimationFrame(()=>{const rect=element.getBoundingClientRect(); element.style.setProperty('--mx',`${(event.clientX-(rect.left+rect.width/2))*.018}px`); element.style.setProperty('--my',`${(event.clientY-(rect.top+rect.height/2))*.018}px`)})}
    const reset=()=>{element.style.setProperty('--mx','0px');element.style.setProperty('--my','0px')}
    window.addEventListener('pointermove',move,{passive:true}); window.addEventListener('pointerleave',reset)
    return()=>{cancelAnimationFrame(frame);window.removeEventListener('pointermove',move);window.removeEventListener('pointerleave',reset)}
  },[])
  return <div className="hero-motion" ref={ref} aria-hidden="true"><div className="hero-ring ring-outer"/><div className="hero-ring ring-inner"/><div className="hero-disc"><Disc3 size={80} strokeWidth={1}/><span/></div><div className="hero-sticker sticker-note"><Music2 size={22}/></div><div className="hero-sticker sticker-shuffle"><Shuffle size={18}/></div><span className="hero-spark spark-a">✦</span><span className="hero-spark spark-b">+</span></div>
}
