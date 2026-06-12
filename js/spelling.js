let spellingState = {};

function startSpelling() {
  spellingState = {
    rounds: shuffle([...SPELLING_WORDS]).slice(0, 6),
    currentRound: 0,
    score: 0,
    currentWord: '',
    typed: [],
    tiles: [],
  };
  showScreen('screen-spelling');
  renderSpellingRound();
}

function renderSpellingRound() {
  const s = spellingState;
  if (s.currentRound >= s.rounds.length) {
    showResult('spelling', s.score, s.rounds.length);
    return;
  }

  const data = s.rounds[s.currentRound];
  s.currentWord = data.word;
  s.typed = [];

  const wordLetters = data.word.split('');
  const pool = 'abcdefghijklmnopqrstuvwxyz'.split('').filter(l => !wordLetters.includes(l));
  const extras = shuffle(pool).slice(0, 2);
  s.tiles = shuffle([...wordLetters, ...extras]).map((letter, id) => ({ letter, id, used: false }));

  document.getElementById('spelling-progress').textContent = (s.currentRound + 1) + ' / ' + s.rounds.length;
  document.getElementById('spelling-emoji').textContent = data.emoji;
  document.getElementById('spelling-hint').textContent = data.hint;

  renderSpellingBoard();
  setTimeout(() => speak(data.word, 0.65), 400);
}

function renderSpellingBoard() {
  const s = spellingState;

  const slotsEl = document.getElementById('spelling-slots');
  slotsEl.innerHTML = '';
  for (let i = 0; i < s.currentWord.length; i++) {
    const slot = document.createElement('div');
    slot.className = 'letter-slot' + (s.typed[i] ? ' filled' : '');
    slot.dataset.index = i;
    if (s.typed[i]) {
      slot.textContent = s.typed[i].letter;
      slot.onclick = () => removeSpellingLetter(i);
    }
    slotsEl.appendChild(slot);
  }

  const tilesEl = document.getElementById('spelling-tiles');
  tilesEl.innerHTML = '';
  s.tiles.forEach(tile => {
    const btn = document.createElement('button');
    btn.className = 'letter-tile' + (tile.used ? ' used' : '');
    btn.textContent = tile.letter;
    btn.disabled = tile.used;
    btn.onclick = () => addSpellingLetter(tile);
    tilesEl.appendChild(btn);
  });
}

function addSpellingLetter(tile) {
  const s = spellingState;
  if (s.typed.length >= s.currentWord.length || tile.used) return;
  tile.used = true;
  s.typed.push(tile);
  renderSpellingBoard();
  if (s.typed.length === s.currentWord.length) setTimeout(checkSpelling, 350);
}

function removeSpellingLetter(index) {
  const s = spellingState;
  const removed = s.typed.splice(index);
  removed.forEach(t => t.used = false);
  renderSpellingBoard();
}

function checkSpelling() {
  const s = spellingState;
  const typed = s.typed.map(t => t.letter).join('');
  const isCorrect = typed === s.currentWord;

  const slots = document.querySelectorAll('.letter-slot');
  slots.forEach(slot => slot.classList.add(isCorrect ? 'correct' : 'wrong'));
  document.querySelectorAll('.letter-tile').forEach(b => b.disabled = true);

  if (isCorrect) {
    s.score++;
    playTone('correct');
    speak(`Excellent! ${s.currentWord}!`);
  } else {
    playTone('wrong');
    speak(`The word is ${s.currentWord}.`, 0.8);
    setTimeout(() => {
      document.querySelectorAll('.letter-slot').forEach((slot, i) => {
        slot.textContent = s.currentWord[i];
        slot.className = 'letter-slot filled hint';
        slot.onclick = null;
      });
    }, 900);
  }

  setTimeout(() => {
    s.currentRound++;
    renderSpellingRound();
  }, 2600);
}

function replaySpellingWord() {
  const data = spellingState.rounds?.[spellingState.currentRound];
  if (data) speak(data.word, 0.65);
}
