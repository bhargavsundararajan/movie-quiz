#!/usr/bin/env python3
"""Fetch top-N ddgs candidate photos per actor for the manual picker.

Query = "<name> tamil actor". Downloads up to N (default 5) usable results to
assets/candidates/<slug>/<i>.jpg (square 500px) and records them in
data/candidates.json. By default builds candidates for every actor whose
verdict != ok (data/actor_verdicts.json); pass a JSON slug-list file to scope.

  python3 scripts/build_candidates.py [slugs.json] [workers] [N]
"""
import json, os, sys, io, importlib.util, concurrent.futures as cf
from ddgs import DDGS
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location("fa", f"{ROOT}/scripts/fetch_assets.py")
fa = importlib.util.module_from_spec(spec); spec.loader.exec_module(fa)

CAND = f"{ROOT}/assets/candidates"; os.makedirs(CAND, exist_ok=True)
names = {a["slug"]: a["name"] for a in json.load(open(f"{ROOT}/data/actors_list.json"))}
workers = int(sys.argv[2]) if len(sys.argv) > 2 else 6
N = int(sys.argv[3]) if len(sys.argv) > 3 else 5

if len(sys.argv) > 1:
    slugs = json.load(open(sys.argv[1]))
else:
    av = json.load(open(f"{ROOT}/data/actor_verdicts.json"))
    slugs = [s for s, v in av.items() if v.get("verdict") != "ok"]

def square(data, size=500):
    im = Image.open(io.BytesIO(data)).convert("RGB"); w, h = im.size; m = min(w, h)
    return im.crop(((w-m)//2, (h-m)//2, (w-m)//2+m, (h-m)//2+m)).resize((size, size), Image.LANCZOS)

def build(slug):
    name = names.get(slug)
    if not name: return slug, []
    try:
        with DDGS() as d:
            res = d.images(f"{name} tamil actor", max_results=20)
    except Exception:
        return slug, []
    outdir = f"{CAND}/{slug}"; os.makedirs(outdir, exist_ok=True)
    opts, i = [], 0
    for r in res:
        if i >= N: break
        u = r.get("image", "") or ""
        if not u or u.lower().endswith(".gif") or "ytimg" in u or "youtube" in u: continue
        try:
            if int(r.get("width") or 0) < 300: continue
        except (TypeError, ValueError): pass
        try:
            data = fa.http(u, fa.UA)
            square(data).save(f"{outdir}/{i}.jpg", quality=85)
        except Exception:
            continue
        opts.append({"i": i, "url": u, "title": (r.get("title") or "")[:80]})
        i += 1
    return slug, opts

if __name__ == "__main__":
    print(f"building {N} candidates each for {len(slugs)} actors ({workers} workers)…", flush=True)
    out = {}
    with cf.ThreadPoolExecutor(max_workers=workers) as ex:
        for n, (slug, opts) in enumerate(ex.map(build, slugs), 1):
            out[slug] = {"name": names.get(slug, slug), "options": opts}
            if n % 20 == 0:
                json.dump(out, open(f"{ROOT}/data/candidates.json", "w"), ensure_ascii=False, indent=1)
                print(f"[{n}/{len(slugs)}]", flush=True)
    json.dump(out, open(f"{ROOT}/data/candidates.json", "w"), ensure_ascii=False, indent=1)
    empty = [s for s, v in out.items() if not v["options"]]
    print(f"done. actors with candidates: {sum(1 for v in out.values() if v['options'])}, empty: {len(empty)}")
