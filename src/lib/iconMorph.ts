export type MorphName = 'copy'|'check'|'plus'|'minus'|'down'|'up'|'sun'|'moon'
export type Point = readonly [number,number]
type Stroke = {d:string;points:readonly Point[]}
export type SampledStroke = {points:Point[];opacity:number}
const line=(points:readonly Point[]):Stroke=>({points,d:points.map(([x,y],i)=>`${i?'L':'M'}${x} ${y}`).join(' ')})
const circle=Array.from({length:49},(_,i)=>[12+4*Math.cos(i*Math.PI/24),12+4*Math.sin(i*Math.PI/24)] as Point)
// Small, application-owned stroke profiles. The settled SVG keeps crisp native
// arcs/lines; only the short transition uses equal-distance samples (32 per stroke).
const shapes:Record<MorphName,Stroke[]>={
  copy:[line([[9,9],[20,9],[20,20],[9,20],[9,9]]),line([[6,15],[4,15],[4,4],[15,4],[15,6]])],
  check:[line([[4,12],[9,17],[20,6]])],
  plus:[line([[5,12],[19,12]]),line([[12,5],[12,19]])],
  minus:[line([[5,12],[19,12]])],
  down:[line([[6,9],[12,15],[18,9]])],
  up:[line([[6,15],[12,9],[18,15]])],
  sun:[{d:'M16 12 A4 4 0 1 1 8 12 A4 4 0 1 1 16 12',points:circle},...Array.from({length:8},(_,i)=>{const a=i*Math.PI/4;return line([[12+7*Math.cos(a),12+7*Math.sin(a)],[12+10*Math.cos(a),12+10*Math.sin(a)]])})],
  moon:[{d:'M20.5 15 A9 9 0 1 1 9 3.5 A7.5 7.5 0 0 0 20.5 15 Z',points:[[20.5,15],[19.4,18],[16.6,20],[12.5,21],[8.5,20],[5.2,17.4],[3.3,13.9],[3.2,10],[4.8,6.5],[7,4.5],[9,3.5],[8.8,6.6],[9.4,9.6],[11.1,12.3],[13.9,14.4],[17,15.2],[20.5,15]]}]
}
export const ICON_STROKES=9, ICON_SAMPLES=32
export function resampleStroke(points:readonly Point[],count=ICON_SAMPLES):Point[]{
  if(!points.length || count<2)throw new RangeError('A stroke needs points and at least two samples')
  const distances=[0]
  for(let i=1;i<points.length;i++)distances.push(distances[i-1]+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]))
  const total=distances.at(-1)!
  if(!total)return Array.from({length:count},()=>[...points[0]] as Point)
  let segment=1
  return Array.from({length:count},(_,i)=>{
    const distance=total*i/(count-1)
    while(segment<points.length-1 && distances[segment]<distance)segment++
    const fraction=(distance-distances[segment-1])/(distances[segment]-distances[segment-1]||1)
    return [points[segment-1][0]+(points[segment][0]-points[segment-1][0])*fraction,points[segment-1][1]+(points[segment][1]-points[segment-1][1])*fraction] as Point
  })
}
export function sampleIcon(name:MorphName):SampledStroke[]{
  return Array.from({length:ICON_STROKES},(_,i)=>({points:resampleStroke(shapes[name][i]?.points??[[12,12]]),opacity:shapes[name][i]?1:0}))
}
export function canonicalIcon(name:MorphName){return Array.from({length:ICON_STROKES},(_,i)=>({d:shapes[name][i]?.d??'M12 12',opacity:shapes[name][i]?1:0}))}
export function interpolateIcon(from:SampledStroke[],to:SampledStroke[],progress:number):SampledStroke[]{
  const p=Math.max(0,Math.min(1,progress))
  if(p===0)return from
  if(p===1)return to
  return from.map((stroke,i)=>({opacity:stroke.opacity+(to[i].opacity-stroke.opacity)*p,points:stroke.points.map(([x,y],j)=>[x+(to[i].points[j][0]-x)*p,y+(to[i].points[j][1]-y)*p] as Point)}))
}
export function strokePath(points:readonly Point[]){return points.map(([x,y],i)=>`${i?'L':'M'}${x.toFixed(3)} ${y.toFixed(3)}`).join(' ')}
