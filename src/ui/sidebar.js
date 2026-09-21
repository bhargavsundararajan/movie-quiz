// Always-on live leaderboard rail. Reflects score changes (incl. negative)
// immediately — call refreshSidebar() after any awardPoints / screen change.
import { el, mount } from './dom.js';

let _state = null;
let _el = null;
const prevScores = new Map();

export function mountSidebar(state) {
  _state = state;
  _el = el('aside', { class: 'sidebar', id: 'sidebar' });
  document.body.append(_el);
  refreshSidebar();
}

export function refreshSidebar() {
  if (!_state || !_el) return;
  const players = _state.players;
  const has = players.length > 0;
  document.body.classList.toggle('has-sidebar', has);
  _el.style.display = has ? '' : 'none';
  if (!has) return;

  const ranked = [...players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  const limit = _state.settings.roundLimit || 0;
  const progress = limit ? `${_state.visitedCount} / ${limit}` : `${_state.visitedCount}`;

  mount(
    _el,
    el('div', { class: 'sb-head' }, [
      el('span', { text: 'Leaderboard' }),
      el('span', { class: 'sb-progress', text: `${progress} rounds` }),
    ]),
    el(
      'ol',
      { class: 'sidebar-list' },
      ranked.map((p, i) => {
        const changed = prevScores.has(p.id) && prevScores.get(p.id) !== p.score;
        const up = changed && p.score > prevScores.get(p.id);
        return el('li', { class: `sb-row${i === 0 ? ' leader' : ''}${changed ? (up ? ' bump-up' : ' bump-down') : ''}` }, [
          el('span', { class: 'sb-pos', text: `${i + 1}` }),
          el('span', { class: 'sb-nm', text: p.name }),
          el('span', { class: 'sb-sc', text: `${p.score}` }),
        ]);
      })
    )
  );
  players.forEach((p) => prevScores.set(p.id, p.score));
}
