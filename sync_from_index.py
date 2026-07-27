#!/usr/bin/env python3
"""
sync_from_index.py — the data bridge between Andy's existing update pipeline and
this Astro site.

Andy's workflow is unchanged: scrape -> Excel -> build_site.py -> circuitstats/index.html.
This script then extracts the exact data that index.html inlines (the D* dataset
consts + STANDINGS_* + the slug registry) and writes it into src/data/*.json,
which the Astro build reads. Same source of truth, zero double-entry.

Usage (after a normal stats update in ../circuitstats):
    python sync_from_index.py
    npx astro build      # or: git commit + push -> Vercel rebuilds

Point --index at a different index.html if the sibling path differs.
"""
import json, os, re, argparse, datetime

HERE = os.path.dirname(os.path.abspath(__file__))
DEFAULT_INDEX = os.path.normpath(os.path.join(HERE, "..", "circuitstats", "index.html"))
DEFAULT_SLUGS = os.path.normpath(os.path.join(HERE, "..", "circuitstats", "seo_slugs.json"))
DATA_DIR = os.path.join(HERE, "src", "data")

# dataset const -> output filename (matches what leagues.ts imports)
DATASETS = {
    "D15": "uaa-u15", "D16": "uaa-u16", "D17": "uaa-u17",
    "D_EYBL15": "eybl-u15", "D_EYBL16": "eybl-u16", "D_EYBL17": "eybl-u17",
    "D_3SSB15": "3ssb-u15", "D_3SSB16": "3ssb-u16", "D_3SSB17": "3ssb-u17",
    "D_S2U15": "uaa-u15-s2",
    "D_S3U15": "uaa-u15-s3",
}
STANDINGS = {
    "STANDINGS_U15": "uaa-u15", "STANDINGS_U16": "uaa-u16", "STANDINGS_U17": "uaa-u17",
    "STANDINGS_EYBL15": "eybl-u15", "STANDINGS_EYBL16": "eybl-u16", "STANDINGS_EYBL17": "eybl-u17",
    "STANDINGS_3SSB15": "3ssb-u15", "STANDINGS_3SSB16": "3ssb-u16", "STANDINGS_3SSB17": "3ssb-u17",
}


def extract_datasets(text):
    out = {}
    for line in text.splitlines():
        for const, fname in DATASETS.items():
            if line.startswith(f"const {const} "):
                m = re.search(r"=\s*(\{.*?\})\s*;", line)  # non-greedy: stops before any trailing // comment
                if not m:
                    m = re.search(r"=\s*(\{.*\})\s*;", line)
                if m:
                    try:
                        out[fname] = json.loads(m.group(1))
                    except json.JSONDecodeError as e:
                        raise SystemExit(f"  FAILED parsing {const}: {e}")
    missing = set(DATASETS.values()) - set(out)
    if missing:
        raise SystemExit(f"  ERROR: datasets not found in index.html: {sorted(missing)}")
    return out


def extract_standings(text):
    out = {}
    for const, key in STANDINGS.items():
        m = re.search(r"const %s = (\{.*?\n\});" % re.escape(const), text, re.S)
        d = {}
        if m:
            for tm, rk, w, l in re.findall(
                    r"'([^']+)':\s*\{rank:\s*(\d+),\s*w:\s*(\d+),\s*l:\s*(\d+)\}", m.group(1)):
                d[tm] = {"rank": int(rk), "w": int(w), "l": int(l)}
        out[key] = d
    return out


