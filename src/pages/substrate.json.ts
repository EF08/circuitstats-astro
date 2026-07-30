// substrate.json — the marketer's claim-tracing source (BRIEF plug point #1).
// One whole-document GET, rebuilt on every deploy, matching the contract in
// a1a2-command-center/apps/marketer/lint.js: { version, records: [{ id, kind,
// title, url, updatedAt, facts{} }] }. The linter only quotes numbers that
// appear here, so facts are derived from the data files, never from site copy.
import type { APIRoute } from 'astro';
import { BASE_LEAGUES } from '../lib/leagues';
import { allPlayerRefs } from '../lib/slugs';

const SITE = 'https://www.circuitstats.com';

export const GET: APIRoute = () => {
  const builtAt = new Date().toISOString();
  const records: any[] = [];

  const uniqueNames = new Set<string>();
  const leagueCounts: Record<string, number> = {};
  for (const lg of BASE_LEAGUES) {
    leagueCounts[lg.label] = lg.players.length;
    for (const p of lg.players) uniqueNames.add(p.Player);
  }
  records.push({
    id: 'site-summary', kind: 'summary', title: 'Circuit Stats coverage',
    url: SITE, updatedAt: builtAt,
    facts: {
      ...leagueCounts,
      totalStatLines: BASE_LEAGUES.reduce((n, lg) => n + lg.players.length, 0),
      uniquePlayers: uniqueNames.size,
    },
  });

  for (const lg of BASE_LEAGUES) {
    if (!Object.keys(lg.standings || {}).length) continue;
    records.push({
      id: `standings-${lg.key}`, kind: 'standings', title: `${lg.scopeLabel} standings`,
      url: `${SITE}${lg.urlBase}/teams`, updatedAt: builtAt,
      facts: lg.standings,
    });
  }

  for (const ref of allPlayerRefs()) {
    const facts: Record<string, number> = {};
    for (const [k, v] of Object.entries(ref.player)) {
      if (typeof v === 'number' && Number.isFinite(v)) facts[k] = v;
    }
    records.push({
      id: ref.slug, kind: ref.league.key,
      title: `${ref.player.Player} (${ref.player.Team}) — ${ref.league.scopeLabel}`,
      url: `${SITE}/player/${ref.slug}`, updatedAt: builtAt,
      facts,
    });
  }

  return new Response(JSON.stringify({ version: builtAt, records }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
