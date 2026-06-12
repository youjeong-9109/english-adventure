let phonicsState = {};

function startPhonics() {
  phonicsState = {
    rounds: shuffle([...PHONICS_DATA]).slice(0, 8),
    currentRound: 0,
    score: 0,
    answered: false,
  };
  showScreen('screen-phonics');
  renderPhonicsRound();
}

function renderPhonicsRound() {
  const s = phonicsState;
  if (s.currentRound >= s.rounds.length) {
    showResult('phonics', s.score, s.rounds.length);
    return;
  }

  const data = s.rounds[s.currentRound];
  s.answered = false;

  document.getElementById('phonics-progress').textContent = (s.currentRound + 1) + ' / ' + s.rounds.length;
  document.getElementById('phonics-letter').textContent = data.letter;
  document.getElementById('phonics-letter-lower').textContent = data.letter.toLowerCase();

  const correct = data.examples[Math.floor(Math.random() * data.examples.length)];
  const distractors = shuffle(PHONICS_DATA.filter(d => d.letter !== data.letter))
    .slice(0, 3)
    .map(d => ({ ...d.examples[Math.floor(Math.random() * d.examples.length)], correct: false }));

  const options = shuffle([{ ...correct, correct: true }, ...distractors]);

  const container = document.getElementById('phonics-options');
  container.innerHTML = '';
  options.forEach(opt => {
    const btn = document.createElement('button');
    btn.className = 'phonics-option';
    btn.innerHTML = `<div class="opt-emoji">${opt.emoji}</div><div class="opt-word">${opt.word}</div>`;
    btn.onclick = () => answerPhonics(btn, opt.correct, correct, data.letter, container);
    container.appendChild(btn);
  });

  setTimeout(() => {
    speak(`The letter ${data.letter}. ${data.letter} says... ${correct.word}`, 0.75);
  }, 400);
}

function answerPhonics(btn, isCorrect, correct, letter, container) {
  if (phonicsState.answered) return;
  phonicsState.answered = true;
  container.querySelectorAll('.phonics-option').forEach(b => b.disabled = true);

  if (isCorrect) {
    btn.classList.add('correct');
    phonicsState.score++;
    playTone('correct');
    speak(`Yes! ${correct.word} starts with ${letter}!`);
  } else {
    btn.classList.add('wrong');
    playTone('wrong');
    container.querySelectorAll('.phonics-option').forEach(b => {
      if (b.querySelector('.opt-word')?.textContent === correct.word) b.classList.add('correct');
    });
    speak(`${correct.word} starts with ${letter}. Keep trying!`);
  }

  setTimeout(() => {
    phonicsState.currentRound++;
    renderPhonicsRound();
  }, 2200);
}

function playPhonicsSound() {
  const data = phonicsState.rounds?.[phonicsState.currentRound];
  if (data) speak(`${data.letter}. ${data.examples[0].word}`, 0.7);
}
