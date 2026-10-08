import { useLayoutEffect, useRef, useState } from 'react'
import { Database, Shuffle, Trophy, Gift, Radio } from 'lucide-react'
export type NavPage = 'draw'|'library'|'tournament'|'raffle'|'director'
const items=[{id:'draw',name:'随机选曲',Icon:Shuffle},{id:'library',name:'曲库',Icon:Database},{id:'tournament',name:'赛事',Icon:Trophy},{id:'raffle',name:'赛事抽奖',Icon:Gift},{id:'director',name:'导播',Icon:Radio}] as const
type Bounds={left:number;top:number;width:number;height:number}
export default function MainNav({page,navigate}:{page:NavPage;navigate:(page:NavPage)=>void}){
  const nav=useRef<HTMLElement>(null)
  const [pill,setPill]=useState<Bounds|null>(null)
  useLayoutEffect(()=>{
    const element=nav.current;if(!element)return
    const measure=()=>{
      const selected=element.querySelector<HTMLButtonElement>('[aria-current="page"]');if(!selected)return
      const next={left:selected.offsetLeft,top:selected.offsetTop,width:selected.offsetWidth,height:selected.offsetHeight}
      setPill(old=>old && Object.keys(next).every(key=>next[key as keyof Bounds]===old[key as keyof Bounds])?old:next)
    }
    measure()
    const observer=new ResizeObserver(measure)
    observer.observe(element);element.querySelectorAll('button').forEach(button=>observer.observe(button))
    return()=>observer.disconnect()
  },[page])
  return <nav ref={nav} className={`main-nav morph-nav${pill?' has-pill':''}`} aria-label="主要功能">
    {pill&&<span className="nav-active-pill" aria-hidden="true" style={{width:pill.width,height:pill.height,transform:`translate3d(${pill.left}px,${pill.top}px,0)`}}/>}
    {items.map(({id,name,Icon})=><button key={id} type="button" data-nav-icon={id} aria-current={page===id?'page':undefined} className={page===id?'selected':''} onClick={()=>navigate(id)}><Icon size={16}/><span>{name}</span></button>)}
  </nav>
}
