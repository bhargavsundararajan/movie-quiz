// Loads and indexes the movie repository + actor photo mapping.
import { CONFIG } from './config.js';
import { slugify } from './slugify.js';

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

// ?data=demo (or ?data=<path>) loads an alternate movie set (e.g. for playtesting).
function resolveMoviesPath() {
  const p = new URLSearchParams(location.search).get('data');
  if (!p) return CONFIG.PATHS.movies;
  return p === 'demo' ? 'data/movies.demo.json' : p;
}

/**
 * @returns {Promise<{movies: object[], photoForActor: (name:string)=>string, posterForMovie:(id:string)=>string}>}
 */
export async function loadRepository() {
  const [moviesDoc, actorList] = await Promise.all([
    fetchJson(resolveMoviesPath()),
    fetchJson(CONFIG.PATHS.actorSlugs).catch(() => []), // optional; fall back to slugify
  ]);

  const slugByName = new Map(actorList.map((a) => [a.name, a.slug]));
  const photoForActor = (name) =>
    CONFIG.PATHS.actorPhoto(slugByName.get(name) || slugify(name));
  const posterForMovie = (id) => CONFIG.PATHS.poster(id);

  return { movies: moviesDoc.movies, photoForActor, posterForMovie };
}

/** Fisher-Yates shuffle (returns a new array). */
export function shuffle(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
