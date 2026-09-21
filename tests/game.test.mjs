import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RoundSession } from '../src/game.js';

const movie = {
  title: 'Ghilli',
  answers: ['ghilli', 'gilli'],
  clues: ['A', 'B', 'C', 'D', 'E', 'F'],
};

test('starts with one clue revealed and playing', () => {
  const r = new RoundSession(movie);
  assert.equal(r.cluesRevealed, 1);
  assert.equal(r.status, 'playing');
  assert.equal(r.pointsIfCorrectNow(), 6);
});

test('revealNext advances and clamps at total', () => {
  const r = new RoundSession(movie);
  for (let i = 0; i < 10; i++) r.revealNext();
  assert.equal(r.cluesRevealed, 6);
  assert.ok(r.allRevealed);
});

test('correct guess awards decaying points and locks', () => {
  const r = new RoundSession(movie);
  r.revealNext(); // 2 clues
  r.revealNext(); // 3 clues
  const res = r.guess('Ghili'); // fuzzy
  assert.ok(res.correct);
  assert.equal(res.points, 4); // 3 clues -> 4 pts
  assert.equal(r.status, 'solved');
  assert.equal(r.cluesRevealed, 6); // all revealed on success
  assert.deepEqual(r.guess('ghilli'), { correct: false, locked: true });
});

test('wrong guess keeps playing', () => {
  const r = new RoundSession(movie);
  assert.deepEqual(r.guess('mankatha'), { correct: false });
  assert.equal(r.status, 'playing');
});

test('giveUp reveals all with no points', () => {
  const r = new RoundSession(movie);
  r.giveUp();
  assert.equal(r.status, 'revealed');
  assert.ok(r.allRevealed);
  assert.ok(r.finished);
});
