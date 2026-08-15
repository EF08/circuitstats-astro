// intake-players.json — the name index behind the intake wizard's "find him on
// Circuit Stats" step. Matching a lead to a real player is what lets the built
// site carry verified stats and national ranks without anyone typing them, so
// this is the one lookup the wizard can't do without.
//
// Its own endpoint rather than inlined into /get-started: the index is ~120KB of
// names, and the pitch page must not carry that for the large majority who never
// open the wizard. Fetched once, on the slide before it's needed.
//
// Prerendered, so it costs a build-time file and no serverless invocation. It
// refreshes with every data push like the rest of the site.
import type { APIRoute } from 'astro';
import { BASE_LEAGUES } from '../lib/leagues';

export const prerender = true;

export const GET: APIRoute = async () => {
  // Rows, not objects: 4,000 records of {name,team,league} keys would roughly
  // double the payload for nothing the client can't index positionally.
  const rows: [string, string, string][] = [];
  // A player who appears in two circuits gets a row per circuit — that is a real
  // choice the parent has to make, not a duplicate to collapse. Same player in
  // the same circuit+age twice is a data artifact, and does get collapsed.
  const seen = new Set<string>();

  for (const lg of BASE_LEAGUES) {
    for (const p of lg.players) {
      const name = (p as any).Player as string;
      if (!name) continue;
      const key = name + '|' + lg.key;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push([name, ((p as any).Team as string) || '', lg.label]);
    }
  }

  rows.sort((a, b) => a[0].localeCompare(b[0]));

  return new Response(JSON.stringify({ v: 1, rows }), {
    headers: {
      'Content-Type': 'application/json',
      'Cache-Control': 'public, max-age=3600, s-maxage=86400',
    },
  });
};
