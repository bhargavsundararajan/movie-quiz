// Per-round game logic (DOM-free, unit-testable).
import { CONFIG } from './config.js';
import { isCorrectGuess } from './fuzzy.js';
import { pointsForGuess } from './scoring.js';

/** Lifecycle: 'playing' -> 'solved' (guessed) | 'revealed' (gave up). */
export class RoundSession {
  constructor(movie) {
    this.movie = movie;
    this.cluesRevealed = 1; // first clue is shown on start
    this.status = 'playing';
  }

  get totalClues() {
    return Math.min(CONFIG.CLUES_PER_MOVIE, this.movie.clues.length);
  }
  get allRevealed() {
    return this.cluesRevealed >= this.totalClues;
  }
  /** Points a correct guess would earn right now. */
  pointsIfCorrectNow() {
    return pointsForGuess(this.cluesRevealed);
  }

  revealNext() {
    if (this.status === 'playing' && !this.allRevealed) this.cluesRevealed++;
    return this.cluesRevealed;
  }

  /** @returns {{correct:boolean, locked?:boolean, points?:number}} */
  guess(text) {
    if (this.status !== 'playing') return { correct: false, locked: true };
    if (isCorrectGuess(text, this.movie.answers)) {
      const points = this.pointsIfCorrectNow();
      this.status = 'solved';
      this.cluesRevealed = this.totalClues; // reveal everything on success
      return { correct: true, points };
    }
    return { correct: false };
  }

  giveUp() {
    if (this.status === 'playing') {
      this.status = 'revealed';
      this.cluesRevealed = this.totalClues;
    }
  }

  get finished() {
    return this.status !== 'playing';
  }
}
