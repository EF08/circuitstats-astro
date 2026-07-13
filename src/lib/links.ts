// links.ts — resolve a player row (in any league scope) to its real detail-page
// URLs. Base leagues link directly; combined scopes resolve circuit/age from the
// row's _src/_age tags and fall back to the canonical (highest-GP) page.
import type { League, Player } from './leagues';
import { playerSlug, teamSlug, canonicalPlayerHref, teamHrefFor } from './slugs';

const SRC_TO_CIRCUIT: Record<string, string> = { UAA: 'uaa', EYBL: 'eybl', '3SSB': '3ssb' };

export function rowLinks(p: Player, lg: League): { playerHref: string; teamHref: string | null } {
  if (lg.isBase || lg.key === 's2u15' || lg.key === 's3u15') {
    return {
      playerHref: `/player/${playerSlug(p.Player, lg)}`,
      teamHref: p.Team ? `${lg.urlBase}/team/${teamSlug(p.Team, lg)}` : null,
    };
  }
  // combined scope: figure out this row's circuit+age from tags
  let circuit = lg.circuit;             // set for circuit-all (all/eyblall/3ssball)
  let age = lg.age;                     // set for age-all (u15all/u16all/u17all)
  if (!circuit && p._src) circuit = SRC_TO_CIRCUIT[p._src] || null;   // age-all + all-all
  if (!age && p._age) age = (p._age as string).toLowerCase();          // circuit-all + all-all
  return {
    playerHref: canonicalPlayerHref(p.Player) || '#',
    teamHref: p.Team ? teamHrefFor(p.Team, circuit, age) : null,
  };
}
