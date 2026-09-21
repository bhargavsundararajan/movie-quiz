# Guess the Tamil Movie 🎬

A single-device party game. Each round reveals photos of a film's cast one clue
at a time (broad character artists first, superstars last); players guess the
movie. Correct guesses reveal the poster and award decaying points to whoever
got it.

## Quick start

No build step. Serve the folder over HTTP (opening `index.html` via `file://`
blocks data loading):

```bash
npm run serve      # → http://localhost:8000   (python3 -m http.server)
```

Run the logic tests:

```bash
npm test           # node --test
```

## Deploy to GitHub Pages

Static site, no build step — Pages serves the repo as-is. All asset paths are
relative, so it works from a project subpath (`https://<user>.github.io/movie-quiz/`).

1. Create a repo and push this folder to `main`.
2. Repo → **Settings → Pages** → Source: **Deploy from a branch**, Branch:
   **`main`** / folder **`/ (root)`** → Save.
3. Wait for the build, then open the URL Pages shows.

The `.nojekyll` file disables Jekyll so the `src/`, `assets/`, and `data/`
folders are served verbatim (nothing is stripped). Progress is per-browser
(`localStorage`), so each visitor gets their own game state.

## How to play

- **Menu** – add up to 10 players, pick a round card (blind by default), or
  "Play random unvisited". Toggle scoring / category hints in Settings.
- **Round** – `Space` reveals the next clue, type a guess and press `Enter`.
  Guessing is fuzzy + case/diacritic-insensitive. On a correct guess the poster
  is revealed and you pick **who got it** to award points
  (6 pts after 1 clue … 1 pt after 6). "Reveal answer" gives up. `Esc` exits.
- **Leaderboard** – standings; also the end-of-game / pause view.

Progress, players, scores and settings persist in `localStorage`.

## Project structure

```
index.html            # shell, loads src/main.js as a module
styles/main.css        # theme
src/
  config.js            # all tunable constants (scoring, thresholds, paths)
  slugify.js           # actor-name → photo-filename (matches the asset pipeline)
  fuzzy.js             # normalize + Levenshtein + isCorrectGuess   (pure)
  scoring.js           # decaying points                            (pure)
  data.js              # loads movies.json + actor→photo mapping
  storage.js           # localStorage wrapper
  state.js             # AppState: players, visited, settings, order (persisted)
  game.js              # RoundSession: reveal/guess/score lifecycle (pure)
  ui/
    dom.js             # tiny element helpers
    menu.js  round.js  leaderboard.js
  main.js              # controller: loads repo, routes screens
data/
  movies.json          # the repository (100 films, verified) — source of truth
  actors_list.json     # unique actors + slug (photo filename) mapping
tools|scripts/         # Python asset pipeline (fetch + crop photos/posters)
assets/actors/<slug>.jpg   assets/posters/<movieId>.jpg
tests/                 # node:test unit tests for the pure logic
```

## Data model (`data/movies.json`)

```json
{ "meta": { ... },
  "movies": [
    { "id": "ghilli-2004", "title": "Ghilli", "year": 2004,
      "category": "superstar", "hero": "Vijay",
      "answers": ["ghilli", "gilli"],       // accepted guesses (fuzzy-matched)
      "clues": ["...6 actor names in reveal order..."],
      "poster_query": "..." } ] }
```

Photos are resolved by actor name → slug (`actors_list.json`, else `slugify`) →
`assets/actors/<slug>.jpg`. Posters → `assets/posters/<movie id>.jpg`. Missing
images degrade gracefully (name-only tile / hidden poster).

## Extending

The pure modules (`fuzzy`, `scoring`, `game`, `state`) hold no DOM and are unit
tested — extend them and add tests in `tests/`. Common changes:

- **Scoring / rules** → `src/config.js` (`SCORE_BY_CLUE`, `FUZZY_THRESHOLD`,
  `WRONG_GUESS_COOLDOWN_MS`, `CLUES_PER_MOVIE`).
- **New screen / mechanic** → add a `src/ui/*.js` renderer and route it from
  `src/main.js`; read/mutate through `AppState`.
- **Timers, difficulty, teams, sound, PWA/offline** → layer on top; state is a
  single persisted object, so new fields are additive.

Runs fully offline once assets are local; add a service worker to install as a PWA.
```
