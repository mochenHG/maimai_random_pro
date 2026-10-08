import { useEffect, useMemo, useRef, useState } from 'react'
import { FileSpreadsheet, Upload, X } from 'lucide-react'
import type { SheetData } from '../types'
import { detectColumns, parseRoster } from '../lib/roster'
import { useTournamentStore } from '../store/tournamentStore'
import { download } from '../lib/storage'
import { useNotice } from './Notice'
import Select from './Select'
export default function RosterImport({ stageId, disabled }: { stageId: string; disabled: boolean }) {
  const [sheets, setSheets] = useState<SheetData[]>([]); const [sheetIndex, setSheetIndex] = useState(0)
  const [headerRow, setHeaderRow] = useState(0); const [nameCol, setNameCol] = useState(-1); const [ratingCol, setRatingCol] = useState(-1)
  const [busy, setBusy] = useState(false); const [fileName, setFileName] = useState(''); const [error, setError] = useState(''); const [skipIssues, setSkipIssues] = useState(false)
  const [mode, setMode] = useState<'merge' | 'append'>('merge'); const input = useRef<HTMLInputElement>(null); const worker = useRef<Worker | null>(null); const timer = useRef<ReturnType<typeof setTimeout> | null>(null); const notice = useNotice()
  const cleanup = () => { worker.current?.terminate(); worker.current = null; if(timer.current) clearTimeout(timer.current); timer.current = null }
  useEffect(() => () => { worker.current?.terminate(); if(timer.current) clearTimeout(timer.current) }, [])
  useEffect(() => { setSheets([]); setError(''); setBusy(false); worker.current?.terminate(); if(timer.current) clearTimeout(timer.current) }, [stageId])
  const selectSheet = (data: SheetData[], index: number) => { const detected = detectColumns(data[index]?.rows || []); setSheetIndex(index); setHeaderRow(detected.headerRow); setNameCol(detected.name); setRatingCol(detected.rating); setSkipIssues(false) }
  const upload = (file: File) => {
    cleanup(); setError(''); setSheets([]); setFileName(file.name); setSkipIssues(false)
    if (!/\.(xlsx|xls|csv|tsv)$/i.test(file.name)) { setError('请选择 .xlsx、.xls、.csv 或 .tsv 文件。'); return }
    if (file.size > 10 * 1024 * 1024) { setError('表格不能超过 10 MB。'); return }
    setBusy(true)
    try {
      const reader = new Worker(new URL('../workers/roster.worker.ts', import.meta.url), { type: 'module' }); worker.current = reader
      reader.onmessage = (event: MessageEvent<{ sheets?: SheetData[]; error?: string }>) => {
        cleanup(); setBusy(false)
        if(event.data.error) { setError(event.data.error); return }
        const data = event.data.sheets || []; if(!data.length) { setError('表格中没有工作表。'); return }
        setSheets(data); const found = data.findIndex(s => detectColumns(s.rows).name >= 0); selectSheet(data, Math.max(0, found))
      }
      reader.onerror = () => { cleanup(); setBusy(false); setError('表格读取失败，请检查文件是否损坏或受密码保护。') }
      timer.current = setTimeout(() => { cleanup(); setBusy(false); setError('读取超过 30 秒，请精简表格后重试。') }, 30000)
      reader.postMessage({ file })
    } catch { cleanup(); setBusy(false); setError('浏览器无法启动表格解析，请使用最新版 Chrome 或 Edge。') }
  }
  const rows = sheets[sheetIndex]?.rows
  const parsed = useMemo(() => parseRoster(rows || [], headerRow, nameCol, ratingCol), [rows, headerRow, nameCol, ratingCol])
  const columns = Math.max(0, ...(rows || []).slice(0, 30).map(r => r.length))
  const mapped = nameCol >= 0 && ratingCol >= 0 && nameCol !== ratingCol
  const apply = () => { try { notice(useTournamentStore.getState().importPlayers(stageId, parsed.entries, mode)); setSheets([]); setFileName('') } catch(e) {setError(e instanceof Error ? e.message : '导入失败。')} }
  return <section className="panel roster-import"><div className="section-title"><div><h2><FileSpreadsheet size={18}/>表格导入选手</h2></div><div className="row wrap"><button className="text-button" onClick={() => download('选手导入模板.csv', '\uFEFF昵称,rating\r\n选手A,15000\r\n选手B,14500\r\n', 'text/csv;charset=utf-8')}>下载模板</button><button className="primary" disabled={disabled || busy} onClick={() => input.current?.click()}><Upload size={16}/>{busy ? '正在识别…' : '上传表格'}</button></div></div>
    <input className="sr-only" ref={input} type="file" accept=".xlsx,.xls,.csv,.tsv" disabled={disabled || busy} onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if(f) upload(f) }}/>
    {error && <p role="alert" className="error">{error}</p>}
    {!!sheets.length && <div className="import-preview"><div className="section-title"><strong>{fileName}</strong><button className="icon-button" aria-label="关闭导入预览" onClick={() => setSheets([])}><X size={17}/></button></div><div className="mapping-grid"><label>工作表<Select label="工作表" value={sheetIndex} onChange={v=>selectSheet(sheets,Number(v))} options={sheets.map((s,i)=>({value:i,label:s.name}))}/></label><label>表头所在行<input type="number" min="1" max={rows?.length || 1} value={headerRow + 1} onChange={e => {setHeaderRow(Math.max(0, Math.min((rows?.length || 1) - 1, Number(e.target.value) - 1))); setSkipIssues(false)}}/></label>{[['昵称列', nameCol, setNameCol], ['rating 列', ratingCol, setRatingCol]].map(([label, value, setter]) => <label key={String(label)}>{String(label)}<Select label={String(label)} value={Number(value)} onChange={v=>{(setter as (v:number)=>void)(Number(v));setSkipIssues(false)}} options={[{value:-1,label:'请选择列'},...Array.from({length:columns},(_,i)=>({value:i,label:`第 ${i+1} 列 · ${String(rows?.[headerRow]?.[i] ?? '未命名')}`}))]}/></label>)}</div>
      {!mapped ? <p className="error">请选择两个不同的列作为昵称和 rating；未识别表头时可手动指定。</p> : <><div className="preview-summary"><b>{parsed.entries.length} 条有效记录</b><span>{parsed.issues.length} 条异常 · {parsed.emptyRatings} 条 rating 留空</span></div><div className="table-scroll"><table><thead><tr><th>昵称</th><th>rating</th></tr></thead><tbody>{parsed.entries.slice(0,8).map(p => <tr key={p.name}><td>{p.name}</td><td className="mono">{p.rating ?? '—'}</td></tr>)}</tbody></table></div>
      {!!parsed.issues.length && <div className="issues"><details className="inline-disclosure"><summary>查看异常行（{parsed.issues.length}）</summary>{parsed.issues.slice(0,50).map(issue => <p key={issue.row}>第 {issue.row} 行：{issue.message}</p>)}{parsed.issues.length > 50 && <p>仅展示前 50 条；请在原表格中修正后重新上传。</p>}</details><label className="checkbox"><input type="checkbox" checked={skipIssues} onChange={e => setSkipIssues(e.target.checked)}/>跳过上述异常行，仅导入有效记录</label></div>}
      <div className="import-footer"><label>同名选手处理<Select label="同名选手处理" value={mode} onChange={v=>setMode(v as typeof mode)} options={[{value:'merge',label:'更新已有 rating，并新增其他选手'},{value:'append',label:'只新增选手，跳过同名记录'}]}/></label><button className="primary" disabled={disabled || !parsed.entries.length || (!!parsed.issues.length && !skipIssues)} onClick={apply}>确认导入 {parsed.entries.length} 人</button></div></>}
    </div>}
  </section>
}
