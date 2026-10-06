import { useSyncExternalStore } from 'react'
const KEYS = ['maimai-pro-draw', 'maimai-pro-tournament']
let socket: WebSocket | null = null
let listening = false; let controller = false; let attempts = 0
let timer: ReturnType<typeof setTimeout> | undefined
let status: 'connecting' | 'connected' | 'offline' = 'connecting'
const listeners = new Set<() => void>()
function update(value: typeof status) {status = value; listeners.forEach(fn => fn())}
export function useSyncStatus() {return useSyncExternalStore(fn => {listeners.add(fn); return () => {listeners.delete(fn)}}, () => status)}
function send(key: string) {
  if(socket?.readyState !== WebSocket.OPEN) return
  try {socket.send(JSON.stringify({type:'state', key, data:JSON.parse(localStorage.getItem(key) || (key === 'maimai-pro-draw' ? '[]' : 'null'))}))} catch { /* Keep local operation available. */ }
}
function identify() {socket?.send(JSON.stringify({type:'hello', role:controller ? 'controller' : 'viewer'})); if(controller) KEYS.forEach(send)}
export function enableSync(isController: boolean) {
  const changed = controller !== isController; controller = isController
  if(!listening) {
    listening = true
    window.addEventListener('pro-data-write', event => {const key = (event as CustomEvent<string>).detail; if(controller && KEYS.includes(key)) send(key)})
    window.addEventListener('online', () => {attempts=0; enableSync(controller)})
  }
  if(socket && socket.readyState < WebSocket.CLOSING) {if(changed && socket.readyState === WebSocket.OPEN) identify(); return}
  clearTimeout(timer); update('connecting')
  socket = new WebSocket(`${location.protocol === 'https:' ? 'wss:' : 'ws:'}//${location.host}/pro-sync`)
  socket.onopen = () => {attempts=0; update('connected'); identify()}
  socket.onmessage = event => {
    try {
      const message = JSON.parse(event.data)
      if(message.type === 'publish' && controller) {KEYS.forEach(send); return}
      if(controller || message.type !== 'state' || !KEYS.includes(message.key)) return
      localStorage.setItem(message.key, JSON.stringify(message.data))
      window.dispatchEvent(new CustomEvent('pro-remote', {detail:message.key}))
    } catch { /* Ignore invalid snapshots. */ }
  }
  socket.onclose = () => {socket=null; update('offline'); if(attempts++ < 10) timer=setTimeout(() => enableSync(controller), Math.min(15000, 1000 * 2 ** Math.min(attempts-1,4)))}
  socket.onerror = () => {update('offline')}
}
