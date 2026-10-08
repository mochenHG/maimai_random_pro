interface Props {label:string;value:string;field:'score'|'dxScore';disabled?:boolean;onChange:(value:string)=>void}
/** Enter moves down the same score column; Tab keeps the browser's horizontal order. */
export default function ScoreInput({label,value,field,disabled,onChange}:Props){
  return <div className="score-input-shell"><input className="mono" type="text" inputMode={field==='score'?'decimal':'numeric'} aria-label={label} data-score-column={field} value={value} disabled={disabled} maxLength={24} placeholder="未填写" onChange={e=>onChange(e.target.value)} onKeyDown={e=>{
    if(e.key!=='Enter'||e.nativeEvent.isComposing)return;e.preventDefault()
    const form=e.currentTarget.closest('form'),inputs=Array.from(form?.querySelectorAll<HTMLInputElement>(`input[data-score-column="${field}"]:not(:disabled)`)??[]),index=inputs.indexOf(e.currentTarget)
    const next=e.shiftKey?inputs[index-1]:inputs[index+1]
    if(next){next.focus();next.select()}else form?.querySelector<HTMLButtonElement>('[data-save-scores]')?.focus()
  }}/>{field==='score'&&<span aria-hidden="true">%</span>}</div>
}
