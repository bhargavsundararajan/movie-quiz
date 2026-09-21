// Leaderboard / end-of-game standings.
import { el, mount } from './dom.js';
import { refreshSidebar } from './sidebar.js';

function renderHistory(state) {
  const log = state.log;
  const section = el('section', { class: 'panel history-panel' }, [
    el('h2', { text: `Guess history (${log.length})` }),
  ]);
  if (!log.length) {
    section.append(el('p', { class: 'hint', text: 'No guesses recorded yet.' }));
    return section;
  }
  section.append(
    el(
      'ul',
      { class: 'history' },
      log
        .slice()
        .reverse()
        .map((e) =>
          el('li', { class: e.adjust ? 'h-adj' : e.correct ? 'h-ok' : 'h-no' }, [
            el('span', { class: 'h-icon', text: e.adjust ? '±' : e.correct ? '✓' : '✗' }),
            el('span', { class: 'h-who', text: e.playerName }),
            el('span', { class: 'h-movie', text: e.adjust ? 'manual adjustment' : e.movieTitle || e.movieId }),
            el('span', { class: 'h-meta', text: e.adjust ? `${e.points > 0 ? '+' : ''}${e.points}` : `clue ${e.clue} · ${e.points > 0 ? '+' : ''}${e.points}` }),
          ])
        )
    )
  );
  return section;
}

export function renderLeaderboard(root, { state, onBack }) {
  const ranked = [...state.players].sort((a, b) => b.score - a.score);
  const medals = ['🥇', '🥈', '🥉'];

  mount(
    root,
    el('header', { class: 'app-header' }, [el('h1', { text: 'Leaderboard' })]),
    ranked.length
      ? el(
          'ol',
          { class: 'leaderboard' },
          ranked.map((p, i) => {
            const amt = el('input', {
              type: 'number', class: 'text-input num adj-amt', value: '1',
              attrs: { min: '0', 'aria-label': `Points to adjust for ${p.name}` },
            });
            const apply = (sign) => {
              const n = Math.abs(parseInt(amt.value, 10) || 0);
              if (!n) return;
              state.adjustScore(p.id, sign * n);
              refreshSidebar();
              renderLeaderboard(root, { state, onBack });
            };
            return el('li', { class: `lb-row${i === 0 && p.score > 0 ? ' leader' : ''}` }, [
              el('span', { class: 'lb-rank', text: medals[i] || `${i + 1}.` }),
              el('span', { class: 'lb-name', text: p.name }),
              el('span', { class: 'lb-score', text: `${p.score}` }),
              el('span', { class: 'lb-adjust' }, [
                el('button', { class: 'icon-btn', text: '−', attrs: { title: 'Subtract' }, onClick: () => apply(-1) }),
                amt,
                el('button', { class: 'icon-btn', text: '+', attrs: { title: 'Add' }, onClick: () => apply(1) }),
              ]),
            ]);
          })
        )
      : el('p', { class: 'hint', text: 'No players added — scores are not tracked in casual mode.' }),
    renderHistory(state),
    el('div', { class: 'row' }, [
      el('button', { class: 'btn primary', text: '← Back to menu', onClick: onBack }),
      ranked.length
        ? el('button', {
            class: 'btn danger',
            text: 'Reset scores',
            onClick: () => {
              if (confirm('Reset all player scores to zero?')) {
                state.resetScores();
                renderLeaderboard(root, { state, onBack });
              }
            },
          })
        : null,
    ])
  );
}
