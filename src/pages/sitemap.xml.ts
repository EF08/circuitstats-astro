// sitemap.xml — enumerates every indexable real URL: scope pages (stats/leaders/
// teams/compare for all 16 scopes), player pages, team pages. Excludes Session 2
// + Abri (noindex) and the on-demand compare pairs.
import type { APIRoute } from 'astro';
import { LEAGUES, BASE_LEAGUES } from '../lib/leagues';
import { CAT_SLUGS } from '../lib/catalog';
import { allPlayerRefs, teamSlug } from '../lib/slugs';

const SITE = 'https://www.circuitstats.com';

export const GET: APIRoute = () => {
  const urls: string[] = ['/'];
  for (const lg of LEAGUES) {
    urls.push(`${lg.urlBase}/stats`, `${lg.urlBase}/teams`, `${lg.urlBase}/compare`);
    for (const s of CAT_SLUGS) urls.push(`${lg.urlBase}/leaders/${s}`);
  }
  for (const lg of BASE_LEAGUES) {
    const teams = [...new Set(lg.players.map(p => p.Team).filter(Boolean))];
    for (const t of teams) urls.push(`${lg.urlBase}/team/${teamSlug(t, lg)}`);
  }
  for (const ref of allPlayerRefs()) {
    if (ref.league.key === 's2u15' || ref.league.key === 's3u15') continue;  // session pages are noindex
    if ((ref.player.GP || 0) < 1) continue;
    urls.push(`/player/${ref.slug}`);
  }
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">` +
    urls.map(u => `<url><loc>${SITE}${u}</loc></url>`).join('') +
    `</urlset>`;
  return new Response(body, { headers: { 'Content-Type': 'application/xml' } });
};
