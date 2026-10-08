import { qrcodegen } from '../vendor/qrcodegen'
export function connectionQR(address:string){
  const url=new URL(address)
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash||url.pathname!=='/director'||address.length>512)throw Error('连接地址无效。')
  const qr=qrcodegen.QrCode.encodeText(url.href,qrcodegen.QrCode.Ecc.MEDIUM),border=4,size=qr.size+border*2
  let path=''
  for(let y=0;y<qr.size;y++)for(let x=0;x<qr.size;x++)if(qr.getModule(x,y))path+=`M${x+border},${y+border}h1v1h-1z`
  return {size,path,modules:Array.from({length:qr.size},(_,y)=>Array.from({length:qr.size},(_,x)=>qr.getModule(x,y)))}
}
