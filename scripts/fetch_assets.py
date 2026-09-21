#!/usr/bin/env python3
"""Fetch + uniform-crop actor portraits (off-film) and posters. Resumable."""
import json, os, sys, re, time, urllib.request, urllib.parse, io
from PIL import Image
from ddgs import DDGS

ROOT = "/Users/bhasund/workplace/Random/movie-quiz"
A_DIR = f"{ROOT}/assets/actors"; P_DIR = f"{ROOT}/assets/posters"
os.makedirs(A_DIR, exist_ok=True); os.makedirs(P_DIR, exist_ok=True)
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36"
WIKI_UA = "TamilQuizAssets/1.0 (personal quiz project)"
SRC = f"{ROOT}/data/asset_sources.json"
sources = json.load(open(SRC)) if os.path.exists(SRC) else {}

def save_sources():
    json.dump(sources, open(SRC, "w"), ensure_ascii=False, indent=1)

def http(url, ua, tries=4, timeout=30):
    for i in range(tries):
        try:
            return urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": ua}), timeout=timeout).read()
        except urllib.error.HTTPError as e:
            if e.code == 429: time.sleep(4*(i+1)); continue
            raise
    raise RuntimeError("429")

def wiki_portrait_url(name):
    b = name.replace(" ", "_")
    # Actor-disambiguated titles FIRST so we don't grab a namesake (e.g. the
    # politician "S. Jaishankar" instead of actor "Jaishankar").
    for title in (b + "_(Tamil_actor)", b + "_(Tamil_actress)", b + "_(actor)",
                  b + "_(actress)", b + "_(Indian_actor)", b):
        try:
            d = json.loads(http("https://en.wikipedia.org/api/rest_v1/page/summary/"+urllib.parse.quote(title), WIKI_UA, tries=3))
        except Exception:
            continue
        if d.get("type") == "disambiguation": continue
        img = (d.get("originalimage", {}) or {}).get("source") or (d.get("thumbnail", {}) or {}).get("source")
        if img and re.search(r"\.(jpg|jpeg|png)$", img.split("?")[0], re.I):
            return img.split("?")[0]
    return None

def ddgs_url(query, poster=False):
    with DDGS() as d:
        res = d.images(query, max_results=25)
    bad = ("movie","scene","poster","still","song","full movie","comedy scenes","collection","trailer","first look","meme")
    for r in res:
        u = r.get("image","") or ""; t = (r.get("title") or "").lower()
        if not u or u.lower().endswith(".gif") or "ytimg" in u or "youtube" in u: continue
        try: w=int(r.get("width") or 0); h=int(r.get("height") or 0)
        except: w=h=0
        if poster:
            if h and w and h < w: continue
            if w and w < 300: continue
        else:
            if any(b in t for b in bad): continue
            if w and w < 350: continue
        return u
    return res[0]["image"] if res else None

def square_crop(data, size=700):
    im = Image.open(io.BytesIO(data)).convert("RGB")
    w, h = im.size; m = min(w, h)
    im = im.crop(((w-m)//2, (h-m)//2, (w-m)//2+m, (h-m)//2+m)).resize((size, size), Image.LANCZOS)
    return im

def fetch_actor(a):
    slug = a["slug"]; out = f"{A_DIR}/{slug}.jpg"
    if os.path.exists(out) and os.path.getsize(out) > 3000:
        return "skip"
    data = None; src = "ddgs"; url = None
    # 1) ddgs image search (primary)
    try:
        u = ddgs_url(f'{a["name"]} Indian Tamil actor portrait face')
        if u:
            data = http(u, UA); url = u
    except Exception:
        data = None
    # 2) Wikipedia portrait (fallback, guaranteed off-film)
    if not data:
        wu = wiki_portrait_url(a["name"])
        if wu:
            try:
                data = http(wu, WIKI_UA); src = "wiki"; url = wu
            except Exception:
                data = None
    if not data:
        sources[slug] = {"status": "FAILED", "src": None}; return "fail"
    try:
        square_crop(data).save(out, quality=88)
        sources[slug] = {"status": "ok", "src": src, "url": url}
        return "ok"
    except Exception as e:
        sources[slug] = {"status": "CROPFAIL", "err": str(e)[:50]}; return "fail"

def fetch_poster(p):
    out = f"{P_DIR}/{p['slug']}.jpg"
    if os.path.exists(out) and os.path.getsize(out) > 3000: return "skip"
    try:
        u = ddgs_url(p["query"], poster=True)
        data = http(u, UA)
        im = Image.open(io.BytesIO(data)).convert("RGB"); im.thumbnail((900,900), Image.LANCZOS)
        im.save(out, quality=88)
        sources["poster:"+p["slug"]] = {"status":"ok"}
        return "ok"
    except Exception as e:
        sources["poster:"+p["slug"]] = {"status":"FAILED","err":str(e)[:50]}; return "fail"

if __name__ == "__main__":
    actors = json.load(open(f"{ROOT}/data/actors_list.json"))
    posters = json.load(open(f"{ROOT}/data/posters_list.json"))
    stats = {"ok":0,"skip":0,"fail":0}
    for i,a in enumerate(actors):
        r = fetch_actor(a); stats[r]+=1
        if i % 10 == 0: save_sources()
        print(f"[actor {i+1}/{len(actors)}] {a['slug']}: {r}", flush=True)
        time.sleep(1.2)
    save_sources()
    pstats = {"ok":0,"skip":0,"fail":0}
    for i,p in enumerate(posters):
        r = fetch_poster(p); pstats[r]+=1
        if i % 10 == 0: save_sources()
        print(f"[poster {i+1}/{len(posters)}] {p['slug']}: {r}", flush=True)
        time.sleep(1.0)
    save_sources()
    print("ACTORS:", stats, " POSTERS:", pstats)
