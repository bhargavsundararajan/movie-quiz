// Fuzzy, case- and diacritic-insensitive answer matching.
// A guess matches a movie if, after normalization, it equals any accepted
// answer, is contained in / contains one, or is within the similarity threshold.
import { CONFIG } from './config.js';

/** Normalize free text for comparison: lowercase, strip diacritics & punctuation, collapse spaces. */
export function normalize(text) {
  return (text || '')
    .normalize('NFKD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Levenshtein edit distance between two strings. */
export function levenshtein(a, b) {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let cur = [i];
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = cur;
  }
  return prev[b.length];
}

/** Similarity ratio in [0,1] derived from edit distance. */
export function similarity(a, b) {
  if (!a.length && !b.length) return 1;
  return 1 - levenshtein(a, b) / Math.max(a.length, b.length);
}

/**
 * @param {string} guess raw user input
 * @param {string[]} answers accepted answers/aliases for the movie
 * @param {number} [threshold]
 * @returns {boolean}
 */
export function isCorrectGuess(guess, answers, threshold = CONFIG.FUZZY_THRESHOLD) {
  const g = normalize(guess);
  if (!g) return false;
  for (const ans of answers) {
    const a = normalize(ans);
    if (!a) continue;
    if (g === a) return true;
    // Accept when the guess CONTAINS the whole answer (e.g. "the ghilli"),
    // but never when the guess is merely a fragment of the answer ("cha").
    if (a.length >= 4 && g.includes(a)) return true;
    if (similarity(g, a) >= threshold) return true;
  }
  return false;
}
