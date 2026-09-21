// Thin, safe localStorage wrapper namespaced by CONFIG.STORAGE_KEY.
import { CONFIG } from './config.js';

export function loadState() {
  try {
    const raw = localStorage.getItem(CONFIG.STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* storage full / unavailable — game still works in-memory */
  }
}

export function clearState() {
  try {
    localStorage.removeItem(CONFIG.STORAGE_KEY);
  } catch {
    /* ignore */
  }
}
