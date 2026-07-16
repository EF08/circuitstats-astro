// liveLabel.js — the urgency badge on the player-page CTA card and /get-started
// hero. Single source of truth: imported at build time for the initial render
// AND by a client script that corrects it to the visitor's actual date (static
// pages can outlive the month they were built in).
//
// Only the real NCAA live/evaluation months get a badge (April and July).
// Every other month returns '' and the badge element is hidden entirely — the
// card renders identically, just without the extra line.
export function liveLabel(d = new Date()) {
  const m = d.getMonth(); // 0-based
  if (m === 6) return 'July live period';
  if (m === 3) return 'April live period';
  return '';
}
