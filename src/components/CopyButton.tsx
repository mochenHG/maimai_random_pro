import MorphIcon from './MorphIcon'
import { useEffect, useRef, useState } from 'react'
import { copyText } from '../lib/clipboard'
import { useNotice } from './Notice'

export default function CopyButton({text,label='复制',ariaLabel}:{text:string;label?:string;ariaLabel:string}){
  const [copied,setCopied]=useState(false),timer=useRef<ReturnType<typeof setTimeout>>(),notice=useNotice()
  useEffect(()=>()=>clearTimeout(timer.current),[])
  useEffect(()=>{clearTimeout(timer.current);setCopied(false)},[text])
  return <button type="button" className="copy-button" aria-label={ariaLabel} onClick={async()=>{
    if(await copyText(text)){setCopied(true);clearTimeout(timer.current);timer.current=setTimeout(()=>setCopied(false),2000);notice(`${label==='复制配对码'?'配对码':'地址'}已复制。`)}
    else notice('浏览器未允许复制，请长按或选中文字复制。')
  }}><MorphIcon name={copied?'check':'copy'} size={16}/><span style={{minWidth:`${Math.max(label.length,3)}em`}}>{copied?'已复制':label}</span></button>
}
