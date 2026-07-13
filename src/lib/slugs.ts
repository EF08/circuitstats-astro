// slugs.ts — deterministic player/team slugs. Player slug = name-circuit-age
// (e.g. kellen-paul-uaa-u15); within a base league, a rare exact-name collision
// gets a -2/-3 suffix. Team slug is scoped to its own /{circuit}/{age}/team/ dir
// so 'Team Durant' stays 'team-durant' at every age. Deterministic → no
// persisted registry needed, and URLs never churn across rebuilds.
import { BASE_LEAGUES, SESSION_LEAGUES, isSessionKey, type League, type Player } from './leagues';
// Live production slug registry (seo_slugs.json) — the source of truth so every
// already-shared/indexed player URL survives the cutover byte-for-byte, including
// the 35 name-collision slugs (…-2). Keyed "Name|Team|circuit|ageKey".
import registry from '../data/seo_slugs.json';
const SLUG_REGISTRY = registry as Record<string, string>;

export function slugify(s: string): string {
  return String(s)
    .normalize('NFKD').replace(/[̀-ͯ]/g, '')      // strip accents
    .replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '')
    .toLowerCase() || 'x';
}
// registry ageKey: the session key ('s2u15'/'s3u15') for sessions, else the league's age.
function regKey(name: string, team: string, lg: League): string {
  const ageKey = isSessionKey(lg.key) ? lg.key : lg.age;
  return `${name}|${team}|${lg.circuit}|${ageKey}`;
}

// One slug per player, scoped to their base league (circuit+age).
// Returns Map<League, Map<playerName, slug>> and a flat name->{slug,league} for detail routing.
export interface PlayerRef { player: Player; league: League; slug: string; }

const _byLeague = new Map<string, Map<string, string>>();
const _bySlug = new Map<string, PlayerRef>();

function build() {
  if (_bySlug.size) return;
  const leagues = [...BASE_LEAGUES, ...SESSION_LEAGUES];
  for (const lg of leagues) {
    const used = new Set<string>();
    const nameToSlug = new Map<string, string>();
    const suffix = lg.key === 's2u15' ? '-s2' : lg.key === 's3u15' ? '-s3' : '';
    for (const p of lg.players) {
      // Prefer the live registry slug (URL continuity); else deterministic.
      let slug = SLUG_REGISTRY[regKey(p.Player, p.Team, lg)];
      if (!slug) {
        const base = slugify(`${p.Player}-${lg.circuit}-${lg.age}`) + suffix;
        slug = base; let i = 2;
        while (used.has(slug)) { slug = `${base}-${i}`; i++; }
      }
      used.add(slug);
      nameToSlug.set(p.Player, slug);
      _bySlug.set(slug, { player: p, league: lg, slug });
    }
    _byLeague.set(lg.key, nameToSlug);
  }
}

export function playerSlug(name: string, league: League): string {
  build();
  return _byLeague.get(league.key)?.get(name) || slugify(`${name}-${league.circuit}-${league.age}`);
}
export function allPlayerRefs(): PlayerRef[] { build(); return [..._bySlug.values()]; }
export function refBySlug(slug: string): PlayerRef | undefined { build(); return _bySlug.get(slug); }

// Team slugs, scoped per base league.
const _teamSlugs = new Map<string, Map<string, string>>();   // leagueKey -> team -> slug
const _teamBySlug = new Map<string, { team: string; league: League }>(); // `${leagueKey}::${slug}`

function buildTeams() {
  if (_teamSlugs.size) return;
  for (const lg of [...BASE_LEAGUES, ...SESSION_LEAGUES]) {
    const teams = [...new Set(lg.players.map(p => p.Team).filter(Boolean))].sort();
    const used = new Set<string>();
    const map = new Map<string, string>();
    for (const t of teams) {
      const base = slugify(t); let slug = base, i = 2;
      while (used.has(slug)) { slug = `${base}-${i}`; i++; }
      used.add(slug); map.set(t, slug);
      _teamBySlug.set(`${lg.key}::${slug}`, { team: t, league: lg });
    }
    _teamSlugs.set(lg.key, map);
  }
}
export function teamSlug(team: string, league: League): string {
  buildTeams();
  return _teamSlugs.get(league.key)?.get(team) || slugify(team);
}
export function teamBySlug(leagueKey: string, slug: string) { buildTeams(); return _teamBySlug.get(`${leagueKey}::${slug}`); }

// Canonical detail-page resolvers, for combined-scope tables where a row isn't
// tied to a single base league. A player's canonical page = their highest-GP
// base-league occurrence (mirrors seo_render's "most GP wins"). Session 2 is
// excluded so main-session pages stay canonical.
const _canonPlayer = new Map<string, { href: string; league: League; player: Player }>();
const _canonTeam = new Map<string, string>(); // `${circuit}|${age}|${team}` -> href
function buildCanon() {
  if (_canonPlayer.size) return;
  const bestGp = new Map<string, number>();
  for (const lg of BASE_LEAGUES) {
    for (const p of lg.players) {
      const gp = p.GP || 0;
      if (!_canonPlayer.has(p.Player) || gp > (bestGp.get(p.Player) ?? -1)) {
        bestGp.set(p.Player, gp);
        _canonPlayer.set(p.Player, { href: `/player/${playerSlug(p.Player, lg)}`, league: lg, player: p });
      }
      _canonTeam.set(`${lg.circuit}|${lg.age}|${p.Team}`, `${lg.urlBase}/team/${teamSlug(p.Team, lg)}`);
    }
  }
}
export function canonicalPlayerHref(name: string): string | null {
  buildCanon(); return _canonPlayer.get(name)?.href ?? null;
}
// Team href within a specific circuit+age (used by combined-scope rows via _src/_age).
export function teamHrefFor(team: string, circuit: string | null, age: string | null): string | null {
  buildCanon();
  if (circuit && age) return _canonTeam.get(`${circuit}|${age}|${team}`) ?? null;
  return null;
}
