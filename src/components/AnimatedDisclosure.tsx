import { useEffect, useId, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
export default function AnimatedDisclosure({ title, className = '', children }: { title: string; className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const id = useId(), body = useRef<HTMLDivElement>(null)
  useEffect(() => { if (body.current) body.current.inert = !open }, [open])
  return <section className={`panel animated-disclosure ${className}${open ? ' is-open' : ''}`}>
    <button className="disclosure-trigger" type="button" aria-expanded={open} aria-controls={id} onClick={() => setOpen(!open)}><span>{title}</span><Plus size={21}/></button>
    <div className="disclosure-grid"><div id={id} ref={body} className="disclosure-body" aria-hidden={!open}>{children}</div></div>
  </section>
}
