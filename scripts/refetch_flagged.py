#!/usr/bin/env python3
"""Re-fetch actor photos / posters that verification flagged as reject.

Aggregates /tmp/vresult_*.json (actors) and /tmp/presult_*.json (posters), then
re-fetches the rejects with a stronger strategy:
  * Actors: Wikipedia portrait FIRST (guaranteed right person); else name-aware
    ddgs (prefers results whose title mentions the actor and looks like a photo).
  * Posters: stricter ddgs poster query.
Deletes the bad file first so the resumable fetch actually replaces it.
Writes the list of what was replaced / still-missing to /tmp/refetch_report.json.
"""
import json, glob, os, importlib.util
from ddgs import DDGS

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location("fa", f"{ROOT}/scripts/fetch_assets.py")
fa = importlib.util.module_from_spec(spec); spec.loader.exec_module(fa)

actors = {a["slug"]: a["name"] for a in json.load(open(f"{ROOT}/data/actors_list.json"))}
posters = {m["id"]: m["poster_query"] for m in json.load(open(f"{ROOT}/data/movies.json"))["movies"]}


def rejected(glob_pat, key):
    out = set()
    for f in glob.glob(glob_pat):
        for r in json.load(open(f)):
            if r.get("verdict") == "reject":
                out.add(r[key])
    return sorted(out)


def name_aware_ddgs(name):
    """Prefer a result whose title mentions the actor and isn't a film/graphic."""
    toks = [t.lower() for t in name.split() if len(t) > 2]
    bad = ("movie", "scene", "poster", "still", "song", "trailer", "logo", "wallpaper")
    try:
        with DDGS() as d:
            res = d.images(f"{name} Tamil cinema actor face portrait", max_results=25)
    except Exception:
        return None
    def ok(r):
        u = (r.get("image") or ""); t = (r.get("title") or "").lower()
        if not u or u.lower().endswith(".gif") or "ytimg" in u: return False
        if any(b in t for b in bad): return False
        try:
            if int(r.get("width") or 0) < 350: return False
        except (TypeError, ValueError): pass
        return True
    named = [r for r in res if ok(r) and any(tok in (r.get("title") or "").lower() for tok in toks)]
    for r in (named or [r for r in res if ok(r)]):
        try:
            return fa.http(r["image"], fa.UA)
        except Exception:
            continue
    return None


def fix_actor(slug):
    name = actors.get(slug)
    if not name: return "unknown-slug"
    out = f"{fa.A_DIR}/{slug}.jpg"
    if os.path.exists(out): os.remove(out)
    data = None; src = None
    url = fa.wiki_portrait_url(name)                      # 1) Wikipedia first
    if url:
        try: data = fa.http(url, fa.WIKI_UA); src = "wiki"
        except Exception: data = None
    if not data:                                          # 2) name-aware ddgs
        data = name_aware_ddgs(name); src = "ddgs"
    if not data: return "still-missing"
    try:
        fa.square_crop(data).save(out, quality=88); return f"ok:{src}"
    except Exception:
        return "cropfail"


def fix_poster(mid):
    q = posters.get(mid)
    if not q: return "unknown-id"
    out = f"{fa.P_DIR}/{mid}.jpg"
    if os.path.exists(out): os.remove(out)
    try:
        u = fa.ddgs_url(f"{q} official first look", poster=True) or fa.ddgs_url(q, poster=True)
        data = fa.http(u, fa.UA)
        from PIL import Image; import io
        im = Image.open(io.BytesIO(data)).convert("RGB"); im.thumbnail((900, 900), Image.LANCZOS)
        im.save(out, quality=88); return "ok"
    except Exception:
        return "still-missing"


if __name__ == "__main__":
    a_rej = rejected("/tmp/vresult_*.json", "slug")
    p_rej = rejected("/tmp/presult_*.json", "id")
    print(f"actor rejects: {len(a_rej)}  poster rejects: {len(p_rej)}")
    report = {"actors": {}, "posters": {}}
    for s in a_rej:
        report["actors"][s] = fix_actor(s); print("actor", s, "->", report["actors"][s], flush=True)
    for p in p_rej:
        report["posters"][p] = fix_poster(p); print("poster", p, "->", report["posters"][p], flush=True)
    json.dump(report, open("/tmp/refetch_report.json", "w"), indent=1)
    still = [k for k, v in {**report["actors"], **report["posters"]}.items() if "ok" not in str(v)]
    print("STILL MISSING (manual review):", still)
