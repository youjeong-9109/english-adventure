let speakingState = {};

function startSpeaking() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) {
    showNoMicScreen();
    return;
  }

  const recognition = new SR();
  recognition.lang = 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 5;

  speakingState = {
    rounds: shuffle([...SPEAKING_WORDS]).slice(0, 6),
    currentRound: 0,
    score: 0,
    listening: false,
    recognition,
  };

  document.getElementById('speaking-no-mic').style.display = 'none';
  document.getElementById('speaking-game-area').style.display = 'flex';
  showScreen('screen-speaking');
  renderSpeakingRound();
}

function showNoMicScreen() {
  document.getElementById('speaking-no-mic').style.display = 'flex';
  showScreen('screen-speaking');
  document.getElementById('speaking-game-area').style.display = 'none';
}

function renderSpeakingRound() {
  const s = speakingState;
  if (s.currentRound >= s.rounds.length) {
    showResult('speaking', s.score, s.rounds.length);
    return;
  }

  const data = s.rounds[s.currentRound];
  s.listening = false;

  document.getElementById('speaking-progress').textContent = (s.currentRound + 1) + ' / ' + s.rounds.length;
  document.getElementById('speaking-emoji').textContent = data.emoji;
  document.getElementById('speaking-word').textContent = data.word;
  document.getElementById('speaking-translation').textContent = data.translation;

  const feedback = document.getElementById('speaking-feedback');
  feedback.textContent = '🎤 버튼을 눌러 말해봐!';
  feedback.className = 'speaking-feedback';

  const micBtn = document.getElementById('speaking-mic-btn');
  micBtn.classList.remove('listening');
  micBtn.textContent = '🎤';

  setTimeout(() => speak(data.word, 0.7), 400);
}

function startListening() {
  const s = speakingState;
  if (s.listening || !s.rounds) return;

  const data = s.rounds[s.currentRound];
  const recognition = s.recognition;
  s.listening = true;

  const micBtn = document.getElementById('speaking-mic-btn');
  micBtn.classList.add('listening');
  micBtn.textContent = '🔴';
  document.getElementById('speaking-feedback').textContent = '듣고 있어요... 말해봐! 🎙️';

  recognition.onresult = (event) => {
    const results = Array.from(event.results[0]).map(r => r.transcript.toLowerCase().trim());
    const target = data.word.toLowerCase();
    const matched = results.some(r => {
      const clean = r.replace(/[^a-z\s]/g, '');
      return clean === target || clean.split(' ').includes(target);
    });

    s.listening = false;
    micBtn.classList.remove('listening');
    micBtn.textContent = '🎤';

    const feedback = document.getElementById('speaking-feedback');
    if (matched) {
      s.score++;
      playTone('correct');
      feedback.textContent = `완벽해! "${data.word}" 맞아! ✅`;
      feedback.className = 'speaking-feedback correct';
      speak(`Perfect! ${data.word}!`);
    } else {
      playTone('wrong');
      const heard = results[0] || '?';
      feedback.textContent = `"${heard}" 라고 했군요. 다시 들어봐요! 💪`;
      feedback.className = 'speaking-feedback wrong';
      setTimeout(() => speak(data.word, 0.65), 600);
    }

    setTimeout(() => {
      s.currentRound++;
      renderSpeakingRound();
    }, 3000);
  };

  recognition.onerror = () => {
    s.listening = false;
    micBtn.classList.remove('listening');
    micBtn.textContent = '🎤';
    document.getElementById('speaking-feedback').textContent = '다시 눌러봐! 🎤';
    document.getElementById('speaking-feedback').className = 'speaking-feedback';
  };

  recognition.onend = () => {
    if (s.listening) {
      s.listening = false;
      micBtn.classList.remove('listening');
      micBtn.textContent = '🎤';
      document.getElementById('speaking-feedback').textContent = '소리가 안 들렸어요. 다시 눌러봐! 🎤';
      document.getElementById('speaking-feedback').className = 'speaking-feedback';
    }
  };

  try {
    recognition.start();
  } catch (e) {
    s.listening = false;
    micBtn.classList.remove('listening');
    micBtn.textContent = '🎤';
  }
}

function replaySpeakingWord() {
  const data = speakingState.rounds?.[speakingState.currentRound];
  if (data) speak(data.word, 0.7);
}

function skipSpeaking() {
  const s = speakingState;
  if (!s.rounds) return;
  try { s.recognition?.abort(); } catch (e) {}
  s.listening = false;
  s.currentRound++;
  renderSpeakingRound();
}
