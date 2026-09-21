// Menu screen: player roster, settings, controls, and the grid of round cards.
import { CONFIG } from '../config.js';
import { shuffle } from '../data.js';
import { el, mount } from './dom.js';
import { refreshSidebar } from './sidebar.js';

export function renderMenu(root, { state, repo, onPlay, onLeaderboard }) {
  const moviesById = new Map(repo.movies.map((m) => [m.id, m]));
  // Reconcile persisted order with the loaded dataset: drop unknown ids,
  // append any movies not yet ordered (keeps demo/main sets independent-safe).
  const kept = state.data.order.filter((id) => moviesById.has(id));
  const missing = repo.movies.map((m) => m.id).filter((id) => !kept.includes(id));
  if (missing.length || kept.length !== state.data.order.length) {
    state.setOrder(kept.concat(missing));
  }
  const orderedMovies = state.data.order.map((id) => moviesById.get(id)).filter(Boolean);
  // Stable per-movie number (file order) so a shuffle visibly rearranges the
  // numbered cards instead of the positional "Round 1,2,3…" looking unchanged.
  const numById = new Map(repo.movies.map((m, i) => [m.id, i + 1]));

  mount(
    root,
    el('header', { class: 'app-header' }, [
      el('h1', { text: 'Guess the Tamil Movie' }),
      el('p', {
        class: 'subtitle',
        text: `${state.visitedCount}/${repo.movies.length} rounds played`,
      }),
    ]),
    renderRoster(state),
    renderSettings(state, () => renderMenu(root, { state, repo, onPlay, onLeaderboard })),
    renderControls(state, orderedMovies, {
      onPlay,
      onLeaderboard,
      rerender: () => renderMenu(root, { state, repo, onPlay, onLeaderboard }),
    }),
    renderCards(state, orderedMovies, numById, onPlay)
  );
  refreshSidebar(); // keep the live rail in sync with roster/settings changes
}

function renderRoster(state) {
  const section = el('section', { class: 'panel roster' }, [el('h2', { text: 'Players' })]);
  const list = el('div', { class: 'player-list' });

  const refresh = () => {
    list.replaceChildren(
      ...state.players.map((p) =>
        el('div', { class: 'player-chip' }, [
          el('input', {
            class: 'player-name',
            value: p.name,
            attrs: { 'aria-label': 'Player name' },
            onchange: (e) => {
              state.renamePlayer(p.id, e.target.value);
              refreshSidebar();
            },
          }),
          el('button', {
            class: 'icon-btn',
            text: '✕',
            attrs: { title: 'Remove player' },
            onClick: () => {
              state.removePlayer(p.id);
              refresh();
              addBtn.disabled = false;
            },
          }),
        ])
      )
    );
    refreshSidebar();
  };

  const input = el('input', {
    class: 'text-input',
    attrs: { placeholder: 'Add player…', maxlength: '24' },
  });
  const addBtn = el('button', {
    class: 'btn',
    text: 'Add',
    onClick: () => {
      if (state.addPlayer(input.value)) {
        input.value = '';
        refresh();
      }
      addBtn.disabled = state.players.length >= CONFIG.MAX_PLAYERS;
    },
  });
  input.addEventListener('keydown', (e) => e.key === 'Enter' && addBtn.click());

  section.append(list, el('div', { class: 'row' }, [input, addBtn]),
    el('p', { class: 'hint', text: `Up to ${CONFIG.MAX_PLAYERS} players. Optional — leave empty for casual play.` }));
  refresh();
  return section;
}

