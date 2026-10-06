import type { Song } from '../types.ts'
export type RangeMode = 'level' | 'constant'
export const MAX_CONSTANT = 15.0
export const MAX_GRADE = 15
export function normalizeConstantRange(min:unknown,max:unknown) {
  const clamp=(value:unknown,fallback:number)=>typeof value==='number' && Number.isFinite(value) ? Math.max(1,Math.min(MAX_CONSTANT,Math.round(value*10)/10)) : fallback
  const constantMax=clamp(max,MAX_CONSTANT)
  return {constantMin:Math.min(clamp(min,1),constantMax),constantMax}
}
export function formatGrade(value:number) {const grade=Math.min(MAX_GRADE,value);return `${Math.floor(grade)}${grade%1>=.5?'+':''}`}
export function normalizeGradeRange(min:unknown,max:unknown) {
  const parse=(value:unknown,fallback:number)=>{
    if(typeof value!=='string'||!/^\d{1,2}\+?$/.test(value.trim()))return fallback
    return Math.max(1,Math.min(MAX_GRADE,Number.parseInt(value)+(value.includes('+')?.5:0)))
  }
  const upper=parse(max,MAX_GRADE)
  return {min:formatGrade(Math.min(parse(min,1),upper)),max:formatGrade(upper)}
}
export function inSongRange(song:Song,mode:RangeMode,min:number,max:number) {
  const value=mode==='constant'?song.levelValue:Math.min(MAX_GRADE,song.level+(song.isPlus?.5:0))
  return typeof value==='number' && Number.isFinite(value) && (mode!=='constant'||value<=MAX_CONSTANT) && value+1e-6>=min && value-1e-6<=max
}
