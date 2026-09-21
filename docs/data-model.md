# Data model

## `data/movies.json` (source of truth)

```jsonc
{
  "meta": {
    "clue_formula": "…",              // human note
    "clues_per_movie": 6,
    "verified": true,                  // casts checked against Wikipedia
    "count": 100,
    "category_targets": { "superstar": 30, "midtier": 20, "female_led": 15,
                          "character_driven": 22, "troll_washout": 13 }
  },
  "movies": [
    {
      "id": "ghilli-2004",             // unique; slug of title + year
      "title": "Ghilli",
      "year": 2004,
      "category": "superstar",         // one of the category_targets keys
      "hero": "Vijay",                 // lead; must equal clues[5] (unless "Ensemble")
      "answers": ["ghilli", "gilli"],  // accepted guesses (fuzzy-matched)
      "clues": [                       // exactly 6, reveal order, unique, real cast
        "Tanikella Bharani", "Dhamu", "Prakash Raj",
        "Ashish Vidyarthi", "Trisha", "Vijay"
      ],
      "poster_query": "Ghilli 2004 Tamil movie poster"  // used by the fetcher only
    }
  ]
}
```

Invariants enforced by `scripts/validate.py`:
- exactly `meta.count` movies, unique `id`s;
- each movie has exactly 6 **unique** clue names;
- `clues[5] === hero` for every non-`Ensemble` film;
- category counts match `meta.category_targets`.

## `data/actors_list.json`

```json
[ { "name": "Vijay", "slug": "vijay", "films": ["ghilli-2004", "nanban-2012", …] } ]
```
Maps an actor name to the photo filename slug. Built by `scripts/extract_actors.py`.
The app loads it to resolve `assets/actors/<slug>.jpg`; if a name is missing it
falls back to `slugify(name)` (`src/slugify.js`), which matches the Python slug.

## `data/posters_list.json`

```json
[ { "id": "ghilli-2004", "slug": "ghilli-2004", "query": "Ghilli 2004 Tamil movie poster" } ]
```
Drives poster fetching → `assets/posters/<id>.jpg`.

## `data/movies.demo.json`

Same shape as `movies.json`, a small playtest subset. Loaded when the page is
opened with `?data=demo` (see `resolveMoviesPath()` in `src/data.js`).

## How the app resolves media

- Photo for a clue: `assets/actors/${slugByName.get(name) ?? slugify(name)}.jpg`
- Poster for a movie: `assets/posters/${movie.id}.jpg`
- Both fail gracefully (name-only tile / hidden poster) when the file is absent.

## Persisted state (`localStorage`, key `CONFIG.STORAGE_KEY`)

```jsonc
{
  "version": 1,
  "players": [ { "id": "...", "name": "Asha", "score": 3 } ],  // scores may go negative
  "visited": { "ghilli-2004": true },
  "settings": { "scoring": true, "showCategory": false },
  "order": [ "…movie ids in card order…" ]   // reconciled to the loaded dataset
}
```
Bump `version` (and handle migration) for any breaking shape change.
