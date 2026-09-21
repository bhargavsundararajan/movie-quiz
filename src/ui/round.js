// Round screen: clue tiles revealed on click/Space, fuzzy guess box,
// poster + "who got it?" attribution on a correct guess.
import { CONFIG } from '../config.js';
import { RoundSession } from '../game.js';
import { el, mount } from './dom.js';
import { renderScoreboard } from './scoreboard.js';
import { refreshSidebar } from './sidebar.js';

export function renderRound(root, { state, repo, movie, onExit, onNext }) {
  const session = new RoundSession(movie);
  let awardedPoints = 0;
  let guessClue = 1; // clues revealed at the moment of the current guess
  const guessedThisClue = new Set(); // player ids who used their guess on the current clue
  const scoringPlayers = () => state.settings.scoring && state.players.length > 0;
  const multiGuess = () => !!state.settings.multiGuess;
  // In multi-guess mode there's no per-clue lock, so everyone is always available.
  const availablePlayers = () =>
    multiGuess() ? state.players : state.players.filter((p) => !guessedThisClue.has(p.id));

  function shake(msg) {
    guessInput.classList.remove('shake');
    void guessInput.offsetWidth; // restart animation
    guessInput.classList.add('shake');
    status.textContent = msg;
  }

  const tiles = movie.clues.map((name, i) => makeTile(name, i, repo));
  const grid = el('div', { class: 'clue-grid' }, tiles);

  const guessInput = el('input', {
    class: 'text-input guess',
    attrs: { placeholder: 'Guess the movie…', autocomplete: 'off', spellcheck: 'false' },
  });
  const revealBtn = el('button', { class: 'btn', text: 'Reveal next clue', onClick: doReveal });
  const guessBtn = el('button', { class: 'btn primary', text: 'Guess', onClick: doGuess });
  const giveUpBtn = el('button', { class: 'btn danger', text: 'Reveal answer', onClick: doGiveUp });
  const status = el('div', { class: 'status', attrs: { 'aria-live': 'polite' } });
  const result = el('div', { class: 'result' });

  guessInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doGuess();
  });

  function onKeydown(e) {
    if (e.target === guessInput) return;
    if (e.key === ' ') {
      e.preventDefault();
      doReveal();
    } else if (e.key === 'Escape') {
      exit();
    }
  }
  document.addEventListener('keydown', onKeydown);

  function exit() {
    document.removeEventListener('keydown', onKeydown);
    onExit();
  }

  function goNext() {
    document.removeEventListener('keydown', onKeydown);
    onNext();
  }

  function navRow() {
    return el('div', { class: 'row result-nav' }, [
      onNext ? el('button', { class: 'btn primary', text: 'Next round →', onClick: goNext }) : null,
      el('button', { class: 'btn', text: 'Back to menu', onClick: exit }),
    ]);
  }

  function paint() {
    tiles.forEach((t, i) => t.classList.toggle('revealed', i < session.cluesRevealed || session.finished));
    const shown = session.finished ? session.totalClues : session.cluesRevealed;
    revealBtn.disabled = session.finished || session.allRevealed;
    revealBtn.textContent = session.allRevealed ? 'All clues shown' : `Reveal next clue (${shown}/${session.totalClues})`;
    if (!session.finished) {
      status.textContent = state.settings.scoring
        ? `Worth ${session.pointsIfCorrectNow()} pts if guessed now`
        : '';
    }
  }

  function doReveal() {
    session.revealNext();
    guessedThisClue.clear(); // new clue → everyone may guess again
    guessInput.disabled = false;
    guessBtn.disabled = false;
    paint();
    guessInput.focus();
  }

  function doGuess() {
    if (session.finished) return;
    const text = guessInput.value.trim();
    if (!text) return;
    if (scoringPlayers() && availablePlayers().length === 0) {
      status.textContent = 'All players guessed this clue — reveal the next clue';
      return;
    }
    guessClue = session.cluesRevealed;
    const res = session.guess(text);
    if (res.locked) return;
    if (res.correct) {
      awardedPoints = res.points;
      finish(true);
      return;
    }
    // wrong guess
    guessInput.value = '';
    if (scoringPlayers()) {
      shake('Wrong — who guessed it?');
      showWhoGuessedWrong();
    } else {
      shake('Not quite — try again');
      guessInput.disabled = true;
      guessBtn.disabled = true;
      setTimeout(() => {
        guessInput.disabled = false;
        guessBtn.disabled = false;
        guessInput.focus();
      }, CONFIG.WRONG_GUESS_COOLDOWN_MS);
    }
  }

  function showWhoGuessedWrong() {
    const players = availablePlayers();
    if (!players.length) return;
    const P = CONFIG.PENALTY_PER_WRONG_GUESS;
    const modal = el('div', { class: 'modal-overlay' }, [
      el('div', { class: 'modal' }, [
        el('h3', { text: `Who guessed wrong? (−${P} pt)` }),
        el(
          'div',
          { class: 'who-grid' },
          players.map((p) =>
            el('button', {
              class: 'btn',
              text: p.name,
              onClick: () => {
                state.awardPoints(p.id, -P);
                state.logGuess({ movieId: movie.id, movieTitle: movie.title, playerId: p.id, playerName: p.name, correct: false, clue: session.cluesRevealed, points: -P });
                refreshSidebar();
                modal.remove();
                if (!multiGuess()) {
                  guessedThisClue.add(p.id);
                  if (availablePlayers().length === 0) {
                    guessInput.disabled = true;
                    guessBtn.disabled = true;
                    if (session.allRevealed) {
                      status.textContent = `−${P} to ${p.name} — no one got it`;
                      setTimeout(doGiveUp, 800); // last clue exhausted → reveal answer
                    } else {
                      status.textContent = `−${P} to ${p.name} — next clue!`;
                      setTimeout(doReveal, 800); // everyone guessed → auto-advance
                    }
                    return;
                  }
                }
                status.textContent = `−${P} to ${p.name}`;
                guessInput.focus();
              },
            })
          )
        ),
        el('button', { class: 'btn ghost', text: 'No one / cancel', onClick: () => modal.remove() }),
      ]),
    ]);
    root.append(modal);
  }

  function doGiveUp() {
    session.giveUp();
    finish(false);
  }

  function finish(solved) {
    state.markVisited(movie.id);
    paint();
    guessInput.disabled = true;
    guessBtn.disabled = true;
    giveUpBtn.disabled = true;
    if (solved) launchConfetti();

    const done = (award) => {
      const body = el('div', { class: 'modal results-modal' });
      body.append(
        el('h3', { class: 'results-title', text: solved ? `Correct! ${movie.title} 🎉` : movie.title })
      );
      const poster = el('img', {
        class: 'poster results-poster',
        attrs: { src: repo.posterForMovie(movie.id), alt: `${movie.title} poster` },
        onerror: (e) => e.target.remove(),
      });
      const contentRow = el('div', { class: 'results-body' }, [poster]);
      let sb = null;
      if (state.players.length) {
        sb = el('div', { class: 'scoreboard-wrap' });
        contentRow.append(sb);
      }
      body.append(contentRow, navRow());
      root.append(el('div', { class: 'modal-overlay' }, [body]));
      if (sb) renderScoreboard(sb, state.players, award); // measure after it's in the DOM
    };
    if (solved && state.settings.scoring && state.players.length) {
      showWhoGotIt(done);
    } else {
      done(null);
    }
  }

  function showWhoGotIt(done) {
    const modal = el('div', { class: 'modal-overlay' }, [
      el('div', { class: 'modal' }, [
        el('h3', { text: `Who got it? (+${awardedPoints} pts)` }),
        el(
          'div',
          { class: 'who-grid' },
          (availablePlayers().length ? availablePlayers() : state.players).map((p) =>
            el('button', {
              class: 'btn',
              text: p.name,
              onClick: () => {
                state.awardPoints(p.id, awardedPoints);
                state.logGuess({ movieId: movie.id, movieTitle: movie.title, playerId: p.id, playerName: p.name, correct: true, clue: guessClue, points: awardedPoints });
                refreshSidebar();
                modal.remove();
                done({ scorerId: p.id, points: awardedPoints });
              },
            })
          )
        ),
        el('button', {
          class: 'btn ghost',
          text: 'No one / skip',
          onClick: () => {
            modal.remove();
            done(null);
          },
        }),
      ]),
    ]);
    root.append(modal);
  }

  mount(
    root,
    el('div', { class: 'round-topbar' }, [
      el('button', { class: 'btn ghost', text: '← Menu', onClick: exit }),
      el('span', { class: 'hint', text: 'Space = next clue · Enter = guess · Esc = menu' }),
    ]),
    el('div', { class: 'round-actions row guess-row' }, [guessInput, guessBtn]),
    status,
    grid,
    el('div', { class: 'round-actions row' }, [revealBtn, giveUpBtn]),
    result
  );
  paint();
  guessInput.focus();
}

function makeTile(name, index, repo) {
  const img = el('img', {
    class: 'clue-photo',
    attrs: { src: repo.photoForActor(name), alt: '', loading: 'lazy' },
    onerror: (e) => {
      e.target.style.display = 'none';
      e.target.parentElement.classList.add('no-photo');
    },
  });
  return el('figure', { class: 'clue-tile' }, [
    el('div', { class: 'clue-face hidden-face', text: index + 1 }),
    img,
    el('figcaption', { class: 'clue-name', text: name }),
  ]);
}

function launchConfetti() {
  const layer = el('div', { class: 'confetti' });
  for (let i = 0; i < 60; i++) {
    layer.append(
      el('i', {
        style: `left:${Math.random() * 100}%;--d:${2 + Math.random() * 2}s;--x:${(Math.random() - 0.5) * 200}px;background:hsl(${Math.random() * 360},90%,60%)`,
      })
    );
  }
  document.body.append(layer);
  setTimeout(() => layer.remove(), 4500);
}
