#!/usr/bin/env python3
"""Faster, concurrent variant of fetch_assets.py — resumes (skips existing files).

Uses a thread pool instead of the serial 1.2s-sleep loop. Reuses fetch_assets'
fetch_actor / fetch_poster (which have no internal sleep). Moderate worker count
keeps Wikipedia 429s manageable (each download still backs off).

  python3 scripts/fetch_assets_parallel.py [workers]   # default 6
"""
import json, sys, os, importlib.util, concurrent.futures as cf

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
spec = importlib.util.spec_from_file_location("fa", f"{ROOT}/scripts/fetch_assets.py")
fa = importlib.util.module_from_spec(spec)
spec.loader.exec_module(fa)

workers = int(sys.argv[1]) if len(sys.argv) > 1 else 6
actors = json.load(open(f"{ROOT}/data/actors_list.json"))
posters = json.load(open(f"{ROOT}/data/posters_list.json"))


def run(label, items, fn):
    done = {"ok": 0, "skip": 0, "fail": 0}
    with cf.ThreadPoolExecutor(max_workers=workers) as ex:
        futs = {ex.submit(fn, it): it for it in items}
        for i, fut in enumerate(cf.as_completed(futs), 1):
            try:
                done[fut.result()] += 1
            except Exception:
                done["fail"] += 1
            if i % 20 == 0:
                fa.save_sources()
                print(f"[{label} {i}/{len(items)}] {done}", flush=True)
    fa.save_sources()
    print(f"{label} DONE: {done}", flush=True)


run("actors", actors, fa.fetch_actor)
run("posters", posters, fa.fetch_poster)
