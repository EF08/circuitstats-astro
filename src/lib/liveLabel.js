// liveLabel.js — the urgency badge on the player-page CTA card and /get-started
// hero, derived from the grassroots recruiting calendar instead of hardcoded
// copy. Single source of truth: imported at build time for the initial render
// AND by a client script that corrects the label to the visitor's actual date
// (static pages can outlive the month they were built in).
//
// NCAA boys' calendar in broad strokes: April + July are the live/evaluation
// periods, May-June is circuit play, Aug-Sep is the fall contact window,
// everything else is off-season scouting. Plain .js (not .ts) so the same file
// bundles into inline client scripts untouched.
export function liveLabel(d = new Date()) {
  const m = d.getMonth(); // 0-based
  if (m === 6) return 'July live period';
  if (m === 3) return 'April live period';
  if (m === 4 || m === 5) return 'Circuit season live';
  if (m === 7 || m === 8) return 'Fall recruiting period';
  return 'Coaches scout year-round';
}
