import { WebSocketServer, WebSocket } from 'ws'
export function attachSync(server) {
  const wss = new WebSocketServer({ server, path: '/pro-sync', maxPayload: 3 * 1024 * 1024 })
  const snapshot = new Map()
  wss.on('error', () => {})
  wss.on('connection', socket => {
    socket.on('error', () => {})
    socket.on('message', raw => {
      try {
        const message = JSON.parse(raw.toString())
        if(message.type === 'hello' && ['controller','viewer'].includes(message.role)) {
          socket.role = message.role
          if(socket.role === 'viewer') {
            for(const data of snapshot.values()) socket.send(data)
            for(const client of wss.clients) if(client.role === 'controller' && client.readyState === WebSocket.OPEN) client.send(JSON.stringify({type:'publish'}))
          }
          return
        }
        if(socket.role !== 'controller') return
        if(message.type !== 'state' || !['maimai-pro-draw', 'maimai-pro-tournament'].includes(message.key)) return
        const data = JSON.stringify(message); snapshot.set(message.key, data)
        for (const client of wss.clients) if(client.role === 'viewer' && client.readyState === WebSocket.OPEN) client.send(data)
      } catch { /* Invalid messages do not interrupt other viewers. */ }
    })
  })
  return wss
}
