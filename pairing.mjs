import { randomBytes, randomInt, timingSafeEqual } from 'node:crypto'
import { networkInterfaces } from 'node:os'
const loopback=address=>['127.0.0.1','::1','::ffff:127.0.0.1','localhost','[::1]'].includes(address)
export function sameOrigin(req) {try {return !req.headers.origin || new URL(req.headers.origin).host===req.headers.host} catch {return false}}
export function localRequest(req) {try {return loopback(req.socket.remoteAddress)&&loopback(new URL(`http://${req.headers.host}`).hostname)&&sameOrigin(req)}catch{return false}}
export function createPairing(onRevoke=()=>{}) {
  let code=String(randomInt(100000,1000000)),expires=Date.now()+30*60*1000
  const tokens=new Map(), attempts=new Map()
  const token=req=>(req.headers.cookie??'').split(';').map(x=>x.trim()).find(x=>x.startsWith('maimai-control='))?.slice(15)
  const authorized=req=>sameOrigin(req)&&(localRequest(req)||(tokens.get(token(req))??0)>Date.now())
  const json=(res,status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data))}
  const handle=async(req,res)=>{
    const pathname=new URL(req.url,'http://local').pathname
    if(!['/api/network','/api/pair','/api/pair/reset'].includes(pathname))return false
    if(!sameOrigin(req)){json(res,403,{error:'请求来源不正确'});return true}
    if(pathname==='/api/network'&&req.method==='GET') {
      const local=localRequest(req),port=req.socket.localPort
      const addresses=Object.values(networkInterfaces()).flat().filter(n=>n&&n.family==='IPv4'&&!n.internal).map(n=>`http://${n.address}:${port}`)
      json(res,200,{local,paired:authorized(req),addresses:local?addresses:[],code:local?code:undefined,expires:local?expires:undefined});return true
    }
    if(pathname==='/api/pair/reset'&&req.method==='POST'&&localRequest(req)){tokens.clear();onRevoke();code=String(randomInt(100000,1000000));expires=Date.now()+30*60*1000;json(res,200,{ok:true});return true}
    if(pathname!=='/api/pair'||req.method!=='POST'){json(res,403,{error:'请在主机管理配对'});return true}
    const ip=req.socket.remoteAddress,now=Date.now(),rate=attempts.get(ip)
    if(rate&&rate.until>now&&rate.count>=5){json(res,429,{error:'尝试次数过多，请五分钟后重试'});return true}
    let raw='';for await(const chunk of req){raw+=chunk;if(raw.length>1024){json(res,413,{error:'请求过大'});return true}}
    let input;try{input=String(JSON.parse(raw).code??'')}catch{input=''}
    if(!/^\d{6}$/.test(input)||Date.now()>expires||!timingSafeEqual(Buffer.from(input),Buffer.from(code))){attempts.set(ip,{count:rate&&rate.until>now?rate.count+1:1,until:rate&&rate.until>now?rate.until:now+300000});json(res,401,{error:'配对码无效或已过期，请查看电脑端'});return true}
    const credential=randomBytes(32).toString('hex');tokens.set(credential,now+12*3600000);attempts.delete(ip)
    res.setHeader('Set-Cookie',`maimai-control=${credential}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`)
    json(res,200,{ok:true});return true
  }
  return {handle,authorized}
}
