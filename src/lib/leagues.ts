// leagues.ts — assembles every dataset + precomputed ranks, exactly mirroring
// the pre-SEO index.html (lines 855-1121), and maps each league to its real URL
// base. This replaces both the app's in-memory league state AND seo_render.py's
// dataset loading — one place, used at build time.
import { mergeDups, computeRanks, type Player, type Ranks } from './stats';

import uaaU15 from '../data/uaa-u15.json';
import uaaU16 from '../data/uaa-u16.json';
import uaaU17 from '../data/uaa-u17.json';
import eyblU15 from '../data/eybl-u15.json';
import eyblU16 from '../data/eybl-u16.json';
import eyblU17 from '../data/eybl-u17.json';
import ssbU15 from '../data/3ssb-u15.json';
import ssbU16 from '../data/3ssb-u16.json';
import ssbU17 from '../data/3ssb-u17.json';
import s2u15 from '../data/uaa-u15-s2.json';
import s3u15 from '../data/uaa-u15-s3.json';
import standingsData from '../data/standings.json';

const D15 = (uaaU15 as any).players as Player[];
const D16 = (uaaU16 as any).players as Player[];
const D17 = (uaaU17 as any).players as Player[];
const D_EYBL15 = (eyblU15 as any).players as Player[];
const D_EYBL16 = (eyblU16 as any).players as Player[];
const D_EYBL17 = (eyblU17 as any).players as Player[];
const D_3SSB15 = (ssbU15 as any).players as Player[];
const D_3SSB16 = (ssbU16 as any).players as Player[];
const D_3SSB17 = (ssbU17 as any).players as Player[];
const D_S2U15 = (s2u15 as any).players as Player[];
const D_S3U15 = (s3u15 as any).players as Player[];

const standings = standingsData as Record<string, Record<string, { rank: number; w: number; l: number }>>;

// Per-circuit all-ages: simple concat with _age tag (NOT merged) — matches DALL etc.
const DALL = [...D15.map(p => ({ ...p, _age: 'U15' })), ...D16.map(p => ({ ...p, _age: 'U16' })), ...D17.map(p => ({ ...p, _age: 'U17' }))];
const D_EYBLALL = [...D_EYBL15.map(p => ({ ...p, _age: 'U15' })), ...D_EYBL16.map(p => ({ ...p, _age: 'U16' })), ...D_EYBL17.map(p => ({ ...p, _age: 'U17' }))];
const D_3SSBALL = [...D_3SSB15.map(p => ({ ...p, _age: 'U15' })), ...D_3SSB16.map(p => ({ ...p, _age: 'U16' })), ...D_3SSB17.map(p => ({ ...p, _age: 'U17' }))];

// Per-age all-circuits: MERGED by name with _src tag — matches D_U15ALL etc.
const D_U15ALL = mergeDups([...D15.map(p => ({ ...p, _src: 'UAA' })), ...D_EYBL15.map(p => ({ ...p, _src: 'EYBL' })), ...D_3SSB15.map(p => ({ ...p, _src: '3SSB' }))]);
const D_U16ALL = mergeDups([...D16.map(p => ({ ...p, _src: 'UAA' })), ...D_EYBL16.map(p => ({ ...p, _src: 'EYBL' })), ...D_3SSB16.map(p => ({ ...p, _src: '3SSB' }))]);
const D_U17ALL = mergeDups([...D17.map(p => ({ ...p, _src: 'UAA' })), ...D_EYBL17.map(p => ({ ...p, _src: 'EYBL' })), ...D_3SSB17.map(p => ({ ...p, _src: '3SSB' }))]);
const D_ALLALL = mergeDups([
  ...D15.map(p => ({ ...p, _tag: 'UAA U15', _age: 'U15', _src: 'UAA' })),
  ...D16.map(p => ({ ...p, _tag: 'UAA U16', _age: 'U16', _src: 'UAA' })),
  ...D17.map(p => ({ ...p, _tag: 'UAA U17', _age: 'U17', _src: 'UAA' })),
  ...D_EYBL15.map(p => ({ ...p, _tag: 'EYBL 15', _age: 'U15', _src: 'EYBL' })),
  ...D_EYBL16.map(p => ({ ...p, _tag: 'EYBL 16', _age: 'U16', _src: 'EYBL' })),
  ...D_EYBL17.map(p => ({ ...p, _tag: 'EYBL 17', _age: 'U17', _src: 'EYBL' })),
  ...D_3SSB15.map(p => ({ ...p, _tag: '3SSB 15', _age: 'U15', _src: '3SSB' })),
  ...D_3SSB16.map(p => ({ ...p, _tag: '3SSB 16', _age: 'U16', _src: '3SSB' })),
  ...D_3SSB17.map(p => ({ ...p, _tag: '3SSB 17', _age: 'U17', _src: '3SSB' })),
]);

