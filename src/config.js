// Central game configuration. Tweak here; nothing else hard-codes these values.
export const CONFIG = Object.freeze({
  CLUES_PER_MOVIE: 6,
  // Decaying score: points awarded = SCORE_BY_CLUE[cluesRevealed - 1].
  // Guess after 1 clue = 6 pts ... after 6 clues = 1 pt.
  SCORE_BY_CLUE: [6, 5, 4, 3, 2, 1],
  // Points deducted from a player for a wrong guess. Each player may guess
  // only once per clue (reset when the next clue is revealed).
  PENALTY_PER_WRONG_GUESS: 1,
  MAX_PLAYERS: 10,
  WRONG_GUESS_COOLDOWN_MS: 1500,
  // Fuzzy match: accept if normalized Levenshtein similarity >= this (0..1).
  FUZZY_THRESHOLD: 0.82,
  // Menu cards hidden by default so the host/player can't see answers.
  SHOW_CATEGORY_ON_CARDS: false,
  SCORING_ENABLED_DEFAULT: true,
  // When true: players may guess multiple times per clue and the next clue is
  // NOT auto-revealed once everyone has guessed. Default false = one guess/clue.
  MULTI_GUESS_DEFAULT: false,
  // 0 = unlimited (play all); >0 = game ends after that many rounds, movies random.
  ROUND_LIMIT_DEFAULT: 0,
  PATHS: {
    movies: 'data/movies.json',
    actorSlugs: 'data/actors_list.json',
    actorPhoto: (slug) => `assets/actors/${slug}.jpg`,
    poster: (movieId) => `assets/posters/${movieId}.jpg`,
  },
  STORAGE_KEY: 'tamil-movie-quiz/v1',
});
