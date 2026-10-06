export const DIFFICULTIES = ['BASIC', 'ADVANCED', 'EXPERT', 'MASTER', 'Re:MASTER', 'UTAGE'] as const
export type Difficulty = typeof DIFFICULTIES[number]
export interface Song { id: string; songId: number; name: string; difficulty: Difficulty; level: number; isPlus: boolean; cover: string; author: string; difficultyAuthor: string; bpm: number; chartType: 'dx' | 'standard'; genre: string; levelValue: number | null; version: number }
export interface Pool { id: string; name: string; songs: Song[] }
export interface Player { id: string; name: string; rating: number | null; score: number | null; dxScore: number | null; rank: number | null; advanced: boolean }
export interface MatchGroup { id: string; name: string; playerIds: string[] }
export interface Stage { id: string; name: string; advanceCount: number; players: Player[]; locked: boolean; songs: Song[]; playerCount?:number; rankingMethod?:'global'|'group'; groupCount?:number; advancePerGroup?:number; songCount?:number; loserStageId?:string; winnerStageId?:string; groups?:MatchGroup[] }
export interface TournamentTemplate { id:string; name:string; stages:Stage[] }
export interface RosterEntry { name: string; rating: number | null }
export type Cell = string | number | boolean | null
export interface SheetData { name: string; rows: Cell[][] }
