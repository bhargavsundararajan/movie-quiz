// App controller: loads the repository, owns AppState, routes between screens.
import { loadRepository, shuffle } from './data.js';
import { AppState } from './state.js';
import { renderMenu } from './ui/menu.js';
import { renderRound } from './ui/round.js';
import { renderLeaderboard } from './ui/leaderboard.js';
import { mountSidebar, refreshSidebar } from './ui/sidebar.js';
import { el, mount } from './ui/dom.js';

const root = document.getElementById('app');
const state = new AppState();

function showMenu(repo) {
  renderMenu(root, {
    state,
    repo,
    onPlay: (movie) => showRound(repo, movie),
    onLeaderboard: () => showLeaderboard(repo),
  });
  refreshSidebar();
}

// Next movie: random among unvisited; null when the round limit is hit or all played.
function pickNext(repo) {
  const limit = state.settings.roundLimit || 0;
  if (limit > 0 && state.visitedCount >= limit) return null; // game over
  const unvisited = repo.movies.filter((m) => !state.isVisited(m.id));
  return unvisited.length ? shuffle(unvisited)[0] : null;
}

function showRound(repo, movie) {
  renderRound(root, {
    state,
    repo,
    movie,
    onExit: () => showMenu(repo),
    onNext: () => {
      const next = pickNext(repo);
      next ? showRound(repo, next) : showLeaderboard(repo);
    },
  });
  refreshSidebar();
}

function showLeaderboard(repo) {
  renderLeaderboard(root, { state, onBack: () => showMenu(repo) });
  refreshSidebar();
}

function setupFullscreen() {
  const btn = el('button', {
    class: 'fs-btn',
    attrs: { title: 'Toggle fullscreen', 'aria-label': 'Toggle fullscreen' },
    text: '⛶',
    onClick: () => {
      if (document.fullscreenElement) document.exitFullscreen();
      else document.documentElement.requestFullscreen?.();
    },
  });
  document.addEventListener('fullscreenchange', () => {
    btn.classList.toggle('active', !!document.fullscreenElement);
  });
  document.body.append(btn);
}

(async function boot() {
  try {
    setupFullscreen();
    const repo = await loadRepository();
    if (!repo.movies?.length) throw new Error('No movies in repository');
    mountSidebar(state);
    showMenu(repo);
  } catch (err) {
    mount(
      root,
      el('div', { class: 'panel error' }, [
        el('h2', { text: 'Could not load the game' }),
        el('p', { text: String(err.message || err) }),
        el('p', {
          class: 'hint',
          text: 'Serve the folder over HTTP (npm run serve) — opening index.html directly blocks data loading.',
        }),
      ])
    );
  }
})();
