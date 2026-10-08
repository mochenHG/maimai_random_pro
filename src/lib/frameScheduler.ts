type Clock = {now:()=>number; request:(callback:(time:number)=>void)=>number; cancel:(id:number)=>void}
type Job = {start:number;duration:number;update:(progress:number)=>void;complete:()=>void}
/** All icon transitions share one pending frame. No frame is scheduled at rest. */
export function createFrameScheduler(clock:Clock) {
  const jobs=new Map<symbol,Job>()
  let frame:number|null=null
  const tick=(time:number)=>{
    frame=null
    for(const [id,job] of [...jobs]){
      if(!jobs.has(id))continue
      const progress=Math.max(0,Math.min(1,(time-job.start)/job.duration))
      job.update(progress)
      if(progress===1 && jobs.delete(id))job.complete()
    }
    if(jobs.size && frame===null)frame=clock.request(tick)
  }
  return {
    start(update:Job['update'],complete:Job['complete'],duration=360){
      if(duration<=0){update(1);complete();return()=>{}}
      const id=Symbol();jobs.set(id,{start:clock.now(),duration,update,complete})
      if(frame===null)frame=clock.request(tick)
      return()=>{jobs.delete(id);if(!jobs.size&&frame!==null){clock.cancel(frame);frame=null}}
    }
  }
}
export const iconFrames=createFrameScheduler({now:()=>performance.now(),request:callback=>requestAnimationFrame(callback),cancel:id=>cancelAnimationFrame(id)})
