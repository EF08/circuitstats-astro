// teamAliases.ts — extra search keywords per team, matched by every search box
// (stats table, teams grid, compare picker) on top of the literal team name.
// Keyed by the exact Team string in the data. Baked into the rendered DOM /
// picker JSON at build time, so client search scripts need no data import.
const ALIASES: Record<string, string> = {
  // Canadian program whose name doesn't contain "Canada"
  'Toronto Alliance Basketball': 'canada',
};

export function teamAlias(team: string): string {
  return ALIASES[team || ''] || '';
}
