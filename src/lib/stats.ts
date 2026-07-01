// stats.ts — shared stat logic, ported VERBATIM from the pre-SEO index.html
// (commit 4fdf63a2). This is the single source of truth for rankings/merging/
// sorting used by every page at build time AND by any client-side island — so
// there is exactly one implementation, never a Python copy that can drift.
//
// Players are kept as loose records because the source data uses bracket keys
// like 'Tot PTS', '3PM/G', 'FG%'; typing them loosely preserves the original's
// exact dynamic-access semantics (incl. null/undefined handling).

export type Player = Record<string, any>;

export const PCT_MIN_MAKES: Record<string, string> = {
  'FG%': 'FGM',
  '3FG%': '3PM',
  'FT%': 'FTM',
  '_ts': 'FGM',
};

export const SORT_TB: Record<string, string> = {
  'PPG': 'Tot PTS', 'RPG': 'Tot REB', 'APG': 'Tot AST', 'SPG': 'Tot STL', 'BPG': 'Tot BLK',
  '3PM/G': '3PM', 'GP': 'PPG',
  'Tot PTS': 'PPG', 'Tot REB': 'RPG', 'Tot AST': 'APG', 'Tot STL': 'SPG', 'Tot BLK': 'BPG',
  'FGM': 'FGA', 'FGA': 'FGM', '3PM': '3PM/G', '3PA': '3PM',
  'FTM': 'FTA', 'FTA': 'FTM',
  'FG%': 'FGM', '3FG%': '3PM', 'FT%': 'FTM', '_ts': 'Tot PTS',
};

export interface TblCol { h: string; f: string; pct: boolean; calc?: boolean; totals?: boolean; }
export const TBL_COLS: TblCol[] = [
  { h: 'GP', f: 'GP', pct: false },
  { h: 'PPG', f: 'PPG', pct: false },
  { h: 'RPG', f: 'RPG', pct: false },
  { h: 'APG', f: 'APG', pct: false },
  { h: 'SPG', f: 'SPG', pct: false },
  { h: 'BPG', f: 'BPG', pct: false },
  { h: 'TO/G', f: 'TO/G', pct: false },
  { h: 'FG%', f: 'FG%', pct: true },
  { h: '3P%', f: '3FG%', pct: true },
  { h: 'FT%', f: 'FT%', pct: true },
  { h: 'TS%', f: '_ts', pct: true, calc: true },
  { h: '3PM/G', f: '3PM/G', pct: false },
  { h: 'T-PTS', f: 'Tot PTS', pct: false, totals: true },
  { h: 'T-REB', f: 'Tot REB', pct: false, totals: true },
  { h: 'T-AST', f: 'Tot AST', pct: false, totals: true },
  { h: 'T-STL', f: 'Tot STL', pct: false, totals: true },
  { h: 'T-BLK', f: 'Tot BLK', pct: false, totals: true },
  { h: 'FGM', f: 'FGM', pct: false, totals: true },
  { h: 'FGA', f: 'FGA', pct: false, totals: true },
  { h: '3PM', f: '3PM', pct: false, totals: true },
  { h: '3PA', f: '3PA', pct: false, totals: true },
  { h: 'FTM', f: 'FTM', pct: false, totals: true },
  { h: 'FTA', f: 'FTA', pct: false, totals: true },
];
export const PG_COUNT = 12, TOT_COUNT = 11;

export const RANK_LABELS: Record<string, string> = {
  PPG: 'PPG', RPG: 'RPG', APG: 'APG', SPG: 'SPG', BPG: 'BPG', 'TO/G': 'TO/G', '3PM/G': '3PM/G',
  'FG%': 'FG%', '3FG%': '3P%', 'FT%': 'FT%', _ts: 'TS%', GP: 'GP', TOV: 'Turnovers',
  'Tot PTS': 'Total Points', 'Tot REB': 'Total Rebounds', 'Tot AST': 'Total Assists',
  'Tot STL': 'Total Steals', 'Tot BLK': 'Total Blocks',
  FGM: 'FGM', FGA: 'FGA', '3PM': '3PM', '3PA': '3PA', FTM: 'FTM', FTA: 'FTA',
  'FGM/G': 'FGM/G', 'FGA/G': 'FGA/G', '3PA/G': '3PA/G', 'FTM/G': 'FTM/G', 'FTA/G': 'FTA/G',
};

