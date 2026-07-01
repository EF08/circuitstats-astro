// og.ts — builds /api/og?... share-card URLs (rendered to PNG by api/og.js).
// Param shapes match api/og.js's build(): t=p player, t=tm team, t=c compare,
// t=l leaderboard, t=h hub.
import { calcTS, type Player } from './stats';
import type { League } from './leagues';

const SITE = 'https://www.circuitstats.com';
function ogUrl(params: Record<string, string | number | null | undefined>): string {
  const q = Object.entries(params)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}=${encodeURIComponent(String(v))}`).join('&');
  return `${SITE}/api/og?${q}`;
}
const fmt = (v: any) => v == null ? '—' : String(v);

export function playerOg(p: Player, league: League): string {
  const RANK = league.ranks.RANK;
  const scope = league.scopeLabel;
  const bits = [['PPG', 'PPG'], ['RPG', 'RPG'], ['APG', 'APG']]
    .filter(([f]) => p[f] != null).map(([f, l]) => `${p[f]} ${l}`).join(' · ');
  const shoot = [['FG%', 'FG'], ['3FG%', '3P'], ['FT%', 'FT']]
    .filter(([f]) => p[f] != null).map(([f, l]) => `${p[f]}% ${l}`).join(' · ');
  const hooks: [number, string][] = [];
  for (const [f, word] of [['PPG', 'scoring'], ['RPG', 'rebounding'], ['APG', 'assists'], ['3FG%', '3PT%'], ['SPG', 'steals']] as const) {
    const r = RANK[f] && RANK[f][p.Player]; if (r) hooks.push([r, `#${r} in ${scope} ${word}`]);
  }
  hooks.sort((a, b) => a[0] - b[0]);
  return ogUrl({ t: 'p', n: p.Player, tm: p.Team, s: `${scope} · ${fmt(p.GP)} GP`, l: bits, l2: shoot, r: hooks[0]?.[1] });
}

export function compareOg(a: Player, b: Player, league: League): string {
  const line = (p: Player) => ['PPG', 'RPG', 'APG'].map(f => fmt(p[f])).join(' / ');
  return ogUrl({ t: 'c', a: a.Player, b: b.Player, s: league.scopeLabel, aL: line(a), bL: line(b) });
}

export function teamOg(team: string, roster: Player[], league: League): string {
  const st = league.standings[team];
  const gp = roster.length ? Math.max(...roster.map(p => p.GP || 0)) : 0;
  const sum = (f: string) => roster.reduce((s, p) => s + (p[f] || 0), 0);
  const fga = sum('FGA');
  const sorted = [...roster].sort((x, y) => (y.PPG || 0) - (x.PPG || 0));
  const rrow = (p: Player) => [p.Player, fmt(p.GP), fmt(p.PPG), fmt(p.RPG), fmt(p.APG), fmt(p.SPG)].join('|');
  return ogUrl({
    t: 'tm', n: team, s: league.scopeLabel,
    sd: st ? `#${st.rank} Seed · ${st.w}W–${st.l}L` : '',
    np: roster.length, pp: gp ? (sum('Tot PTS') / gp).toFixed(1) : '', rp: gp ? (sum('Tot REB') / gp).toFixed(1) : '',
    ap: gp ? (sum('Tot AST') / gp).toFixed(1) : '', fp: fga ? (sum('FGM') / fga * 100).toFixed(1) : '',
    r1: sorted[0] && rrow(sorted[0]), r2: sorted[1] && rrow(sorted[1]), r3: sorted[2] && rrow(sorted[2]),
  });
}

export function leadersOg(h1: string, top3: Player[], field: string, isPct: boolean): string {
  const rows: Record<string, string> = {};
  top3.forEach((p, i) => {
    const v = field === '_ts' ? calcTS(p) : p[field];
    rows[`r${i + 1}`] = `${i + 1}. ${p.Player} — ${v}${isPct && v != null ? '%' : ''}`;
  });
  return ogUrl({ t: 'l', ti: h1, ...rows });
}

export function hubOg(title: string, sub: string): string {
  return ogUrl({ t: 'h', ti: title, s: '2026 season', s2: sub });
}
