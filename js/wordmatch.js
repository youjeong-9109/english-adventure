let wordMatchState = {};

function startWordMatch() {
  wordMatchState = {
    rounds: shuffle([...WORD_MATCH_DATA]).slice(0, 8),
    currentRound: 0,
    score: 0,
    answered: false,
  };
  showScreen('screen-wordmatch');
  renderWordMatchRound();
}

function renderWordMatchRound() {
  const s = wordMatchState;
  if (s.currentRound >= s.rounds.length) {
    showResult('wordmatch', s.score, s.rounds.length);
    return;
  }

  const correct = s.rounds[s.currentRound];
  s.answered = false;

  document.getElementById('wordmatch-progress').textContent = (s.currentRound + 1) + ' / ' + s.rounds.length;
  document.getElementById('wordmatch-emoji').textContent = correct.emoji;

  const distractors = shuffle(WORD_MATCH_DATA.filter(w => w.word !== correct.word))
    .slice(0, 3)
    .map(w => ({ word: w.word, correct: false }));
  const options = shuffle([{ word: correct.word, correct: true }, ...distractors]);

  const container = document.getElementById('wordmatch-options');
  container.innerHTML = '';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'word-option';
    btn.textContent = opt.word;
    btn.onclick = () => answerWordMatch(btn, opt.correct, correct, container);
    container.appendChild(btn);
  });

  setTimeout(() => speak(correct.word, 0.7), 300);
}

function answerWordMatch(btn, isCorrect, correct, container) {
  if (wordMatchState.answered) return;
  wordMatchState.answered = true;
  container.querySelectorAll('.word-option').forEach(b => b.disabled = true);

  if (isCorrect) {
    btn.classList.add('correct');
    wordMatchState.score++;
    playTone('correct');
    speak(`Correct! ${correct.word}!`);
  } else {
    btn.classList.add('wrong');
    playTone('wrong');
    container.querySelectorAll('.word-option').forEach(b => {
      if (b.textContent === correct.word) b.classList.add('correct');
    });
    speak(`It's ${correct.word}. ${correct.word}!`);
  }

  setTimeout(() => {
    wordMatchState.currentRound++;
    renderWordMatchRound();
  }, 2200);
}

function replayWordMatchWord() {
  const w = wordMatchState.rounds?.[wordMatchState.currentRound];
  if (w) speak(w.word, 0.7);
}