// ── merge duplicate player names in combined views (verbatim port) ──
export function mergeDups(players: Player[]): Player[] {
  const seen = new Map<string, Player>();
  for (const p of players) {
    if (!seen.has(p.Player)) { seen.set(p.Player, { ...p }); continue; }
    const m = seen.get(p.Player)!;
    const gp1 = m.GP || 0, gp2 = p.GP || 0, gp = gp1 + gp2;
    if (!gp) continue;
    const safeAdd = (a: any, b: any) => (a == null && b == null) ? null : (a || 0) + (b || 0);
    const mergePair = (mk1: any, att1: any, mk2: any, att2: any) => {
      const makes = safeAdd(mk1, mk2);
      let att, pctMk;
      if (att1 != null && att2 != null) { att = att1 + att2; pctMk = (mk1 || 0) + (mk2 || 0); }
      else if (att1 != null) { att = att1; pctMk = mk1 || 0; }
      else if (att2 != null) { att = att2; pctMk = mk2 || 0; }
      else { att = null; pctMk = null; }
      return { makes, att, pctMk };
    };
    const totTov = (m['TO/G'] || 0) * gp1 + (p['TO/G'] || 0) * gp2;
    m['Tot PTS'] = safeAdd(m['Tot PTS'], p['Tot PTS']);
    m['Tot REB'] = safeAdd(m['Tot REB'], p['Tot REB']);
    m['Tot AST'] = safeAdd(m['Tot AST'], p['Tot AST']);
    m['Tot STL'] = safeAdd(m['Tot STL'], p['Tot STL']);
    m['Tot BLK'] = safeAdd(m['Tot BLK'], p['Tot BLK']);
    const fg3 = mergePair(m['3PM'], m['3PA'], p['3PM'], p['3PA']);
    const fg = mergePair(m['FGM'], m['FGA'], p['FGM'], p['FGA']);
    const ft = mergePair(m['FTM'], m['FTA'], p['FTM'], p['FTA']);
    m['3PM'] = fg3.makes; m['3PA'] = fg3.att;
    m['FGM'] = fg.makes; m['FGA'] = fg.att;
    m['FTM'] = ft.makes; m['FTA'] = ft.att;
    m.GP = gp;
    const r1 = (v: number) => Math.round(v * 10) / 10;
    m.PPG = m['Tot PTS'] != null ? r1(m['Tot PTS'] / gp) : null;
    m.RPG = m['Tot REB'] != null ? r1(m['Tot REB'] / gp) : null;
    m.APG = m['Tot AST'] != null ? r1(m['Tot AST'] / gp) : null;
    m.SPG = m['Tot STL'] != null ? r1(m['Tot STL'] / gp) : null;
    m.BPG = m['Tot BLK'] != null ? r1(m['Tot BLK'] / gp) : null;
    m['3PM/G'] = m['3PM'] != null ? r1(m['3PM'] / gp) : null;
    m['TO/G'] = r1(totTov / gp);
    m['FG%'] = fg.att ? Math.round(fg.pctMk / fg.att * 1000) / 10 : null;
    m['3FG%'] = fg3.att ? Math.round(fg3.pctMk / fg3.att * 1000) / 10 : null;
    m['FT%'] = ft.att ? Math.round(ft.pctMk / ft.att * 1000) / 10 : null;
    if (gp2 > gp1) m.Team = p.Team;
    if (m._src !== p._src) m._src = null;
    if (m._age !== p._age) m._age = null;
    if (m._tag !== p._tag) m._tag = m._src || 'Multi';
  }
  return [...seen.values()];
}

export interface Ranks { RANK: Record<string, Record<string, number>>; RANK_N: Record<string, number>; }

