// evalSeats.js — the free-D1-evaluation counter.
//
// One number, imported by both places that quote it: the site-wide header CTA
// (Layout.astro) and the page it lands on (/free-evaluation). Move it as
// evaluations get done; never type the figure into markup twice.
//
// Same scarcity model as the player-website launch offer in get-started.astro:
// by count, not by clock. There is no deadline that can quietly expire on a
// page nobody rebuilt.
//
// At 0 the whole thing folds on the next build — the header CTA drops its red
// count and reads "Free D1 evaluation", and the page stops claiming any are
// left. Nothing else to undo.
export const EVAL_SEATS_LEFT = 6;
