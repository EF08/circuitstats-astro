// Dynamic Open Graph share-card generator (Vercel Edge Function).
// Each static page sets og:image -> /api/og?...; this renders a branded PNG on the
// fly from the same stats shown on the page, so link previews always match. No
// images are committed to the repo. If this ever fails, pages still work — only the
// preview image is affected, and Vercel keeps the last good deploy live.
import { ImageResponse } from '@vercel/og';

export const config = { runtime: 'edge' };

const BG = '#0b0e16', FG = '#ffffff', ACC = '#7aa2ff', SUB = '#9aa3b8', VAL = '#9fc0ff', WIN = '#8fe3a0';

function h(type, style, children) {
  return { type, props: children === undefined ? { style } : { style, children } };
}
const col = (style, children) => h('div', { display: 'flex', flexDirection: 'column', ...style }, children.filter(Boolean));
const row = (style, children) => h('div', { display: 'flex', flexDirection: 'row', ...style }, children.filter(Boolean));
const text = (style, t) => h('div', style, t);

function statItem(val, label) {
  return col({ marginRight: '44px' }, [
    text({ fontSize: '48px', fontWeight: 800, color: ACC, lineHeight: 1.05 }, val),
    text({ fontSize: '18px', color: SUB, fontWeight: 600, marginTop: '2px', letterSpacing: '1px' }, label),
  ]);
}
function teamRow(parts, header) {
  const cell = (v) => h('div', {
    width: '94px', textAlign: 'right', fontSize: header ? '20px' : '26px',
    color: header ? SUB : '#dfe5f0', fontWeight: 600,
  }, v);
  const style = { display: 'flex', flexDirection: 'row', alignItems: 'center', paddingTop: '11px', paddingBottom: '11px' };
  if (!header) { style.borderTopWidth = '1px'; style.borderTopStyle = 'solid'; style.borderTopColor = '#1c2233'; }
  return h('div', style, [
    h('div', { display: 'flex', flexGrow: 1, fontSize: header ? '20px' : '28px', color: header ? SUB : '#fff', fontWeight: 700, letterSpacing: header ? '1px' : '0px' }, parts[0]),
    cell(parts[1]), cell(parts[2]), cell(parts[3]), cell(parts[4]), cell(parts[5]),
  ]);
}

function page(sub, middle) {
  return col(
    { width: '1200px', height: '630px', backgroundColor: BG, color: FG, padding: '64px',
      justifyContent: 'space-between', fontFamily: 'sans-serif' },
    [
      row({ justifyContent: 'space-between', alignItems: 'center' }, [
        text({ fontSize: '30px', fontWeight: 800, color: ACC, letterSpacing: '2px' }, 'CIRCUIT STATS'),
        text({ fontSize: '26px', color: SUB, fontWeight: 600 }, sub || ''),
      ]),
      middle,
      row({ justifyContent: 'space-between', alignItems: 'center', fontSize: '24px', color: SUB }, [
        text({}, 'circuitstats.com'),
        text({}, '2026 season'),
      ]),
    ]
  );
}

function build(p) {
  const g = (k) => p.get(k) || '';
  const t = g('t') || 'p';

  if (t === 'c') { // compare
    const side = (name, line, right) => col(
      { width: '44%', alignItems: right ? 'flex-end' : 'flex-start' },
      [
        text({ fontSize: '52px', fontWeight: 800, color: '#fff', textAlign: right ? 'right' : 'left' }, name),
        text({ fontSize: '34px', color: VAL, fontWeight: 700, marginTop: '14px' }, line),
        text({ fontSize: '20px', color: SUB, marginTop: '6px' }, 'PPG / RPG / APG'),
      ]
    );
    const middle = row({ alignItems: 'center', justifyContent: 'space-between' }, [
      side(g('a'), g('aL'), false),
      text({ fontSize: '44px', fontWeight: 800, color: SUB }, 'VS'),
      side(g('b'), g('bL'), true),
    ]);
    return page(g('s'), middle);
  }

  if (t === 'l' || t === 'h') { // leaderboard / hub
    const rows = ['r1', 'r2', 'r3'].map((k) => g(k)).filter(Boolean)
      .map((line) => text({ fontSize: '36px', color: VAL, fontWeight: 600, marginTop: '14px' }, line));
    const middle = col({}, [
      text({ fontSize: '60px', fontWeight: 800, color: '#fff', lineHeight: 1.08 }, g('ti')),
      rows.length ? col({ marginTop: '24px' }, rows) : (g('s2') ? text({ fontSize: '34px', color: SUB, marginTop: '18px' }, g('s2')) : null),
    ]);
    return page(g('s'), middle);
  }

  if (t === 'tm') { // team — mirrors the in-app team header
    const items = [];
    if (g('np')) items.push(statItem(g('np'), 'PLAYERS'));
    if (g('pp')) items.push(statItem(g('pp'), 'PPG'));
    if (g('rp')) items.push(statItem(g('rp'), 'RPG'));
    if (g('ap')) items.push(statItem(g('ap'), 'APG'));
    if (g('fp')) items.push(statItem(g('fp') + '%', 'FG%'));
    const rosterRows = ['r1', 'r2', 'r3'].map((k) => g(k)).filter(Boolean).map((s) => teamRow(s.split('|'), false));
    const middle = col({}, [
      g('sd') ? text({ fontSize: '26px', color: ACC, fontWeight: 700, marginBottom: '6px' }, g('sd')) : null,
      text({ fontSize: '60px', fontWeight: 800, color: '#fff', lineHeight: 1.04 }, g('n')),
      items.length ? row({ marginTop: '22px' }, items) : null,
      rosterRows.length ? col({ marginTop: '22px' }, [teamRow(['PLAYER', 'GP', 'PPG', 'RPG', 'APG', 'SPG'], true)].concat(rosterRows)) : null,
    ]);
    return page(g('s'), middle);
  }

  // player (default)
  const middle = col({}, [
    text({ fontSize: '76px', fontWeight: 800, color: '#fff', lineHeight: 1.04 }, g('n')),
    text({ fontSize: '34px', color: SUB, marginTop: '8px' }, g('tm')),
    text({ fontSize: '46px', color: VAL, fontWeight: 700, marginTop: '26px' }, g('l')),
    g('l2') ? text({ fontSize: '34px', color: SUB, fontWeight: 600, marginTop: '12px' }, g('l2')) : null,
    g('r') ? text({ fontSize: '32px', color: WIN, fontWeight: 700, marginTop: '14px' }, g('r')) : null,
  ]);
  return page(g('s'), middle);
}

export default function handler(req) {
  try {
    const { searchParams } = new URL(req.url);
    return new ImageResponse(build(searchParams), {
      width: 1200,
      height: 630,
      headers: { 'cache-control': 'public, max-age=86400, s-maxage=86400' },
    });
  } catch (e) {
    return new Response('og error: ' + e.message, { status: 500 });
  }
}
