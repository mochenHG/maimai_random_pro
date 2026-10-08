import { lazy, Suspense, useEffect, useState } from 'react'
import { reconnectSync, useSyncStatus } from '../lib/sync'
import { useNotice } from './Notice'
import CopyButton from './CopyButton'
import Select from './Select'
const ConnectionQR=lazy(()=>import('./ConnectionQR'))
interface Network {local:boolean;paired:boolean;addresses:string[];code?:string;expires?:number}
export default function NetworkControl({gate=false}:{gate?:boolean}){
  const [info,setInfo]=useState<Network|null>(null),[code,setCode]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[address,setAddress]=useState(''),status=useSyncStatus(),notice=useNotice()
  const refresh=()=>fetch('/api/network').then(r=>{if(!r.ok)throw Error('无法读取配对信息');return r.json()}).then(setInfo).catch(()=>setError('无法连接主机，请确认使用本地服务地址。'))
  useEffect(()=>{void refresh()},[status])
  if(gate&&status!=='pairing')return null
  return <section className="panel network-control content-panel">
    <div className="section-title"><h2>{info?.local?'手机与多设备控制':'连接赛事主机'}</h2>{info?.paired&&<span className="tag">{status==='connected'?'已连接':'连接中'}</span>}</div>
    {info?.local?<>
      <p className="reading-copy">手机与电脑连接同一局域网，扫码打开控制台并输入配对码。OBS 会自动接收手机上的操作。</p>
      <div className="pairing-layout"><div className="connection-addresses"><span className="field-caption">手机访问地址</span>{info.addresses.map((url,i)=><div className="address-card address-copy-row" key={url}><a href={`${url}/director`} target="_blank" rel="noreferrer">{url}/director</a><CopyButton text={`${url}/director`} ariaLabel={`复制手机访问地址 ${i+1}`}/></div>)}</div><div className="pairing-code-card"><span className="field-caption">六位配对码</span><strong className="pair-code">{info.code}</strong><div className="pair-code-actions"><span className="hint">有效至 {info.expires?new Date(info.expires).toLocaleTimeString('zh-CN'):''}</span>{info.code&&<CopyButton text={info.code} label="复制配对码" ariaLabel="复制配对码"/>}</div></div></div>
      {info.addresses.length>0?<div className="qr-pairing"><Suspense fallback={<div className="qr-loading" role="status">正在生成二维码…</div>}><ConnectionQR address={`${info.addresses.includes(address)?address:info.addresses[0]}/director`}/></Suspense><div className="form-block"><label className="form-field">选择手机可访问的地址<Select label="二维码访问地址" value={info.addresses.includes(address)?address:info.addresses[0]} options={info.addresses.map(url=>({value:url,label:url}))} onChange={setAddress}/></label><p className="hint reading-copy">二维码只包含访问地址，不含配对码。无法连接时，切换地址并确认手机与电脑使用同一 Wi-Fi。</p></div></div>:<p className="hint">尚未找到局域网地址，请先将电脑连接到 Wi-Fi 或有线网络。</p>}
      <div className="network-footer"><p className="hint reading-copy">配对后可控制 12 小时。请仅向赛事工作人员提供配对码；更新配对码后，旧设备需重新连接。</p><button onClick={async()=>{const r=await fetch('/api/pair/reset',{method:'POST'});if(r.ok){await refresh();notice('配对码已更新，原设备需重新配对。')}}}>更新配对码</button></div>
    </>:info?.paired?<p className="reading-copy">已配对 · {status==='connected'?'实时同步已连接':'正在重连主机'}</p>:<form className="pairing-form" onSubmit={async e=>{e.preventDefault();setBusy(true);setError('');try{const r=await fetch('/api/pair',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})});const data=await r.json();if(!r.ok)throw Error(data.error);reconnectSync();await refresh()}catch(e){setError(e instanceof Error?e.message:'配对失败')}finally{setBusy(false)}}}><label className="form-field">电脑端六位配对码<input aria-label="配对码" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code} onChange={e=>setCode(e.target.value)} required/></label><button className="primary" disabled={busy}>连接主机</button></form>}
    {error&&<p className="error" role="alert">{error}</p>}
  </section>
}
