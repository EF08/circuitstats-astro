// catalog.ts — the Leaders categories (CATS) and Compare stat list (CMP_STATS),
// ported verbatim from the pre-SEO app, plus the url slug for each leader board.
import type { Player } from './stats';

export interface Cat {
  lbl: string; field: string; rkField: string;
  filter: ((p: Player) => boolean) | null; extra: string[];
  lowerBetter?: boolean; slug: string;
}
// order + contents match the app's CATS exactly (10 boards, no TS%).
// filter uses a qualMin passed at call time (see makeCats) so it isn't tied to a global.
export function makeCats(qualMin: number): Cat[] {
  return [
    { lbl: 'Points', field: 'PPG', rkField: 'PPG', filter: null, extra: [], slug: 'ppg' },
    { lbl: 'Rebounds', field: 'RPG', rkField: 'RPG', filter: null, extra: [], slug: 'rpg' },
    { lbl: 'Assists', field: 'APG', rkField: 'APG', filter: null, extra: [], slug: 'apg' },
    { lbl: 'Steals', field: 'SPG', rkField: 'SPG', filter: null, extra: [], slug: 'spg' },
    { lbl: 'Blocks', field: 'BPG', rkField: 'BPG', filter: null, extra: [], slug: 'bpg' },
    { lbl: 'TO/G', field: 'TO/G', rkField: 'TO/G', filter: null, extra: [], lowerBetter: true, slug: 'to-g' },
    { lbl: 'FG%', field: 'FG%', rkField: 'FG%', filter: p => p.FGM >= qualMin, extra: ['FGM', 'FGA'], slug: 'fg-pct' },
    { lbl: '3FG%', field: '3FG%', rkField: '3FG%', filter: p => p['3PM'] >= qualMin, extra: ['3PM', '3PA'], slug: '3p-pct' },
    { lbl: '3PM/G', field: '3PM/G', rkField: '3PM/G', filter: null, extra: ['3PM'], slug: '3pm-per-game' },
    { lbl: 'FT%', field: 'FT%', rkField: 'FT%', filter: p => p.FTM >= qualMin, extra: ['FTM', 'FTA'], slug: 'ft-pct' },
  ];
}
export const CAT_SLUGS = ['ppg', 'rpg', 'apg', 'spg', 'bpg', 'to-g', 'fg-pct', '3p-pct', '3pm-per-game', 'ft-pct'];

export interface CmpStat { section?: string; lbl?: string; fa?: string; pct?: boolean; lowerBetter?: boolean; calc?: boolean; fn?: (p: Player) => number; }
export const CMP_STATS: CmpStat[] = [
  { section: 'Per Game' },
  { lbl: 'PPG', fa: 'PPG', pct: false, lowerBetter: false },
  { lbl: 'RPG', fa: 'RPG', pct: false, lowerBetter: false },
  { lbl: 'APG', fa: 'APG', pct: false, lowerBetter: false },
  { lbl: 'SPG', fa: 'SPG', pct: false, lowerBetter: false },
  { lbl: 'BPG', fa: 'BPG', pct: false, lowerBetter: false },
  { lbl: 'TO/G', fa: 'TO/G', pct: false, lowerBetter: true },
  { lbl: '3PM/G', fa: '3PM/G', pct: false, lowerBetter: false },
  { lbl: 'FGM/G', fn: p => p.GP ? p.FGM / p.GP : 0, pct: false, lowerBetter: false },
  { lbl: 'FGA/G', fn: p => p.GP ? p.FGA / p.GP : 0, pct: false, lowerBetter: false },
  { lbl: '3PA/G', fn: p => p.GP ? p['3PA'] / p.GP : 0, pct: false, lowerBetter: false },
  { lbl: 'FTM/G', fn: p => p.GP ? p.FTM / p.GP : 0, pct: false, lowerBetter: false },
  { lbl: 'FTA/G', fn: p => p.GP ? p.FTA / p.GP : 0, pct: false, lowerBetter: false },
  { section: 'Shooting' },
  { lbl: 'FG%', fa: 'FG%', pct: true, lowerBetter: false },
  { lbl: '3P%', fa: '3FG%', pct: true, lowerBetter: false },
  { lbl: 'FT%', fa: 'FT%', pct: true, lowerBetter: false },
  { lbl: 'TS%', pct: true, lowerBetter: false, calc: true },
  { section: 'Totals' },
  { lbl: 'PTS', fa: 'Tot PTS', pct: false, lowerBetter: false },
  { lbl: 'REB', fa: 'Tot REB', pct: false, lowerBetter: false },
  { lbl: 'AST', fa: 'Tot AST', pct: false, lowerBetter: false },
  { lbl: 'STL', fa: 'Tot STL', pct: false, lowerBetter: false },
  { lbl: 'BLK', fa: 'Tot BLK', pct: false, lowerBetter: false },
  { lbl: 'TOV', fn: p => +(p['TO/G'] * (p.GP || 0)).toFixed(1), pct: false, lowerBetter: true },
  { lbl: 'FGM', fa: 'FGM', pct: false, lowerBetter: false },
  { lbl: 'FGA', fa: 'FGA', pct: false, lowerBetter: false },
  { lbl: '3PM', fa: '3PM', pct: false, lowerBetter: false },
  { lbl: '3PA', fa: '3PA', pct: false, lowerBetter: false },
  { lbl: 'FTM', fa: 'FTM', pct: false, lowerBetter: false },
  { lbl: 'FTA', fa: 'FTA', pct: false, lowerBetter: false },
];
