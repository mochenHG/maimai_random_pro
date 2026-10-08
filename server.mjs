import http from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { localRequest, createPairing } from './pairing.mjs'
import { attachSync } from './sync.mjs'
import { handleMusic } from './music.mjs'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'dist')
const mime = { '.js':'text/javascript', '.css':'text/css', '.html':'text/html; charset=utf-8', '.svg':'image/svg+xml', '.json':'application/json', '.png':'image/png' }
export function createLocalServer(options={}) {
const pairing=createPairing(()=>{for(const client of sync.clients)if(client.role==='controller'&&!pairing.authorized(client.request)){client.send(JSON.stringify({type:'denied'}));client.role=undefined}})
const server = http.createServer(async (req, res) => {
  try {
    if(await pairing.handle(req,res)) return
    if(new URL(req.url,'http://localhost').pathname === '/api/health') {res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify({app:'maimai-random-pro',version:'3.6.0'}));return}
    if (await handleMusic(req, res)) return
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    const requested = path.resolve(root, '.' + pathname)
    if(requested !== root && !requested.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return }
    const file = path.extname(requested) ? requested : path.join(root,'index.html')
    const data = await readFile(file)
    const headers={ 'Content-Type':mime[path.extname(file)] || 'application/octet-stream', 'Cache-Control':file.includes(`${path.sep}assets${path.sep}`) ? 'public, max-age=31536000, immutable' : 'no-cache', 'X-Content-Type-Options':'nosniff' }
    if(path.extname(file)==='.html') headers['Content-Security-Policy']="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self' ws: wss:; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; frame-ancestors 'none'"
    res.writeHead(200, headers); res.end(data)
  } catch {res.writeHead(404); res.end('File not found. Run the build first.')}
})
const sync=attachSync(server,{authorize:pairing.authorized,actor:req=>localRequest(req)?'本机':'远程控制端',requireRevision:true,stateFile:options.stateFile??path.resolve(path.dirname(fileURLToPath(import.meta.url)),'.state/session.json')})
return {server,sync}
}
if(process.argv[1] && path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const {server}=createLocalServer({stateFile:process.env.MAIMAI_STATE_FILE || undefined})
  const portArg=process.argv.find(arg=>arg.startsWith('--port='))
  const port=Number(portArg?.slice(7) || process.env.MAIMAI_PORT)||5174
  server.listen(port,process.argv.includes('--lan')?'0.0.0.0':'127.0.0.1',()=>console.log(`maimai Random Pro v3.6: http://127.0.0.1:${port}\nKeep this window open. Press Ctrl+C to stop.`))
  server.on('error',e=>{console.error(e.code==='EADDRINUSE'?`Port ${port} is in use. Close the earlier server before starting this one.`:e.message);process.exitCode=1})
}
