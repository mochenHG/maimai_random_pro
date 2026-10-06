import { useRef, useState } from 'react'
import { ArrowDownToLine, CloudDownload, Database, FileUp, Trash2 } from 'lucide-react'
import { useSongStore } from '../store/songStore'
import { normalizeSongs } from '../lib/songs'
import { download } from '../lib/storage'
import { fetchMusic } from '../api/music'
import { useNotice } from '../components/Notice'
import MotionCards from '../components/MotionCards'
import { AnimatedTitle } from '../components/HeroMotion'
export default function Library() {
  const pools = useSongStore(s => s.pools); const input = useRef<HTMLInputElement>(null); const [busy, setBusy] = useState(false); const notice = useNotice()
  const [feedback, setFeedback] = useState(''); const [failed, setFailed] = useState(false)
  const report = (text: string, error = false) => {setFeedback(text); setFailed(error); notice(text)}
  const add = (name: string, songs: ReturnType<typeof normalizeSongs>, message: string, replaceId?: string) => {
    if (!useSongStore.getState().addPool(name, songs, replaceId)) throw new Error('曲库未保存：浏览器存储空间不足或不可用，请先导出并清理旧曲库。')
    report(`${message} 共 ${songs.length.toLocaleString()} 张谱面。`)
  }
  const importFile = async (file: File) => {
    setBusy(true)
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error('JSON 文件不能超过 20 MB。')
      const songs = normalizeSongs(JSON.parse((await file.text()).replace(/^\uFEFF/, '')))
      add(file.name.replace(/\.json$/i, ''), songs, '导入成功。')
    } catch (e) { report(e instanceof Error ? e.message : '曲库导入失败。', true) } finally { setBusy(false) }
  }
  const online = async () => {setBusy(true); setFeedback('正在连接曲库服务，请稍候…'); setFailed(false); try {const result = await fetchMusic(); add('lxns 在线曲库', result.songs, result.message, pools.find(p => p.name === 'lxns 在线曲库')?.id)} catch(e) {report(e instanceof Error ? e.message : '在线曲库获取失败。', true)} finally {setBusy(false)} }
  return <><div className="page-heading"><div><AnimatedTitle text="your library"/></div><div className="library-heading-aside"><MotionCards/><span className="tag">{pools.length} 个曲库</span></div></div>
    {feedback && <p className={`import-status ${failed ? 'failed' : ''}`} role={failed ? 'alert' : 'status'}>{feedback}</p>}
    <section className="import-actions panel"><div><Database size={26}/><h2>加入谱面数据</h2></div><div className="row wrap"><button className="primary" disabled={busy} onClick={() => input.current?.click()}><FileUp size={17}/>{busy ? '正在处理…' : '导入 JSON'}</button><button disabled={busy} onClick={online}><CloudDownload size={17}/>获取在线曲库</button></div><input ref={input} className="sr-only" type="file" accept=".json,application/json" onChange={e => {const file = e.target.files?.[0]; e.target.value = ''; if(file) void importFile(file)}}/></section>
    <div className="pool-list">{pools.map(p => <article className="pool-item panel" key={p.id}><div className="pool-icon"><Database size={22}/></div><div className="pool-info"><h3>{p.name}</h3><p className="muted">{p.songs.length.toLocaleString()} 张谱面</p></div><button title="导出曲库" aria-label={`导出 ${p.name}`} onClick={() => download(`${p.name}.json`, JSON.stringify(p.songs, null, 2))}><ArrowDownToLine size={16}/>导出</button><button className="icon-button danger" aria-label={`删除 ${p.name}`} onClick={() => {if(window.confirm(`删除曲库「${p.name}」？建议先导出备份。`)) useSongStore.getState().removePool(p.id)}}><Trash2 size={16}/></button></article>)}</div>{!pools.length && <div className="empty"><p>还没有曲库。导入后即可开始随机选曲。</p></div>}
  </>
}
