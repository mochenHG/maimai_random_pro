import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { Trophy } from 'lucide-react'
import { createPortal } from 'react-dom'
const CelebrationContext=createContext<(title:string)=>void>(()=>{})
export const useCelebration=()=>useContext(CelebrationContext)
export default function CelebrationProvider({children}:{children:React.ReactNode}) {
  const [event,setEvent]=useState<{title:string;id:number}|null>(null)
  const timer=useRef<ReturnType<typeof setTimeout>>()
  useEffect(()=>()=>clearTimeout(timer.current),[])
  const celebrate=(title:string)=>{clearTimeout(timer.current);setEvent({title,id:performance.now()});timer.current=setTimeout(()=>setEvent(null),1800)}
  return <CelebrationContext.Provider value={celebrate}>{children}{event && createPortal(<div className="celebration" key={event.id} role="status" aria-live="polite"><div className="celebration-halo"/><div className="celebration-content"><div className="celebration-icon"><Trophy size={58} strokeWidth={1.4}/></div><h2>{event.title}</h2></div><div aria-hidden="true" className="celebration-particles">{Array.from({length:18},(_,i)=><i key={i} style={{'--angle':`${i*20}deg`,'--delay':`${i%4*30}ms`} as React.CSSProperties}/>)}</div></div>,document.body)}</CelebrationContext.Provider>
}
