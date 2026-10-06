import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, ChevronDown } from 'lucide-react'
interface Option { value: string | number; label: string }
export default function Select({label,value,options,onChange,disabled=false}: {label:string;value:string|number;options:Option[];onChange:(value:string)=>void;disabled?:boolean}) {
  const id=useId(); const trigger=useRef<HTMLButtonElement>(null); const menu=useRef<HTMLDivElement>(null)
  const [open,setOpen]=useState(false); const [active,setActive]=useState(0); const [query,setQuery]=useState('')
  const [position,setPosition]=useState({left:0,top:0,width:0,maxHeight:260})
  const selected=options.find(o=>String(o.value)===String(value))
  const filtered=options.filter(o=>o.label.toLocaleLowerCase().includes(query.toLocaleLowerCase()))
  const close=()=>{setOpen(false); setQuery('')}
  const choose=(option:Option)=>{onChange(String(option.value)); close(); trigger.current?.focus()}
  const show=()=>{setQuery(''); setActive(Math.max(0,options.findIndex(o=>String(o.value)===String(value)))); setOpen(true)}
  useLayoutEffect(()=>{
    if(!open) return
    const place=()=>{const r=trigger.current?.getBoundingClientRect(); if(!r)return; const below=innerHeight-r.bottom-16; const above=r.top-16; const height=Math.min(300,Math.max(below,above)); const flip=below<180 && above>below; setPosition({left:Math.max(8,Math.min(r.left,innerWidth-r.width-8)),top:flip?Math.max(8,r.top-height-8):r.bottom+8,width:r.width,maxHeight:height})}
    place(); window.addEventListener('resize',place); window.addEventListener('scroll',place,true)
    return()=>{window.removeEventListener('resize',place); window.removeEventListener('scroll',place,true)}
  },[open])
  useEffect(()=>{
    if(!open)return
    const outside=(event:PointerEvent)=>{if(!trigger.current?.contains(event.target as Node) && !menu.current?.contains(event.target as Node)){setOpen(false);setQuery('')}}
    document.addEventListener('pointerdown',outside)
    return()=>document.removeEventListener('pointerdown',outside)
  },[open])
  useEffect(()=>{if(open) document.getElementById(`${id}-${active}`)?.scrollIntoView({block:'nearest'})},[active,id,open])
  const key=(event:React.KeyboardEvent)=>{
    if(event.key==='Escape'){event.preventDefault();close();trigger.current?.focus();return}
    if(event.key==='Tab'){close();return}
    if(['ArrowDown','ArrowUp','Home','End'].includes(event.key)){event.preventDefault(); if(!open){show();return} setActive(n=>event.key==='Home'?0:event.key==='End'?Math.max(0,filtered.length-1):Math.max(0,Math.min(filtered.length-1,n+(event.key==='ArrowDown'?1:-1))))}
    if(event.key==='Enter' || (event.key===' ' && event.target===trigger.current)){event.preventDefault(); if(open && filtered[active])choose(filtered[active]);else show()}
  }
  return <><button ref={trigger} type="button" role="combobox" aria-label={label} aria-expanded={open} aria-controls={`${id}-list`} aria-haspopup="listbox" aria-activedescendant={open?`${id}-${active}`:undefined} className={`select-trigger ${open?'is-open':''}`} disabled={disabled} onClick={()=>open?close():show()} onKeyDown={key}><span>{selected?.label || '请选择'}</span><ChevronDown size={16}/></button>{open && createPortal(<div ref={menu} className="select-popover" style={{left:position.left,top:position.top,width:position.width,maxHeight:position.maxHeight}} onKeyDown={key}>{options.length>8 && <input className="select-search" aria-label={`搜索${label}`} placeholder="搜索选项…" value={query} onChange={e=>{setQuery(e.target.value);setActive(0)}}/>}<div className="select-options" role="listbox" id={`${id}-list`} aria-label={`${label}选项`}>{filtered.map((option,i)=><button type="button" role="option" id={`${id}-${i}`} key={option.value} aria-selected={String(option.value)===String(value)} className={`${i===active?'active':''} ${String(option.value)===String(value)?'chosen':''}`} onPointerMove={()=>setActive(i)} onClick={()=>choose(option)}><span>{option.label}</span>{String(option.value)===String(value)&&<Check size={15}/>}</button>)}{!filtered.length&&<p className="hint">没有匹配选项</p>}</div></div>,trigger.current?.closest('dialog')??document.body)}</>
}
