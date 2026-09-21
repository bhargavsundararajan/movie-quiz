// Pure scoring helpers. Decaying points by number of clues revealed at guess.
import { CONFIG } from './config.js';

/**
 * Points for a correct guess made after `cluesRevealed` clues (1-based).
 * Clamped to the configured schedule; 0 if none/invalid.
 */
export function pointsForGuess(cluesRevealed) {
  if (!Number.isInteger(cluesRevealed) || cluesRevealed < 1) return 0;
  const table = CONFIG.SCORE_BY_CLUE;
  const idx = Math.min(cluesRevealed, table.length) - 1;
  return table[idx];
}
