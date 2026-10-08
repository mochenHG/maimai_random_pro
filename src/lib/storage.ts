export function load<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T | null) ?? fallback : fallback } catch { return fallback }
}
let receiving=false
export function applyRemote(key:string,data:unknown) {receiving=true;try{localStorage.setItem(key,JSON.stringify(data));window.dispatchEvent(new CustomEvent('pro-remote',{detail:key}))}finally{receiving=false}}
export function save(key: string, data: unknown) {
  if(receiving)return true
  try { localStorage.setItem(key, JSON.stringify(data)); window.dispatchEvent(new CustomEvent('pro-data-write', { detail:key })); return true }
  catch { window.dispatchEvent(new CustomEvent('storage-failure')); return false }
}
export function download(name: string, data: string, type = 'application/json') {
  const url = URL.createObjectURL(new Blob([data], { type }))
  const a = document.createElement('a'); a.href = url; a.download = name; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
