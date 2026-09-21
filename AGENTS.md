# AGENTS.md — working on this repo

Guidance for AI agents (and humans) continuing work on the **Guess the Tamil
Movie** game. Read this first, then the runbooks in `docs/`.

## What this is

A single-device party web game. Each round reveals photos of a film's cast one
clue at a time; players guess the movie. It is a **static site, no backend, no
build step** — plain ES modules served over HTTP. Data lives in `data/`, images
in `assets/`.

## Run / test / serve

```bash
npm run serve     # python3 -m http.server 8000  → http://localhost:8000
npm test          # node --test  (unit tests for the pure logic)
```

- Must be served over **HTTP** — opening `index.html` via `file://` blocks
  `fetch()` of the JSON. `package.json` has `"type":"module"` (required for the
  `.js` ES modules and `node --test`).
- Headless smoke test (renders the app, checks it boots):
  ```bash
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new \
    --dump-dom "http://localhost:8000/index.html?data=demo"
  ```

## Architecture (see README.md for the file tree)

- **Pure, DOM-free, unit-tested:** `src/fuzzy.js` (guess matching),
  `src/scoring.js` (decaying points), `src/game.js` (`RoundSession` lifecycle),
  `src/state.js` (`AppState`: players/visited/settings/order, persisted).
- **UI (vanilla DOM):** `src/ui/{menu,round,leaderboard,scoreboard,dom}.js`.
- **Wiring:** `src/main.js` loads the repo, routes screens, owns fullscreen.
- **Config:** `src/config.js` — all tunables (scoring table, penalty, fuzzy
  threshold, clue count, paths, storage key). Change behavior here first.

Extend by adding to the pure modules (with tests) and/or a new `src/ui/*.js`
renderer routed from `main.js`. State is one persisted object — new fields are
additive.

## Data & assets

- `data/movies.json` — the repository: 100 films, Wikipedia-verified casts,
  6 clues each in reveal order. **Source of truth.** Schema: `docs/data-model.md`.
- `data/actors_list.json` — unique actors + `slug` (the photo filename). Built
  by the asset pipeline; the app falls back to `slugify()` if absent.
- `assets/actors/<slug>.jpg` (700×700) and `assets/posters/<movieId>.jpg`.
- `data/movies.demo.json` + `?data=demo` — a small playtest set (loaded via the
  `?data=` query param in `src/data.js`; no logic fork).

## Conventions & gotchas

- **`src/slugify.js` MUST match the Python slug** in `scripts/*.py`. Both turn
  an actor name into the same photo filename. If you change one, change both.
- **Never trust memory for cast data.** LLM-recalled Tamil-film casts are
  unreliable (we hit ~40% error). Always verify against Wikipedia — see
  `docs/runbook-add-movies.md`.
- **Reference photos must not be film stills.** Actor photos are fetched
  ddgs-primary (Wikipedia fallback) — ddgs is only heuristically off-film, so the
  image-verification pass is important. The film poster appears only on the
  answer reveal.
- **Spoiler-free for the owner.** The repo owner plays the game. Do NOT print
  film names, casts, clues, or answers in chat; report only aggregates.
- **Python env:** create a repo-local venv (git-ignored):
  ```bash
  python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
  ```
  (A previous session used `/tmp/deckenv`, which is ephemeral — don't rely on it.)
- **Background jobs:** launch long fetches as a *managed* background task (the
  harness's `run_in_background`), NOT `nohup … &` — the latter gets reaped.
- **localStorage** is namespaced by `CONFIG.STORAGE_KEY` (versioned). Bump the
  version to force-reset saved players/progress on a breaking change.
- **Validate after any data change:** `python3 scripts/validate.py` (0 issues
  expected: 100 films, 6 unique clues each, clue 6 = hero, category targets).

## The clue formula (applies to every movie)

- Clues 1–2: broad character artists — prolific, NOT iconic for THIS film.
- Clues 3–4: actors famous FOR this film.
- Clues 5–6: the leads; clue 6 = the hero.

## Docs

- `docs/runbook-add-movies.md` — discover films, verify casts, build clues.
- `docs/runbook-fetch-assets.md` — fetch + crop actor photos and posters.
- `docs/data-model.md` — JSON schemas and how the app resolves photos/posters.
