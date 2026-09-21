// Persistent application state: players, visited rounds, settings, card order.
// All mutations auto-persist. UI reads `.data` and calls mutators.
import { CONFIG } from './config.js';
import { loadState, saveState, clearState } from './storage.js';

const uid = () => Math.random().toString(36).slice(2, 9);

const SAVES_KEY = CONFIG.STORAGE_KEY + '/saves';

const defaults = () => ({
  version: 1,
  startedAt: Date.now(),
  players: [],
  visited: {},
  settings: {
    scoring: CONFIG.SCORING_ENABLED_DEFAULT,
    showCategory: CONFIG.SHOW_CATEGORY_ON_CARDS,
    multiGuess: CONFIG.MULTI_GUESS_DEFAULT,
    roundLimit: CONFIG.ROUND_LIMIT_DEFAULT,
  },
  order: [],
  log: [], // guess history: {movieId, movieTitle, playerId, playerName, correct, clue, points, at}
});

export class AppState {
  constructor() {
    this.data = { ...defaults(), ...(loadState() || {}) };
  }

  _persist() {
    saveState(this.data);
  }

  // ---- players ----
  get players() {
    return this.data.players;
  }
  addPlayer(name) {
    name = (name || '').trim();
    if (!name || this.players.length >= CONFIG.MAX_PLAYERS) return false;
    this.players.push({ id: uid(), name, score: 0 });
    this._persist();
    return true;
  }
  renamePlayer(id, name) {
    const p = this.players.find((x) => x.id === id);
    if (p && name.trim()) p.name = name.trim();
    this._persist();
  }
  removePlayer(id) {
    this.data.players = this.players.filter((p) => p.id !== id);
    this._persist();
  }
  awardPoints(id, pts) {
    const p = this.players.find((x) => x.id === id);
    if (p) p.score += pts;
    this._persist();
  }
  resetScores() {
    this.players.forEach((p) => (p.score = 0));
    this._persist();
  }
  /** Manual host override: add/subtract points and log it. */
  adjustScore(id, delta) {
    const p = this.players.find((x) => x.id === id);
    if (!p || !delta) return;
    p.score += delta;
    this.logGuess({ adjust: true, playerId: id, playerName: p.name, points: delta });
  }

  // ---- rounds / progress ----
  isVisited(movieId) {
    return !!this.data.visited[movieId];
  }
  markVisited(movieId) {
    this.data.visited[movieId] = true;
    this._persist();
  }
  get visitedCount() {
    return Object.keys(this.data.visited).length;
  }
  setOrder(ids) {
    this.data.order = ids;
    this._persist();
  }
  resetProgress() {
    this.data.visited = {};
    this.resetScores();
    this._persist();
  }

  // ---- settings ----
  get settings() {
    return this.data.settings;
  }
  setSetting(key, value) {
    this.data.settings[key] = value;
    this._persist();
  }

  // ---- guess log ----
  logGuess(entry) {
    (this.data.log ||= []).push({ ...entry, at: Date.now() });
    this._persist();
  }
  get log() {
    return this.data.log || [];
  }

  // ---- saved games (auto-save is _persist; these add snapshots + load) ----
  _saves() {
    try {
      return JSON.parse(localStorage.getItem(SAVES_KEY) || '[]');
    } catch {
      return [];
    }
  }
  _setSaves(arr) {
    try {
      localStorage.setItem(SAVES_KEY, JSON.stringify(arr.slice(0, 20)));
    } catch {
      /* ignore */
    }
  }
  listSaves() {
    return this._saves().map(({ id, name, savedAt, summary }) => ({ id, name, savedAt, summary }));
  }
  /** Archive the current game (if it has any progress) as a named snapshot. */
  snapshot(name) {
    if (!this.players.length && !this.visitedCount) return null;
    const label =
      name || `${new Date(this.data.startedAt || Date.now()).toLocaleString()}`;
    const entry = {
      id: uid(),
      name: label,
      savedAt: Date.now(),
      summary: `${this.players.length} players · ${this.visitedCount} played`,
      data: JSON.parse(JSON.stringify(this.data)),
    };
    const arr = this._saves();
    arr.unshift(entry);
    this._setSaves(arr);
    return entry.id;
  }
  loadSave(id) {
    const s = this._saves().find((x) => x.id === id);
    if (!s) return false;
    this.data = { ...defaults(), ...JSON.parse(JSON.stringify(s.data)) };
    this._persist();
    return true;
  }
  deleteSave(id) {
    this._setSaves(this._saves().filter((x) => x.id !== id));
  }
  /** Snapshot the current game, then reset to a fresh one. */
  newGame() {
    this.snapshot();
    this.data = defaults();
    this._persist();
  }

  hardReset() {
    clearState();
    this.data = defaults();
  }
}
