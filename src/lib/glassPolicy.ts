export const GLASS_LIMITS=Object.freeze({surfaces:6,area:1_600_000,mapWidth:384,mapHeight:256,maxHeight:1800})
export interface GlassSurface<T>{target:T;width:number;height:number;radius:number;priority:number}

/** Quantize settled geometry, so subpixel layout jitter does not regenerate the lens. */
export function glassGeometry(width:number,height:number,radius:number){
  const w=Math.max(1,Math.round(width/8)*8),h=Math.max(1,Math.round(height/8)*8)
  const r=Math.max(0,Math.min(Math.round(radius/2)*2,w/2,h/2))
  return {width:w,height:h,radius:r,key:`${w}:${h}:${r}`}
}

/** Account with real CSS dimensions; a rounded cache key must never bypass the area limit. */
export function chooseGlassSurfaces<T>(surfaces:GlassSurface<T>[]){
  let area=0
  const selected:GlassSurface<T>[]=[]
  for(const surface of [...surfaces].sort((a,b)=>b.priority-a.priority)){
    const {width,height}=surface
    if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1||height>GLASS_LIMITS.maxHeight)continue
    if(selected.length===GLASS_LIMITS.surfaces||area+width*height>GLASS_LIMITS.area)continue
    area+=width*height;selected.push(surface)
  }
  return selected
}
