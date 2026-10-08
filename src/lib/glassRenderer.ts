import { glassDisplacement } from './glass'
import { chooseGlassSurfaces, glassGeometry, GLASS_LIMITS } from './glassPolicy'

const ns='http://www.w3.org/2000/svg'
const selector='.topbar,.app-frame .panel,.app-frame .empty,.stage-progress-nav,.stage-dialog,.select-popover,.obs-popover,.launcher-window,[data-obs-glass]'
interface Lens{key:string;node:SVGFilterElement;image:SVGFEImageElement;map:SVGFEDisplacementMapElement;owner:HTMLElement|null}

/** One controller owns all observers and six stable filter slots. It never renders an idle frame. */
export function mountGlassRenderer(container:SVGDefsElement,prefix:string){
  const targets=new Set<HTMLElement>(),visible=new Set<HTMLElement>(),lenses:Lens[]=[]
  const fallback=matchMedia('(max-width:760px), (pointer:coarse), (prefers-reduced-transparency:reduce)')
  const lowPower=navigator.hardwareConcurrency>0&&navigator.hardwareConcurrency<=4
  let frame=0,resizeTimer:ReturnType<typeof setTimeout>|undefined
  const clear=(element:HTMLElement)=>{element.removeAttribute('data-glass-optics');element.style.removeProperty('--refraction')}
  const release=(element:HTMLElement)=>{clear(element);for(const lens of lenses)if(lens.owner===element)lens.owner=null}

  function lensSlot():Lens|null{
    // An unused slot keeps its ID and cached map. Rebinding does not delete a live SVG filter.
    const unused=lenses.find(lens=>!lens.owner)
    if(unused)return unused
    if(lenses.length===GLASS_LIMITS.surfaces)return null
    const node=document.createElementNS(ns,'filter'),image=document.createElementNS(ns,'feImage'),map=document.createElementNS(ns,'feDisplacementMap')
    node.id=`${prefix}-${lenses.length}`
    for(const [name,value] of Object.entries({x:'0',y:'0',width:'100%',height:'100%','color-interpolation-filters':'sRGB'}))node.setAttribute(name,value)
    for(const [name,value] of Object.entries({result:'normal',x:'0',y:'0',width:'100%',height:'100%',preserveAspectRatio:'none'}))image.setAttribute(name,value)
    for(const [name,value] of Object.entries({in:'SourceGraphic',in2:'normal',scale:'26',xChannelSelector:'R',yChannelSelector:'G'}))map.setAttribute(name,value)
    node.append(image,map);container.append(node)
    const lens={key:'',node,image,map,owner:null};lenses.push(lens);return lens
  }

  function paint(){
    frame=0
    // Keep assignments while the window is hidden, avoiding a teardown flash on return.
    if(document.hidden)return
    if(fallback.matches||lowPower){targets.forEach(release);return}
    const selected=chooseGlassSurfaces([...visible].filter(el=>el.isConnected).map(target=>({target,width:target.clientWidth,height:target.clientHeight,radius:parseFloat(getComputedStyle(target).borderTopLeftRadius)||24,priority:target.matches('.stage-dialog,.select-popover,.obs-popover')?2:target.matches('.topbar')?1:0})))
    const owners=new Set(selected.map(s=>s.target))
    for(const lens of lenses)if(lens.owner&&!owners.has(lens.owner))release(lens.owner)
    for(const surface of selected){
      const el=surface.target,geometry=glassGeometry(surface.width,surface.height,surface.radius)
      const lens=lenses.find(lens=>lens.owner===el)??lenses.find(lens=>!lens.owner&&lens.key===geometry.key)??lensSlot()
      if(!lens){clear(el);continue}
      if(lens.key!==geometry.key){
        const pixels=glassDisplacement(geometry.width,geometry.height,geometry.radius),canvas=document.createElement('canvas')
        canvas.width=pixels.width;canvas.height=pixels.height
        const context=canvas.getContext('2d');if(!context){release(el);continue}
        context.putImageData(new ImageData(pixels.pixels,pixels.width,pixels.height),0,0)
        // Update the existing slot only after the replacement map is complete.
        lens.image.setAttribute('href',canvas.toDataURL());lens.key=geometry.key
      }
      lens.owner=el;lens.map.setAttribute('scale',el.matches('.topbar')?'24':'20')
      const filter=`url(#${lens.node.id})`;if(el.style.getPropertyValue('--refraction')!==filter)el.style.setProperty('--refraction',filter)
      el.setAttribute('data-glass-optics','')
    }
  }
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(paint)}
  const resize=new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(schedule,140)})
  const intersection=new IntersectionObserver(entries=>{for(const entry of entries){const el=entry.target as HTMLElement;if(entry.isIntersecting)visible.add(el);else{visible.delete(el);release(el)}}schedule()},{rootMargin:'120px'})
  const discover=()=>{
    for(const el of targets)if(!el.isConnected){resize.unobserve(el);intersection.unobserve(el);targets.delete(el);visible.delete(el);release(el)}
    document.querySelectorAll<HTMLElement>(selector).forEach(el=>{if(targets.has(el))return;targets.add(el);resize.observe(el);intersection.observe(el)})
    schedule()
  }
  const mutations=new MutationObserver(records=>{if(records.some(r=>[...r.addedNodes,...r.removedNodes].some(n=>n instanceof Element&&n.namespaceURI!==ns)))discover()})
  mutations.observe(document.body,{childList:true,subtree:true})
  fallback.addEventListener('change',schedule);document.addEventListener('visibilitychange',schedule);discover()
  return()=>{cancelAnimationFrame(frame);clearTimeout(resizeTimer);resize.disconnect();intersection.disconnect();mutations.disconnect();fallback.removeEventListener('change',schedule);document.removeEventListener('visibilitychange',schedule);targets.forEach(clear);container.replaceChildren()}
}
