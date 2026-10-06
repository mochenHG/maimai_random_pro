import type { Song } from '../types.ts'
export function coverSources(song:Pick<Song,'cover'|'songId'>):string[] {
  const sources=song.cover?[song.cover]:[]
  if(Number.isSafeInteger(song.songId) && song.songId>0){
    sources.push(`https://assets2.lxns.net/maimai/jacket/${song.songId}.png`)
    // Older libraries and unavailable utage jackets can share the parent jacket.
    const parent=song.songId%10000
    if(song.songId>=10000 && parent>0)sources.push(`https://assets2.lxns.net/maimai/jacket/${parent}.png`)
  }
  return [...new Set(sources)]
}