function renderSettings(state, rerender) {
  const toggle = (key, label) =>
    el('label', { class: 'toggle' }, [
      el('input', {
        type: 'checkbox',
        checked: state.settings[key],
        onchange: (e) => {
          state.setSetting(key, e.target.checked);
          rerender();
        },
      }),
      el('span', { text: label }),
    ]);
  const roundLimit = el('label', { class: 'toggle' }, [
    el('span', { text: 'Rounds (0 = all)' }),
    el('input', {
      type: 'number',
      class: 'text-input num',
      value: String(state.settings.roundLimit || 0),
      attrs: { min: '0', max: '100', 'aria-label': 'Number of rounds' },
      onchange: (e) => {
        state.setSetting('roundLimit', Math.max(0, parseInt(e.target.value, 10) || 0));
        rerender();
      },
    }),
  ]);
  return el('section', { class: 'panel settings' }, [
    el('h2', { text: 'Settings' }),
    el('div', { class: 'row' }, [
      toggle('scoring', 'Scoring on'),
      toggle('showCategory', 'Show category on cards'),
      toggle('multiGuess', 'Multiple guesses per clue'),
      roundLimit,
    ]),
  ]);
}

function renderControls(state, orderedMovies, { onPlay, onLeaderboard, rerender }) {
  const unvisited = orderedMovies.filter((m) => !state.isVisited(m.id));
  return el('section', { class: 'panel controls row' }, [
    el('button', {
      class: 'btn primary',
      text: `Play random unvisited (${unvisited.length})`,
      disabled: unvisited.length === 0,
      onClick: () => onPlay(shuffle(unvisited)[0]),
    }),
    el('button', {
      class: 'btn',
      text: 'Shuffle order',
      onClick: () => {
        state.setOrder(shuffle(orderedMovies.map((m) => m.id)));
        rerender();
      },
    }),
    el('button', { class: 'btn', text: 'Leaderboard', onClick: onLeaderboard }),
    el('button', {
      class: 'btn',
      text: 'New game',
      onClick: () => {
        if (confirm('Start a new game? The current game is auto-saved and can be reloaded via Load.')) {
          state.newGame();
          rerender();
        }
      },
    }),
    el('button', { class: 'btn', text: `Load (${state.listSaves().length})`, onClick: () => showLoadModal(state, rerender) }),
  ]);
}

function showLoadModal(state, rerender) {
  const saves = state.listSaves();
  const overlay = el('div', { class: 'modal-overlay' });
  const body = el('div', { class: 'modal' }, [el('h3', { text: 'Load a saved game' })]);
  if (!saves.length) body.append(el('p', { class: 'hint', text: 'No saved games yet. "New game" archives the current one here.' }));
  saves.forEach((s) => {
    body.append(
      el('div', { class: 'row save-row' }, [
        el('div', { class: 'save-info' }, [
          el('div', { text: s.name }),
          el('div', { class: 'hint', text: `${s.summary} · ${new Date(s.savedAt).toLocaleString()}` }),
        ]),
        el('button', { class: 'btn primary', text: 'Load', onClick: () => { state.loadSave(s.id); overlay.remove(); rerender(); } }),
        el('button', { class: 'icon-btn', text: '✕', attrs: { title: 'Delete save' }, onClick: () => { if (confirm('Delete this save?')) { state.deleteSave(s.id); overlay.remove(); showLoadModal(state, rerender); } } }),
      ])
    );
  });
  body.append(el('button', { class: 'btn ghost', text: 'Close', onClick: () => overlay.remove() }));
  overlay.append(body);
  document.body.append(overlay);
}

function renderCards(state, orderedMovies, numById, onPlay) {
  const grid = el('section', { class: 'card-grid' });
  orderedMovies.forEach((m) => {
    const visited = state.isVisited(m.id);
    grid.append(
      el('button', {
        class: `round-card${visited ? ' visited' : ''}`,
        onClick: () => onPlay(m),
      }, [
        el('span', { class: 'round-num', text: `#${numById.get(m.id)}` }),
        state.settings.showCategory
          ? el('span', { class: 'round-cat', text: m.category.replace('_', ' ') })
          : null,
        visited ? el('span', { class: 'badge', text: '✓ played' }) : null,
      ])
    );
  });
  return grid;
}
