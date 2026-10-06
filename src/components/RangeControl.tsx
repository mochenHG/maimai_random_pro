import { useRef, useState, type CSSProperties } from 'react'
import { formatGrade, MAX_CONSTANT, MAX_GRADE, type RangeMode } from '../lib/range'
import { editRangeEndpoint, parseRangeInput } from '../lib/rangeInput'
function RangeValueInput({ mode, value, edge, onChange, onEditStart }: { mode: RangeMode; value: number; edge: 'min' | 'max'; onChange: (value: number) => void; onEditStart: () => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const formatted = mode === 'constant' ? value.toFixed(1) : formatGrade(value)
  const invalid = draft !== null && draft !== '' && parseRangeInput(draft, mode) === null
  return <input className="range-value-input" type="text" inputMode={mode === 'constant' ? 'decimal' : 'text'}
    aria-label={`${edge === 'min' ? '最低' : '最高'}${mode === 'constant' ? '定数' : '等级'}输入`} aria-invalid={invalid || undefined}
    autoComplete="off" spellCheck={false} maxLength={8} value={draft ?? formatted}
    onFocus={() => { onEditStart(); setDraft(formatted) }}
    onChange={e => { const text = e.target.value; setDraft(text); const parsed = parseRangeInput(text, mode); if (parsed !== null) onChange(parsed) }}
    onBlur={() => { setDraft(null) }}
    onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') e.currentTarget.blur() }}/>
}
export default function RangeControl({mode,min,max,onChange,onMode}: {mode:RangeMode;min:number;max:number;onChange:(min:number,max:number)=>void;onMode:(mode:RangeMode)=>void}) {
  const editBounds=useRef({min,max})
  const startEdit=()=>{editBounds.current={min,max}}
  const step=mode==='constant'?.1:.5; const limit=mode==='constant'?MAX_CONSTANT:MAX_GRADE
  const round=(n:number)=>Math.round(n/step)*step
  const style={'--from':`${(min-1)/(limit-1)*100}%`,'--to':`${(max-1)/(limit-1)*100}%`} as CSSProperties
  const jump=(event:React.PointerEvent<HTMLDivElement>)=>{
    if(event.target instanceof HTMLInputElement)return
    const r=event.currentTarget.getBoundingClientRect(); const n=Math.max(1,Math.min(limit,round(1+(event.clientX-r.left)/r.width*(limit-1))))
    if(Math.abs(n-min)<=Math.abs(n-max))onChange(Math.min(n,max),max);else onChange(min,Math.max(n,min))
  }
  return <fieldset className="range-control"><legend>{mode==='constant'?'定数范围':'等级范围'}</legend><div className="segmented range-mode"><button type="button" aria-pressed={mode==='level'} className={mode==='level'?'selected':''} onClick={()=>onMode('level')}>整数模式</button><button type="button" aria-pressed={mode==='constant'} className={mode==='constant'?'selected':''} onClick={()=>onMode('constant')}>小数模式</button></div><div className="range-values"><RangeValueInput key={`${mode}-min`} mode={mode} value={min} edge="min" onEditStart={startEdit} onChange={n=>onChange(...editRangeEndpoint(editBounds.current.min,editBounds.current.max,n,'min',mode))}/><span>—</span><RangeValueInput key={`${mode}-max`} mode={mode} value={max} edge="max" onEditStart={startEdit} onChange={n=>onChange(...editRangeEndpoint(editBounds.current.min,editBounds.current.max,n,'max',mode))}/></div><div className="dual-range" style={style} onPointerDown={jump}><div className="range-rail"/><input type="range" aria-label={mode==='constant'?'最低定数':'最低等级'} min={1} max={limit} step={step} value={min} style={{zIndex:min===max?3:1}} onChange={e=>onChange(Math.min(Number(e.target.value),max),max)}/><input type="range" aria-label={mode==='constant'?'最高定数':'最高等级'} min={1} max={limit} step={step} value={max} onChange={e=>onChange(min,Math.max(Number(e.target.value),min))}/></div></fieldset>
}
