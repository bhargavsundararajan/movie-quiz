#!/usr/bin/env python3
"""Verify Tamil-film casts against Wikipedia (the source of truth for clues).

Reads a JSON array of {"title":..., "year":..., optional "id"} and writes, per
film, the billed cast (in credit order) + a reception hint. Feed the output into
clue authoring (see docs/runbook-add-movies.md). Never author casts from memory.

Usage:
  python3 scripts/verify_casts.py candidates.json out.json
    candidates.json: [ {"title":"Ghilli","year":2004}, ... ]

Notes: paces requests and backs off on HTTP 429. For 100+ films, split the input
and run several instances / subagents in parallel, then concatenate the outputs.
"""
import json, sys, re, time, urllib.request, urllib.parse

UA = "TamilFilmVerify/1.0 (quiz project)"
RECEPTION = ["blockbuster", "commercial success", "critically acclaimed", "flop",
             "disaster", "box-office bomb", "underperformed", "average", "hit"]


def wikitext(title):
    for cand in (title, f"{title} (film)"):
        url = "https://en.wikipedia.org/w/api.php?" + urllib.parse.urlencode(
            {"action": "parse", "page": cand, "prop": "wikitext", "format": "json"})
        for attempt in range(5):
            try:
                req = urllib.request.Request(url, headers={"User-Agent": UA})
                data = json.load(urllib.request.urlopen(req, timeout=30))
                if "parse" in data:
                    return cand, data["parse"]["wikitext"]["*"]
                break
            except urllib.error.HTTPError as e:
                if e.code == 429:
                    time.sleep(4 * (attempt + 1)); continue
                break
            except Exception:
                break
    return None, None


def cast_from(wt):
    m = re.search(r"==\s*Cast\s*==(.*?)\n==", wt, re.S)
    names = []
    if m:
        for line in m.group(1).splitlines():
            line = line.strip()
            if line.startswith("*"):
                lm = re.search(r"\[\[([^\]|]+)", line)
                if lm:
                    names.append(lm.group(1).strip())
    if not names:  # fallback: infobox starring
        sm = re.search(r"\|\s*starring\s*=(.*?)\n\s*\|", wt, re.S)
        if sm:
            names = [n.split("|")[-1].strip()
                     for n in re.findall(r"\[\[([^\]]+)\]\]", sm.group(1))]
    # dedupe, keep order
    seen, out = set(), []
    for n in names:
        if n not in seen:
            seen.add(n); out.append(n)
    return out[:12]


def reception(wt):
    low = wt.lower()
    hits = [w for w in RECEPTION if w in low]
    return hits[0] if hits else "unknown"


def main(inp, outp):
    films = json.load(open(inp))
    results = []
    for i, f in enumerate(films):
        used, wt = wikitext(f["title"])
        rec = {"id": f.get("id"), "title": f["title"], "year": f.get("year"),
               "found": bool(wt), "wiki_title_used": used,
               "cast_billing_order": cast_from(wt) if wt else [],
               "reception": reception(wt) if wt else "unknown"}
        results.append(rec)
        print(f"[{i+1}/{len(films)}] {f['title']}: "
              f"{'ok' if wt else 'NOT FOUND'} ({len(rec['cast_billing_order'])} cast)", flush=True)
        time.sleep(1.5)
    json.dump(results, open(outp, "w"), ensure_ascii=False, indent=1)
    print("wrote", outp)


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print(__doc__); sys.exit(1)
    main(sys.argv[1], sys.argv[2])
