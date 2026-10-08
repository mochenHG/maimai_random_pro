/** Clipboard API needs HTTPS on phones; the selected-text fallback also works over LAN HTTP. */
export async function copyText(text:string):Promise<boolean>{
  try{if(navigator.clipboard?.writeText){await navigator.clipboard.writeText(text);return true}}catch{/* Use the local selection fallback when browser permission is unavailable. */}
  const previous=document.activeElement as HTMLElement|null,selection=window.getSelection()
  const ranges=selection?Array.from({length:selection.rangeCount},(_,i)=>selection.getRangeAt(i).cloneRange()):[]
  const input=document.createElement('textarea');input.value=text;input.readOnly=true
  input.style.cssText='position:fixed;left:0;top:0;width:1px;height:1px;opacity:0;pointer-events:none;font-size:16px'
  document.body.append(input)
  try{input.focus({preventScroll:true});input.select();input.setSelectionRange(0,text.length);return document.execCommand('copy')}catch{return false}
  finally{input.remove();if(previous?.isConnected)previous.focus({preventScroll:true});try{if(selection){selection.removeAllRanges();ranges.forEach(range=>selection.addRange(range))}}catch{/* The original node may have changed while permission was pending. */}}
}
