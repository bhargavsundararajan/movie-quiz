# Runbook — fetching actor photos & movie posters

Turns `data/movies.json` into the images the game needs:
`assets/actors/<slug>.jpg` (uniform 700×700) and `assets/posters/<movieId>.jpg`.

## Setup (once)

```bash
python3 -m venv .venv && .venv/bin/pip install -r requirements.txt   # ddgs, Pillow
```

## Pipeline

1. **Extract the work lists** from the repo (deduped — an actor in many films is
   fetched once):
   ```bash
   .venv/bin/python scripts/extract_actors.py
   # writes data/actors_list.json (unique actors + slug) and data/posters_list.json
   ```
2. **Fetch + crop** (resumable — skips files already present):
   ```bash
   .venv/bin/python scripts/fetch_assets_parallel.py 6   # parallel (fast); MANAGED bg job
   # or the serial scripts/fetch_assets.py for a gentler, one-at-a-time run
   ```
   - **Actors:** `ddgs` image search is the **primary** source; Wikipedia REST
     portrait is the fallback when ddgs finds nothing. Cover-cropped to 700×700
     (Pillow). (ddgs gives better coverage/recency for Tamil actors, but its
     results are only heuristically off-film — see verification below.)
   - **Posters:** `ddgs` on each `poster_query`, resized keeping aspect (posters
     are the one place a film image is allowed — shown only on the answer reveal).
   - Sources/outcomes are logged to `data/asset_sources.json` (git-ignored).
   - **Speed:** `fetch_assets_parallel.py` uses a thread pool (default 6 workers)
     instead of the serial 1.2s-per-item loop. Don't over-crank workers — ddgs and
     Wikipedia will throttle.

## Rules & gotchas

- **Off-film reference photos.** Actor tiles must be portraits/publicity shots,
  never stills from the film. Wikipedia/Wikimedia satisfy this; when falling back
  to `ddgs`, the query filters out `movie/scene/poster/still/…` and you should
  spot-check.
- **Rate limits.** `upload.wikimedia.org` throttles hard (HTTP 429) under bursts.
  `fetch_assets.py` paces (~1.2s) and backs off; `ddgs` hosts don't rate-limit us.
  Do **not** run two heavy fetchers at once — pause one first.
- **Background jobs:** use the harness's managed background (`run_in_background`),
  never `nohup … &` (it gets reaped, stops partway).
- **Slugs:** `assets/actors/<slug>.jpg` where slug = the Python slug of the actor
  name; `src/slugify.js` reproduces it in the browser. Keep them in sync.
- **Missing images degrade gracefully** — the tile shows the name, the poster is
  hidden. So a partial fetch is still playable.
- **CSS `object-fit: cover`** fits any aspect into the square tile, but we still
  crop to 700×700 so tiles are uniform and files are small.

## Verify & retry (do this before shipping the full set)

1. **Failures:** re-run `fetch_assets.py` (resumable) to retry anything logged as
   `FAILED` in `data/asset_sources.json`; adjust the query/Wikipedia title for
   stubborn ones.
2. **Identity / not-a-still check:** at 300+ actors you can't eyeball each in the
   main context — fan out to subagents that `Read` batches of images and flag
   wrong-person or film-still hits; re-fetch only the flagged ones.
3. Confirm counts: every clue actor has a photo, every movie has a poster.

## Demo set

`scripts/fetch_demo.py` fetches only the actors/posters in `data/movies.demo.json`
(reuses the functions in `fetch_assets.py`, skips existing files).
