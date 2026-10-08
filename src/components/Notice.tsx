import { createContext, useContext, useEffect, useState } from 'react'
const Context = createContext<(message: string) => void>(() => {})
export const useNotice = () => useContext(Context)
export function NoticeProvider({ children }: { children: React.ReactNode }) {
  const [message, setMessage] = useState('')
  useEffect(()=>{const handler=(e:Event)=>setMessage((e as CustomEvent<string>).detail);window.addEventListener('pro-sync-notice',handler);return()=>window.removeEventListener('pro-sync-notice',handler)},[])
  useEffect(() => { if (!message) return; const timer = setTimeout(() => setMessage(''), 6000); return () => clearTimeout(timer) }, [message])
  useEffect(() => { const handler = () => setMessage('本地存储空间不足或不可用，请先导出备份。'); window.addEventListener('storage-failure', handler); return () => window.removeEventListener('storage-failure', handler) }, [])
  return <Context.Provider value={setMessage}>{children}{message && <div className="notice" role="status"><span>{message}</span><button aria-label="关闭提示" onClick={() => setMessage('')}>×</button></div>}</Context.Provider>
}