export interface League {
  key: string;          // internal key from the original app (u15, eybl16, allall, s2u15…)
  label: string;        // header pill label, e.g. 'UAA U15', 'ALL'
  scopeLabel: string;   // page-title scope, e.g. 'UAA U15', 'All Circuits'
  subLabel: string;     // header sub line, e.g. 'UAA U15 · 2026 Season'
  urlBase: string;      // real URL base, e.g. '/uaa/u15', '/rankings', '/eybl'
  players: Player[];
  ranks: Ranks;
  standings: Record<string, { rank: number; w: number; l: number }>;
  circuit: string | null;  // 'uaa' | 'eybl' | '3ssb' | null (combined)
  age: string | null;      // 'u15' | 'u16' | 'u17' | null (combined)
  qualMin: number;
  isBase: boolean;      // true = single circuit+age (used for player/team detail)
  combineKind: null | 'circuit' | 'age' | 'all'; // which tagBadge branch applies
}

function mk(o: Omit<League, 'ranks'> & { qualMin?: number }): League {
  const qualMin = o.qualMin ?? 15;
  return { ...o, qualMin, ranks: computeRanks(o.players, qualMin) };
}

export const SEASON = '2026';
const sub = (label: string) => `${label} · ${SEASON} Season`;

export const LEAGUES: League[] = [
  mk({ key: 'u15', label: 'UAA U15', scopeLabel: 'UAA U15', subLabel: sub('UAA U15'), urlBase: '/uaa/u15', players: D15, standings: standings['uaa-u15'] || {}, circuit: 'uaa', age: 'u15', isBase: true, combineKind: null }),
  mk({ key: 'u16', label: 'UAA U16', scopeLabel: 'UAA U16', subLabel: sub('UAA U16'), urlBase: '/uaa/u16', players: D16, standings: standings['uaa-u16'] || {}, circuit: 'uaa', age: 'u16', isBase: true, combineKind: null }),
  mk({ key: 'u17', label: 'UAA U17', scopeLabel: 'UAA U17', subLabel: sub('UAA U17'), urlBase: '/uaa/u17', players: D17, standings: standings['uaa-u17'] || {}, circuit: 'uaa', age: 'u17', isBase: true, combineKind: null }),
  mk({ key: 'eybl15', label: 'EYBL U15', scopeLabel: 'EYBL U15', subLabel: sub('EYBL U15'), urlBase: '/eybl/u15', players: D_EYBL15, standings: standings['eybl-u15'] || {}, circuit: 'eybl', age: 'u15', isBase: true, combineKind: null }),
  mk({ key: 'eybl16', label: 'EYBL U16', scopeLabel: 'EYBL U16', subLabel: sub('EYBL U16'), urlBase: '/eybl/u16', players: D_EYBL16, standings: standings['eybl-u16'] || {}, circuit: 'eybl', age: 'u16', isBase: true, combineKind: null }),
  mk({ key: 'eybl17', label: 'EYBL U17', scopeLabel: 'EYBL U17', subLabel: sub('EYBL U17'), urlBase: '/eybl/u17', players: D_EYBL17, standings: standings['eybl-u17'] || {}, circuit: 'eybl', age: 'u17', isBase: true, combineKind: null }),
  mk({ key: '3ssb15', label: '3SSB U15', scopeLabel: '3SSB U15', subLabel: sub('3SSB U15'), urlBase: '/3ssb/u15', players: D_3SSB15, standings: standings['3ssb-u15'] || {}, circuit: '3ssb', age: 'u15', isBase: true, combineKind: null }),
  mk({ key: '3ssb16', label: '3SSB U16', scopeLabel: '3SSB U16', subLabel: sub('3SSB U16'), urlBase: '/3ssb/u16', players: D_3SSB16, standings: standings['3ssb-u16'] || {}, circuit: '3ssb', age: 'u16', isBase: true, combineKind: null }),
  mk({ key: '3ssb17', label: '3SSB U17', scopeLabel: '3SSB U17', subLabel: sub('3SSB U17'), urlBase: '/3ssb/u17', players: D_3SSB17, standings: standings['3ssb-u17'] || {}, circuit: '3ssb', age: 'u17', isBase: true, combineKind: null }),
  mk({ key: 'all', label: 'UAA ALL', scopeLabel: 'UAA All Ages', subLabel: sub('UAA All Ages'), urlBase: '/uaa', players: DALL, standings: {}, circuit: 'uaa', age: null, isBase: false, combineKind: 'circuit' }),
  mk({ key: 'eyblall', label: 'EYBL ALL', scopeLabel: 'EYBL All Ages', subLabel: sub('EYBL All Ages'), urlBase: '/eybl', players: D_EYBLALL, standings: {}, circuit: 'eybl', age: null, isBase: false, combineKind: 'circuit' }),
  mk({ key: '3ssball', label: '3SSB ALL', scopeLabel: '3SSB All Ages', subLabel: sub('3SSB All Ages'), urlBase: '/3ssb', players: D_3SSBALL, standings: {}, circuit: '3ssb', age: null, isBase: false, combineKind: 'circuit' }),
  mk({ key: 'u15all', label: 'U15 All', scopeLabel: 'U15 All Circuits', subLabel: sub('U15 All Circuits'), urlBase: '/rankings/u15', players: D_U15ALL, standings: {}, circuit: null, age: 'u15', isBase: false, combineKind: 'age' }),
  mk({ key: 'u16all', label: 'U16 All', scopeLabel: 'U16 All Circuits', subLabel: sub('U16 All Circuits'), urlBase: '/rankings/u16', players: D_U16ALL, standings: {}, circuit: null, age: 'u16', isBase: false, combineKind: 'age' }),
  mk({ key: 'u17all', label: 'U17 All', scopeLabel: 'U17 All Circuits', subLabel: sub('U17 All Circuits'), urlBase: '/rankings/u17', players: D_U17ALL, standings: {}, circuit: null, age: 'u17', isBase: false, combineKind: 'age' }),
  mk({ key: 'allall', label: 'ALL', scopeLabel: 'All Circuits', subLabel: sub('All Circuits · All Ages'), urlBase: '/rankings', players: D_ALLALL, standings: {}, circuit: null, age: null, isBase: false, combineKind: 'all' }),
];

