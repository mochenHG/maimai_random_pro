export interface ExitView<T> { value:T; key:string; generation:number; leaving:boolean; enter:boolean }
type SwapClock = { schedule:(finish:()=>void,delay:number)=>()=>void }
/** Keep one outgoing snapshot and only the latest incoming request. Rapid draws
    never grow a queue or prolong the exit; hidden/reduced views settle directly. */
export function createExitSwap<T>(value:T,key:string,emit:(view:ExitView<T>)=>void,clock:SwapClock) {
  let view:ExitView<T>={value,key,generation:0,leaving:false,enter:true},pending={value,key},cancel:()=>void=()=>{},disposed=false
  const finish=(enter=true)=>{
    cancel();cancel=()=>{}
    if(disposed)return
    if(!view.leaving){if(!enter&&view.enter){view={...view,enter:false};emit(view)}return}
    view={...pending,generation:view.generation+1,leaving:false,enter};emit(view)
  }
  return {
    get view(){return view},
    update(next:T,nextKey:string,animate:boolean,duration=480){
      if(disposed||nextKey===pending.key)return
      pending={value:next,key:nextKey}
      if(!animate){cancel();cancel=()=>{};view={...pending,generation:view.generation+1,leaving:false,enter:false};emit(view);return}
      if(view.leaving)return
      view={...view,leaving:true};emit(view)
      cancel=clock.schedule(finish,duration)
    },
    finish,
    dispose(){disposed=true;cancel();cancel=()=>{}},
  }
}