# ── Keep the docs' player counts honest ───────────────────────────────────────
# AGENTS.md and CLAUDE.md quote per-league player counts. Those were hand-written
# and had drifted badly (they claimed UAA 317/324/336 and "2,945 unique players"
# when the real figures were 400/372/413 and 3,770) — stale numbers in an agent-
# facing brief are worse than none, because they get taken as fact.
#
# So they are no longer hand-maintained: this rewrites the marked regions below
# from the datasets we just wrote, on every single sync. Do not edit the numbers
# by hand — edit nothing, just re-run this script.
# AGENTS.md only — CLAUDE.md is a symlink to it, so one write covers both.
DOC_FILES = ['AGENTS.md']
LEAGUE_ROWS = [
    ('UAA',            ['uaa-u15', 'uaa-u16', 'uaa-u17']),
    ('EYBL',           ['eybl-u15', 'eybl-u16', 'eybl-u17']),
    ('3SSB Platinum',  ['3ssb-u15', '3ssb-u16', '3ssb-u17']),
]
BLOCK_RE  = re.compile(r'(<!-- DATA-COUNTS:BEGIN[^>]*-->)(.*?)(<!-- DATA-COUNTS:END -->)', re.S)
INLINE_RE = re.compile(r'(<!--PLAYERS-->)(.*?)(<!--/PLAYERS-->)', re.S)


def refresh_doc_counts(datasets):
    counts = {k: len(v.get('players', [])) for k, v in datasets.items()}
    names = set()
    lines = 0
    for _, keys in LEAGUE_ROWS:
        for k in keys:
            for p in datasets.get(k, {}).get('players', []):
                lines += 1
                names.add(str(p.get('Player', '')).strip().lower())
    today = datetime.date.today().isoformat()

    rows = []
    for label, keys in LEAGUE_ROWS:
        parts = ', '.join(f'{k.split("-")[1].upper()} {counts.get(k, 0)}' for k in keys)
        rows.append(f'- {label}: {parts}')
    block = '\n'.join(rows) + (
        f'\n- **{lines:,} player stat lines across {len(LEAGUE_ROWS) * 3} datasets '
        f'· {len(names):,} unique players** (auto-updated {today})'
    )
    inline = f'{len(names):,} unique players tracked'

    for fname in DOC_FILES:
        path = os.path.join(HERE, fname)
        if not os.path.exists(path):
            continue
        text = open(path, encoding='utf-8').read()
        orig = text
        if BLOCK_RE.search(text):
            text = BLOCK_RE.sub(lambda m: f'{m.group(1)}\n{block}\n{m.group(3)}', text)
        else:
            print(f'  WARNING: {fname} has no DATA-COUNTS markers — counts NOT refreshed')
        if INLINE_RE.search(text):
            text = INLINE_RE.sub(lambda m: f'{m.group(1)}{inline}{m.group(3)}', text)
        if text != orig:
            open(path, 'w', encoding='utf-8').write(text)
            print(f'  {fname} counts refreshed ({lines:,} lines, {len(names):,} unique)')


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--index", default=DEFAULT_INDEX)
    ap.add_argument("--slugs", default=DEFAULT_SLUGS)
    args = ap.parse_args()

    if not os.path.exists(args.index):
        raise SystemExit(f"  ERROR: index.html not found at {args.index}\n  Pass --index <path>.")
    text = open(args.index, encoding="utf-8").read()

    datasets = extract_datasets(text)
    standings = extract_standings(text)
    os.makedirs(DATA_DIR, exist_ok=True)
    for fname, data in datasets.items():
        json.dump(data, open(os.path.join(DATA_DIR, f"{fname}.json"), "w", encoding="utf-8"), ensure_ascii=False)
        print(f"  {fname}.json  ({len(data.get('players', []))} players)")
    json.dump(standings, open(os.path.join(DATA_DIR, "standings.json"), "w", encoding="utf-8"), ensure_ascii=False)
    print(f"  standings.json ({sum(1 for v in standings.values() if v)} leagues with standings)")

    # keep the slug registry in sync so URLs stay stable as new players appear
    if os.path.exists(args.slugs):
        reg = json.load(open(args.slugs, encoding="utf-8"))
        json.dump(reg, open(os.path.join(DATA_DIR, "seo_slugs.json"), "w", encoding="utf-8"), ensure_ascii=False)
        print(f"  seo_slugs.json ({len(reg)} slugs)")
    else:
        print(f"  WARNING: slug registry not found at {args.slugs} — keeping existing src/data/seo_slugs.json")

    refresh_doc_counts(datasets)

    print("Done. Now run: npx astro build   (or commit + push to deploy)")


if __name__ == "__main__":
    main()
