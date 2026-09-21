import json, time, importlib.util
spec = importlib.util.spec_from_file_location("fa", "scripts/fetch_assets.py")
fa = importlib.util.module_from_spec(spec); spec.loader.exec_module(fa)
actors = json.load(open("data/demo_actors.json"))
posters = json.load(open("data/demo_posters.json"))
st = {"ok":0,"skip":0,"fail":0}
for i, a in enumerate(actors):
    r = fa.fetch_actor(a); st[r] += 1
    if i % 8 == 0: fa.save_sources()
    print(f"[actor {i+1}/{len(actors)}] {a['slug']}: {r}", flush=True); time.sleep(1.1)
fa.save_sources()
ps = {"ok":0,"skip":0,"fail":0}
for i, p in enumerate(posters):
    r = fa.fetch_poster(p); ps[r] += 1
    print(f"[poster {i+1}/{len(posters)}] {p['slug']}: {r}", flush=True); time.sleep(1.0)
fa.save_sources()
print("DEMO ACTORS:", st, " POSTERS:", ps)
