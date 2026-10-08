import { useMemo } from 'react'
import { connectionQR } from '../lib/connectionQR'
export default function ConnectionQR({address}:{address:string}){
  const result=useMemo(()=>{try{return connectionQR(address)}catch{return null}},[address])
  if(!result)return <p className="hint">二维码无法生成，请复制上方地址。</p>
  return <div className="connection-qr"><svg viewBox={`0 0 ${result.size} ${result.size}`} role="img" aria-label="扫码打开手机导播控制台" shapeRendering="crispEdges"><rect width={result.size} height={result.size} fill="#fff"/><path d={result.path} fill="#000"/></svg><span>扫码打开控制台<br/>输入旁边的六位配对码</span></div>
}