// Sessions — each its own base-like league; url base is a real page, not a hash.
export const S2_LEAGUE: League = mk({
  key: 's2u15', label: 'UAA U15 · Session 2', scopeLabel: 'UAA U15 Session 2',
  subLabel: 'UAA U15 · Session 2 (May 15–17, 2026)', urlBase: '/uaa/u15/session2',
  players: D_S2U15, standings: {}, circuit: 'uaa', age: 'u15', isBase: false, combineKind: null, qualMin: 9,
});
export const S3_LEAGUE: League = mk({
  key: 's3u15', label: 'UAA U15 · Session 3', scopeLabel: 'UAA U15 Session 3',
  subLabel: 'UAA U15 · Session 3 (July 9–11, 2026)', urlBase: '/uaa/u15/session3',
  players: D_S3U15, standings: {}, circuit: 'uaa', age: 'u15', isBase: false, combineKind: null, qualMin: 9,
});
export const SESSION_LEAGUES = [S2_LEAGUE, S3_LEAGUE];
export const isSessionKey = (k: string) => SESSION_LEAGUES.some(l => l.key === k);

export const BASE_LEAGUES = LEAGUES.filter(l => l.isBase);
export const byKey = (k: string) =>
  LEAGUES.find(l => l.key === k) || SESSION_LEAGUES.find(l => l.key === k);

// The 16 scope tabs shown in the header switcher / scope chips (order matches the app).
export const SCOPE_ORDER = LEAGUES;
