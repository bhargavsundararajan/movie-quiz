#!/usr/bin/env python3
"""Deterministic quality checks for movies.json (no network)."""
import json, sys, collections

data = json.load(open("/Users/bhasund/workplace/Random/movie-quiz/data/movies.json"))
movies = data["movies"]
issues = []

# count + unique ids
if len(movies) != data["meta"]["count"]:
    issues.append(f"COUNT: {len(movies)} movies, meta says {data['meta']['count']}")
ids = [m["id"] for m in movies]
dup_ids = [i for i,c in collections.Counter(ids).items() if c>1]
if dup_ids: issues.append(f"DUP IDS: {dup_ids}")

# per-movie checks
for m in movies:
    c = m["clues"]
    if len(c) != 6:
        issues.append(f"{m['id']}: has {len(c)} clues (need 6)")
    dups = [n for n,k in collections.Counter(c).items() if k>1]
    if dups:
        issues.append(f"{m['id']}: DUPLICATE actor in clues -> {dups}")
    if m.get("category") != None and m["category"] not in data["meta"]["category_targets"]:
        issues.append(f"{m['id']}: unknown category {m['category']}")
    # last clue should be the hero (skip ensemble)
    if m.get("hero") not in ("Ensemble", None) and c[-1] != m["hero"]:
        issues.append(f"{m['id']}: last clue '{c[-1]}' != hero '{m['hero']}'")

# category distribution vs targets
cat = collections.Counter(m.get("category") for m in movies)
print("Category distribution:", dict(cat))
print("Targets:              ", data["meta"]["category_targets"])
for k,v in data["meta"]["category_targets"].items():
    if cat.get(k,0) != v:
        issues.append(f"CATEGORY {k}: have {cat.get(k,0)}, target {v}")

# unique actor count
actors = collections.Counter(a for m in movies for a in set(m["clues"]))
print(f"\nUnique actors: {len(actors)} (total clue slots: {sum(len(m['clues']) for m in movies)})")
print("Most-reused actors:", actors.most_common(8))

print(f"\n=== {len(issues)} ISSUES ===")
for i in issues: print(" -", i)
sys.exit(1 if issues else 0)