// ── computeRanks (verbatim port) ──
export function computeRanks(players: Player[], qualMin = 15): Ranks {
  const RANK: Record<string, Record<string, number>> = {}, RANK_N: Record<string, number> = {};
  const n = players.length;
  const assign = (key: string, sorted: Player[], cnt: number) => {
    RANK[key] = {}; RANK_N[key] = cnt;
    sorted.forEach((p, i) => { if (!RANK[key][p.Player]) RANK[key][p.Player] = i + 1; });
  };
  const az = (a: Player, b: Player) => a.Player.localeCompare(b.Player);
  const d2 = (arr: Player[], f: string, tb: string) => [...arr].sort((a, b) => {
    const aN = a[f] == null, bN = b[f] == null; if (aN !== bN) return aN ? 1 : -1; if (aN && bN) return 0;
    const d = (b[f] || 0) - (a[f] || 0); return d || ((b[tb] || 0) - (a[tb] || 0)) || az(a, b);
  });
  const a2 = (arr: Player[], f: string, tb: string) => [...arr].sort((a, b) => {
    const aN = a[f] == null, bN = b[f] == null; if (aN !== bN) return aN ? 1 : -1; if (aN && bN) return 0;
    const d = (a[f] || 99) - (b[f] || 99); return d || ((a[tb] || 99) - (b[tb] || 99)) || az(a, b);
  });

  assign('PPG', d2(players, 'PPG', 'Tot PTS'), n);
  assign('RPG', d2(players, 'RPG', 'Tot REB'), n);
  assign('APG', d2(players, 'APG', 'Tot AST'), n);
  assign('SPG', d2(players, 'SPG', 'Tot STL'), n);
  assign('BPG', d2(players, 'BPG', 'Tot BLK'), n);
  assign('3PM/G', d2(players, '3PM/G', '3PM'), n);
  assign('GP', d2(players, 'GP', 'PPG'), n);

  assign('Tot PTS', d2(players, 'Tot PTS', 'PPG'), n);
  assign('Tot REB', d2(players, 'Tot REB', 'RPG'), n);
  assign('Tot AST', d2(players, 'Tot AST', 'APG'), n);
  assign('Tot STL', d2(players, 'Tot STL', 'SPG'), n);
  assign('Tot BLK', d2(players, 'Tot BLK', 'BPG'), n);
  assign('FGM', d2(players, 'FGM', 'FGA'), n);
  assign('FGA', d2(players, 'FGA', 'FGM'), n);
  assign('3PM', d2(players, '3PM', '3PM/G'), n);
  assign('3PA', d2(players, '3PA', '3PM'), n);
  assign('FTM', d2(players, 'FTM', 'FTA'), n);
  assign('FTA', d2(players, 'FTA', 'FTM'), n);

  for (const { f, mk } of [{ f: 'FG%', mk: 'FGM' }, { f: '3FG%', mk: '3PM' }, { f: 'FT%', mk: 'FTM' }]) {
    const qs = [...players].filter(p => p[mk] >= qualMin);
    assign(f, d2(qs, f, mk), qs.length);
  }

  assign('TO/G', a2(players, 'TO/G', 'TO/G'), n);

  const tsQ = players.filter(p => p.FGM >= qualMin);
  const tsS = [...tsQ].map(p => ({ ...p, _tsv: (p.FGA + 0.44 * p.FTA) > 0 ? p['Tot PTS'] / (2 * (p.FGA + 0.44 * p.FTA)) : 0 }))
    .sort((a, b) => { const d = b._tsv - a._tsv; return d || (b['Tot PTS'] - a['Tot PTS']) || az(a, b); });
  RANK['_ts'] = {}; RANK_N['_ts'] = tsQ.length;
  tsS.forEach((p, i) => { if (!RANK['_ts'][p.Player]) RANK['_ts'][p.Player] = i + 1; });

  const tovS = [...players].sort((a, b) => {
    const d = (a['TO/G'] * (a.GP || 0)) - (b['TO/G'] * (b.GP || 0)); return d || ((a['TO/G'] || 99) - (b['TO/G'] || 99)) || az(a, b);
  });
  assign('TOV', tovS, n);

  for (const { f, fn, tb } of [
    { f: 'FGM/G', fn: (p: Player) => p.GP ? p.FGM / p.GP : 0, tb: 'FGM' },
    { f: 'FGA/G', fn: (p: Player) => p.GP ? p.FGA / p.GP : 0, tb: 'FGA' },
    { f: '3PA/G', fn: (p: Player) => p.GP ? p['3PA'] / p.GP : 0, tb: '3PA' },
    { f: 'FTM/G', fn: (p: Player) => p.GP ? p.FTM / p.GP : 0, tb: 'FTM' },
    { f: 'FTA/G', fn: (p: Player) => p.GP ? p.FTA / p.GP : 0, tb: 'FTA' },
  ]) {
    const s = [...players].sort((a, b) => { const d = fn(b) - fn(a); return d || ((b[tb] || 0) - (a[tb] || 0)) || az(a, b); });
    assign(f, s, n);
  }
  return { RANK, RANK_N };
}

