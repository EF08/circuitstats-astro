#!/usr/bin/env python3
"""
audit_urls.py — cutover safety net. Takes every URL the CURRENT live site exposes
(from ../circuitstats' committed sitemaps) and checks each one resolves (HTTP 200,
or a 301/308 redirect we intentionally added) on a target deploy — e.g. the new
Astro preview URL. Prints anything that would break so we fix it before moving the
domain.

Usage:
    python audit_urls.py --base https://circuitstats-astro-xxxx.vercel.app
    python audit_urls.py --base http://localhost:4321 --limit 500   # quick local pass
"""
import argparse, concurrent.futures as cf, os, sys, urllib.request, urllib.error, xml.etree.ElementTree as ET

HERE = os.path.dirname(os.path.abspath(__file__))
LIVE = os.path.normpath(os.path.join(HERE, "..", "circuitstats"))
NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"


def live_urls():
    """All <loc> paths from ../circuitstats/sitemaps/*.xml (+ sitemap.xml children)."""
    paths, seen = [], set()
    smdir = os.path.join(LIVE, "sitemaps")
    files = []
    if os.path.isdir(smdir):
        files = [os.path.join(smdir, f) for f in os.listdir(smdir) if f.endswith(".xml")]
    for f in files:
        try:
            root = ET.parse(f).getroot()
        except Exception:
            continue
        for loc in root.iter(f"{NS}loc"):
            u = (loc.text or "").strip()
            p = u.split("circuitstats.com", 1)[-1] or "/"
            if p not in seen:
                seen.add(p); paths.append(p)
    # always include the roots
    for p in ("/", "/robots.txt", "/sitemap.xml"):
        if p not in seen:
            seen.add(p); paths.append(p)
    return paths


def check(base, path):
    url = base.rstrip("/") + path
    req = urllib.request.Request(url, method="HEAD", headers={"User-Agent": "cutover-audit"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return path, r.status
    except urllib.error.HTTPError as e:
        # HEAD sometimes 405/403 on SSR routes — retry GET
        if e.code in (403, 405):
            try:
                with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "cutover-audit"}), timeout=20) as r:
                    return path, r.status
            except Exception as e2:
                return path, getattr(e2, "code", "ERR")
        return path, e.code
    except Exception:
        return path, "ERR"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", required=True, help="target deploy base URL")
    ap.add_argument("--limit", type=int, default=0, help="cap URLs checked (0=all)")
    ap.add_argument("--workers", type=int, default=16)
    args = ap.parse_args()

    urls = live_urls()
    if not urls:
        raise SystemExit("No live URLs found — is ../circuitstats/sitemaps/ present?")
    if args.limit:
        urls = urls[: args.limit]
    print(f"Auditing {len(urls)} live URLs against {args.base} …")

    bad = []
    ok = 0
    with cf.ThreadPoolExecutor(max_workers=args.workers) as ex:
        for path, status in ex.map(lambda p: check(args.base, p), urls):
            if status in (200, 301, 308):
                ok += 1
            else:
                bad.append((path, status))
    print(f"\n  OK: {ok}   BROKEN: {len(bad)}")
    for path, status in bad[:200]:
        print(f"  {status}  {path}")
    if len(bad) > 200:
        print(f"  … +{len(bad) - 200} more")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
