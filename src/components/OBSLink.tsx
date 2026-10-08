import { useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpRight, Copy, X } from 'lucide-react'
import { useSyncStatus } from '../lib/sync'
import { placePopover } from '../lib/popover'
import { copyText } from '../lib/clipboard'
export default function OBSLink({ tournament = false, raffle = false }: { tournament?: boolean; raffle?: boolean }) {
  const sync = useSyncStatus()
  const [message, setMessage] = useState(''), [open, setOpen] = useState(false)
  const [position, setPosition] = useState({ left: 16, top: 16 })
  const trigger = useRef<HTMLButtonElement>(null), panel = useRef<HTMLDivElement>(null)
  const id = useId()
  const route = raffle ? '/obs-raffle' : tournament ? '/obs-tournament' : '/obs'
  const url = `${location.origin}${route}?clean=1`
  const close = () => { setOpen(false); trigger.current?.focus({ preventScroll: true }) }
  useLayoutEffect(() => {
    if (!open) return
    let frame = 0
    const update = () => {
      frame = 0
      if (!trigger.current || !panel.current) return
      setPosition(placePopover(trigger.current.getBoundingClientRect(), {width:panel.current.offsetWidth,height:panel.current.offsetHeight}, { width: innerWidth, height: innerHeight }))
    }
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update) }
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !panel.current?.contains(event.target) && !trigger.current?.contains(event.target)) setOpen(false)
    }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { setOpen(false); trigger.current?.focus({ preventScroll: true }) } }
    update()
    panel.current?.querySelector('input')?.focus({ preventScroll: true })
    const resize = new ResizeObserver(schedule)
    if (panel.current) resize.observe(panel.current)
    window.addEventListener('resize', schedule); window.addEventListener('scroll', schedule, true)
    document.addEventListener('pointerdown', outside); document.addEventListener('keydown', escape)
    return () => {
      cancelAnimationFrame(frame); resize.disconnect()
      window.removeEventListener('resize', schedule); window.removeEventListener('scroll', schedule, true)
      document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape)
    }
  }, [open])
  const copy = async () => {setMessage(await copyText(url)?'已复制 OBS 地址':'请选中下方地址复制')}
  // Escape the heading's perspective/filter stacking context with a body portal.
  return <div className="obs-access"><button ref={trigger} className="button secondary" aria-expanded={open} aria-haspopup="dialog" aria-controls={open ? id : undefined} onClick={() => setOpen(!open)}>{raffle ? '抽奖 OBS' : 'OBS 展示'} <ArrowUpRight size={15}/></button>{open && createPortal(<div ref={panel} id={id} className="obs-popover obs-floating panel" role="dialog" aria-label={raffle ? '抽奖 OBS 展示' : tournament ? '赛事 OBS 展示' : '抽谱 OBS 展示'} style={position}>
    <div className="obs-popover-heading"><strong>{sync === 'connected' ? '同步服务已连接' : sync === 'offline' ? '同步服务未连接，请检查启动窗口' : '正在连接同步服务…'}</strong><button className="icon-button" onClick={close} aria-label="关闭 OBS 展示"><X size={16}/></button></div>
    <input aria-label="OBS 浏览器来源地址" readOnly value={url} onFocus={e => e.currentTarget.select()}/>
    <div className="row"><button onClick={copy}><Copy size={14}/>复制地址</button><a className="button" href={route} target="_blank" rel="noreferrer">预览 <ArrowUpRight size={14}/></a></div>{message && <p className="hint" role="status">{message}</p>}
  </div>, document.body)}</div>
}
