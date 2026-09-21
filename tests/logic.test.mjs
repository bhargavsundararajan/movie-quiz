// Unit tests for the pure logic (fuzzy matching + scoring).
// Run with: node --test
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalize, levenshtein, similarity, isCorrectGuess } from '../src/fuzzy.js';
import { pointsForGuess } from '../src/scoring.js';

test('normalize strips case, punctuation, diacritics', () => {
  assert.equal(normalize('  Ghilli!! '), 'ghilli');
  assert.equal(normalize('Vinnaithaandi Varuvaayaa'), 'vinnaithaandi varuvaayaa');
  assert.equal(normalize('96'), '96');
});

test('levenshtein basics', () => {
  assert.equal(levenshtein('ghilli', 'ghilli'), 0);
  assert.equal(levenshtein('ghilli', 'gilli'), 1);
  assert.equal(levenshtein('', 'abc'), 3);
});

test('similarity is 1 for identical, lower for edits', () => {
  assert.equal(similarity('abc', 'abc'), 1);
  assert.ok(similarity('ghilli', 'gilli') > 0.8);
});

test('isCorrectGuess: exact, case-insensitive, misspelled', () => {
  const answers = ['ghilli', 'gilli'];
  assert.ok(isCorrectGuess('Ghilli', answers));
  assert.ok(isCorrectGuess('GILLI', answers));
  assert.ok(isCorrectGuess('ghili', answers)); // one typo -> fuzzy
  assert.ok(!isCorrectGuess('mankatha', answers));
});

test('isCorrectGuess: containment guards articles/suffixes', () => {
  assert.ok(isCorrectGuess('the ghilli', ['ghilli']));
});

test('isCorrectGuess: a fragment of the answer must NOT match', () => {
  assert.ok(!isCorrectGuess('cha', ['chandramukhi']));
  assert.ok(!isCorrectGuess('chandra', ['chandramukhi']));
  assert.ok(!isCorrectGuess('man', ['mankatha']));
  assert.ok(!isCorrectGuess('vikram', ['vikram vedha'])); // one word of a two-word title
  // real answers still work:
  assert.ok(isCorrectGuess('chandramukhi', ['chandramukhi']));
  assert.ok(isCorrectGuess('chandramuki', ['chandramukhi'])); // 1 typo -> fuzzy
});

test('isCorrectGuess: empty guess never matches', () => {
  assert.ok(!isCorrectGuess('', ['ghilli']));
  assert.ok(!isCorrectGuess('   ', ['ghilli']));
});

test('pointsForGuess follows decaying schedule', () => {
  assert.equal(pointsForGuess(1), 6);
  assert.equal(pointsForGuess(6), 1);
  assert.equal(pointsForGuess(7), 1); // clamp
  assert.equal(pointsForGuess(0), 0);
});
