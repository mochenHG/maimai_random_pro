import { useEffect, useRef } from 'react'
export default function ClickSpark() {
  const canvas=useRef<HTMLCanvasElement>(null)
  useEffect(()=>{
    const element=canvas.current; if(!element)return
    const context=element.getContext('2d'); if(!context)return
    let frame=0, width=0, height=0; let sparks:{x:number;y:number;start:number;color:string}[]=[]
    const resize=()=>{const bounds=element.getBoundingClientRect();const dpr=Math.min(devicePixelRatio||1,1.25);width=bounds.width;height=bounds.height;element.width=Math.round(width*dpr);element.height=Math.round(height*dpr);context.setTransform(dpr,0,0,dpr,0,0)}
    const render=(time:number)=>{context.clearRect(0,0,width,height);sparks=sparks.filter(s=>time-s.start<460); for(const spark of sparks){const progress=(time-spark.start)/460;context.strokeStyle=spark.color;context.lineWidth=2*(1-progress); for(let i=0;i<8;i++){const a=Math.PI*2*i/8; const radius=3+progress*26;const length=8*(1-progress);context.beginPath();context.moveTo(spark.x+Math.cos(a)*radius,spark.y+Math.sin(a)*radius);context.lineTo(spark.x+Math.cos(a)*(radius+length),spark.y+Math.sin(a)*(radius+length));context.stroke()}}if(sparks.length)frame=requestAnimationFrame(render);else frame=0}
    const burst=(x:number,y:number)=>{if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;const bounds=element.getBoundingClientRect();if(sparks.length>=12)sparks.shift();sparks.push({x:x-bounds.left,y:y-bounds.top,start:performance.now(),color:document.documentElement.dataset.theme==='dark'?'#ffffff':'#151515'});if(!frame)frame=requestAnimationFrame(render)}
    const pointer=(event:PointerEvent)=>{if(event.isPrimary && event.button===0)burst(event.clientX,event.clientY)}
    const keyboard=(event:MouseEvent)=>{if(event.detail!==0 || !(event.target instanceof Element))return;const target=event.target.closest('button,a,summary');if(!target)return;const rect=target.getBoundingClientRect();burst(rect.left+rect.width/2,rect.top+rect.height/2)}
    resize();const observer=new ResizeObserver(resize);observer.observe(element);window.addEventListener('resize',resize);document.addEventListener('pointerdown',pointer,{passive:true,capture:true});document.addEventListener('click',keyboard,{passive:true,capture:true})
    return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',resize);document.removeEventListener('pointerdown',pointer,true);document.removeEventListener('click',keyboard,true)}
  },[])
  return <canvas className="click-spark" ref={canvas} aria-hidden="true"/>
}