// ── display helpers (verbatim ports) ──
export function abbr(name: string): string {
  const parts = name.trim().split(' ');
  if (parts.length < 2) return name;
  return parts[0][0] + '. ' + parts.slice(1).join(' ');
}
export function initials(name: string): string {
  return name.split(' ').map(w => w[0] || '').join('').slice(0, 2).toUpperCase();
}
export function calcTS(p: Player): string {
  if (p.FGA == null || p.FTA == null || p['Tot PTS'] == null) return '—';
  const d = 2 * (p.FGA + 0.44 * p.FTA);
  return d > 0 ? (p['Tot PTS'] / d * 100).toFixed(1) + '%' : 'N/A';
}
export function calcTSNum(p: Player): number {
  if (p.FGA == null || p.FTA == null || p['Tot PTS'] == null) return 0;
  const d = 2 * (p.FGA + 0.44 * p.FTA);
  return d > 0 ? p['Tot PTS'] / d * 100 : 0;
}
export function teamAvg(ps: Player[], field: string): string | number {
  if (!ps.length) return '—';
  const gp = Math.max(...ps.map(p => p.GP));
  if (field === 'GP') return gp;
  if (field === 'PPG') return (ps.reduce((s, p) => s + p['Tot PTS'], 0) / gp).toFixed(1);
  if (field === 'RPG') return (ps.reduce((s, p) => s + p['Tot REB'], 0) / gp).toFixed(1);
  if (field === 'APG') return (ps.reduce((s, p) => s + p['Tot AST'], 0) / gp).toFixed(1);
  if (field === 'SPG') return (ps.reduce((s, p) => s + p['Tot STL'], 0) / gp).toFixed(1);
  if (field === 'BPG') return (ps.reduce((s, p) => s + p['Tot BLK'], 0) / gp).toFixed(1);
  if (field === 'TO/G') return (ps.reduce((s, p) => s + (p['TO/G'] * p.GP), 0) / gp).toFixed(1);
  if (field === 'FG%') { const a = ps.reduce((s, p) => s + p.FGA, 0); return a > 0 ? (ps.reduce((s, p) => s + p.FGM, 0) / a * 100).toFixed(1) : '—'; }
  if (field === '3FG%') { const a = ps.reduce((s, p) => s + p['3PA'], 0); return a > 0 ? (ps.reduce((s, p) => s + p['3PM'], 0) / a * 100).toFixed(1) : '—'; }
  if (field === 'FT%') { const a = ps.reduce((s, p) => s + p.FTA, 0); return a > 0 ? (ps.reduce((s, p) => s + p.FTM, 0) / a * 100).toFixed(1) : '—'; }
  if (field === '_ts') {
    const pts = ps.reduce((s, p) => s + p['Tot PTS'], 0);
    const d = 2 * (ps.reduce((s, p) => s + p.FGA, 0) + 0.44 * ps.reduce((s, p) => s + p.FTA, 0));
    return d > 0 ? (pts / d * 100).toFixed(1) : '—';
  }
  if (field === '3PM/G') return (ps.reduce((s, p) => s + p['3PM'], 0) / Math.max(...ps.map(p => p.GP))).toFixed(1);
  const TOTALS = ['Tot PTS', 'Tot REB', 'Tot AST', 'Tot STL', 'Tot BLK', 'FGM', 'FGA', '3PM', '3PA', 'FTM', 'FTA'];
  if (TOTALS.includes(field)) return ps.reduce((s, p) => s + (p[field] || 0), 0);
  return '—';
}

// getColVal / fmtColVal — VERBATIM from the stats table (NOTE: these differ from
// calcTS/calcTSNum used on detail pages — the table's TS branch has no null guard,
// so a 3SSB player with null shooting shows 'N/A' here but '—' on their profile.
// Preserving that exact behavior.)
export function getTSNum(p: Player): number {
  const d = 2 * (p.FGA + 0.44 * p.FTA);
  return d > 0 ? p['Tot PTS'] / d * 100 : 0;
}
export function getColVal(p: Player, col: TblCol): number {
  return col.calc ? getTSNum(p) : (p[col.f] || 0);
}
export function fmtColVal(p: Player, col: TblCol): string {
  if (col.calc) {
    const d = 2 * (p.FGA + 0.44 * p.FTA);
    return d > 0 ? (p['Tot PTS'] / d * 100).toFixed(1) + '%' : 'N/A';
  }
  const v = p[col.f];
  if (v == null) return '—';
  return v + (col.pct ? '%' : '');
}

// sortCmp (verbatim port; qualMin passed in since there's no global `league`)
export function sortCmp(a: Player, b: Player, field: string, av: number, bv: number, dir: 'asc' | 'desc', qualMin: number): number {
  const mk = PCT_MIN_MAKES[field];
  if (mk) {
    const aQ = (a[mk] || 0) >= qualMin, bQ = (b[mk] || 0) >= qualMin;
    if (aQ !== bQ) return bQ ? 1 : -1;
    if (!aQ) return a.Player.localeCompare(b.Player);
  } else {
    const aN = a[field] == null, bN = b[field] == null;
    if (aN !== bN) return aN ? 1 : -1;
    if (aN && bN) return 0;
  }
  const d = dir === 'desc' ? bv - av : av - bv;
  if (d !== 0) return d;
  const tb = SORT_TB[field];
  if (tb) { const td = (b[tb] || 0) - (a[tb] || 0); if (td !== 0) return td; }
  return a.Player.localeCompare(b.Player);
}
