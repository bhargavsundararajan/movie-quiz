#!/usr/bin/env python3
"""Extract the deduped actor list + poster list from a movies file.

Writes data/actors_list.json (unique actors -> photo slug + which films) and
data/posters_list.json (one entry per movie), which drive fetch_assets.py.

Usage:
  python3 scripts/extract_actors.py [movies.json]   # default: data/movies.json
"""
import json, sys, re, unicodedata, collections, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def slugify(name):
    n = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", n.lower()).strip("-")


def main(movies_path):
    movies = json.load(open(movies_path))["movies"]
    actors = collections.OrderedDict()
    for m in movies:
        for a in m["clues"]:
            actors.setdefault(a, {"name": a, "slug": slugify(a), "films": []})
            actors[a]["films"].append(m["id"])

    alist = list(actors.values())
    posters = [{"id": m["id"], "slug": m["id"], "query": m["poster_query"]} for m in movies]

    json.dump(alist, open(f"{ROOT}/data/actors_list.json", "w"), ensure_ascii=False, indent=1)
    json.dump(posters, open(f"{ROOT}/data/posters_list.json", "w"), ensure_ascii=False, indent=1)

    dups = [s for s, c in collections.Counter(v["slug"] for v in alist).items() if c > 1]
    print(f"movies: {len(movies)}  unique actors: {len(alist)}  posters: {len(posters)}")
    if dups:
        print("WARNING slug collisions:", dups)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else f"{ROOT}/data/movies.json")
