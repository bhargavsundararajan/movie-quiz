// Animated post-round standings: counts the scorer's points up and, if ranks
// changed, slides rows to their new positions with a playful overshoot (FLIP).
import { el } from './dom.js';

const medal = (i) => ['🥇', '🥈', '🥉'][i] || `${i + 1}`;

function buildRow(player, score, rankIndex) {
  const row = el('li', { class: 'sb-row', attrs: { 'data-id': player.id } }, [
    el('span', { class: 'sb-rank', text: medal(rankIndex) }),
    el('span', { class: 'sb-name', text: player.name }),
    el('span', { class: 'sb-score', text: String(score) }),
  ]);
  return row;
}

function countUp(node, from, to, ms = 800) {
  if (from === to) return;
  const start = performance.now();
  const tick = (now) => {
    const t = Math.min(1, (now - start) / ms);
    const eased = 1 - Math.pow(1 - t, 3); // easeOutCubic
    node.textContent = String(Math.round(from + (to - from) * eased));
    if (t < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function floatPoints(row, points) {
  const chip = el('span', { class: 'float-pts', text: `+${points}` });
  row.append(chip);
  setTimeout(() => chip.remove(), 1500);
}

/**
 * @param {HTMLElement} container
 * @param {{id:string,name:string,score:number}[]} players  final (post-award) scores
 * @param {{scorerId:string, points:number}|null} award
 */
export function renderScoreboard(container, players, award) {
  const byName = (a, b) => a.name.localeCompare(b.name);
  const preScore = (p) => (award && p.id === award.scorerId ? p.score - award.points : p.score);
  const preSorted = [...players].sort((a, b) => preScore(b) - preScore(a) || byName(a, b));
  const finalSorted = [...players].sort((a, b) => b.score - a.score || byName(a, b));

  const list = el('ol', { class: 'scoreboard' });
  const rowById = new Map();
  preSorted.forEach((p, i) => {
    const row = buildRow(p, preScore(p), i);
    rowById.set(p.id, row);
    list.append(row);
  });
  container.append(el('h3', { class: 'sb-title', text: 'Standings' }), list);

  if (!award || !award.points) return; // static standings

  // FLIP — record start positions before reordering.
  const first = new Map();
  rowById.forEach((row, id) => first.set(id, row.getBoundingClientRect().top));

  finalSorted.forEach((p, i) => {
    const row = rowById.get(p.id);
    list.append(row); // reorder to final
    row.querySelector('.sb-rank').textContent = medal(i);
  });

  requestAnimationFrame(() => {
    rowById.forEach((row, id) => {
      const dy = first.get(id) - row.getBoundingClientRect().top;
      row.style.transition = 'transform 0s';
      row.style.transform = `translateY(${dy}px)`;
    });
    requestAnimationFrame(() => {
      rowById.forEach((row) => {
        // Overshoot easing = bouncy, non-robotic movement.
        row.style.transition = 'transform .75s cubic-bezier(.34,1.56,.64,1)';
        row.style.transform = '';
      });
    });
  });

  const scorer = players.find((p) => p.id === award.scorerId);
  const scorerRow = rowById.get(award.scorerId);
  scorerRow.classList.add('scored');
  countUp(scorerRow.querySelector('.sb-score'), scorer.score - award.points, scorer.score);
  floatPoints(scorerRow, award.points);
}
