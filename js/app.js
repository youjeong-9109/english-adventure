let currentGame = null;

// ---- Screen Navigation ----
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

function goHome() {
  if (window.speechSynthesis) speechSynthesis.cancel();
  showScreen('screen-home');
  updateStarDisplay();
}

// ---- Game Router ----
function startGame(gameName) {
  currentGame = gameName;
  if (gameName === 'phonics') startPhonics();
  else if (gameName === 'wordmatch') startWordMatch();
  else if (gameName === 'spelling') startSpelling();
  else if (gameName === 'speaking') startSpeaking();
  else if (gameName === 'snake') startSnake();
}

function playAgain() {
  if (currentGame) startGame(currentGame);
  else goHome();
}

// ---- Progress & Stars ----
function getProgress() {
  const saved = localStorage.getItem('englishAdventureProgress');
  return saved ? JSON.parse(saved) : { phonics: 0, wordmatch: 0, spelling: 0, speaking: 0, totalStars: 0 };
}

function saveProgress(progress) {
  localStorage.setItem('englishAdventureProgress', JSON.stringify(progress));
}

function updateStarDisplay() {
  const p = getProgress();
  document.getElementById('total-stars').textContent = p.totalStars;
  const snakeBestEl = document.getElementById('snake-home-best');
  if (snakeBestEl) snakeBestEl.textContent = localStorage.getItem('snakeBest') || '0';

  ['phonics', 'wordmatch', 'spelling', 'speaking'].forEach(game => {
    const el = document.getElementById('stars-' + game);
    if (el) {
      const n = p[game] || 0;
      el.textContent = '⭐'.repeat(n) + '☆'.repeat(3 - n);
    }
  });
}

function showResult(gameName, score, total) {
  const pct = score / total;
  const stars = pct >= 0.8 ? 3 : pct >= 0.6 ? 2 : pct >= 0.4 ? 1 : 0;

  const p = getProgress();
  if (stars > (p[gameName] || 0)) {
    p[gameName] = stars;
    p.totalStars = (p.phonics || 0) + (p.wordmatch || 0) + (p.spelling || 0) + (p.speaking || 0);
    saveProgress(p);
  }

  const emojis = ['😢', '🙂', '😊', '🤩'];
  const messages = ['다시 도전해봐! 💪', '잘했어! 👍', '훌륭해! 🎉', '완벽해! 🌟'];

  document.getElementById('result-emoji').textContent = emojis[stars];
  document.getElementById('result-score').textContent = score + ' / ' + total;
  document.getElementById('result-stars').textContent = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
  document.getElementById('result-message').textContent = messages[stars];

  if (stars >= 2) {
    showConfetti();
    playTone('star');
  }

  showScreen('screen-result');
  updateStarDisplay();
}

// ---- TTS ----
let voiceReady = false;
let preferredVoice = null;

function loadVoices() {
  const voices = speechSynthesis.getVoices();
  preferredVoice = voices.find(v => v.lang === 'en-US' && /female|zira|samantha|victoria/i.test(v.name))
    || voices.find(v => v.lang === 'en-US')
    || voices.find(v => v.lang.startsWith('en'));
  voiceReady = true;
}

function speak(text, rate = 0.85, pitch = 1.1) {
  if (!window.speechSynthesis) return;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = 'en-US';
  u.rate = rate;
  u.pitch = pitch;
  if (preferredVoice) u.voice = preferredVoice;
  speechSynthesis.speak(u);
}

// ---- Sound Effects ----
function playTone(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (type === 'correct') {
      playNote(ctx, 523, 0, 0.15);
      playNote(ctx, 659, 0.12, 0.15);
      playNote(ctx, 784, 0.24, 0.2);
    } else if (type === 'wrong') {
      playNote(ctx, 220, 0, 0.15, 'sawtooth');
      playNote(ctx, 180, 0.2, 0.2, 'sawtooth');
    } else if (type === 'star') {
      [523, 659, 784, 1047].forEach((f, i) => playNote(ctx, f, i * 0.1, 0.25));
    }
  } catch (e) {}
}

function playNote(ctx, freq, delay, dur, type = 'sine') {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.25, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + delay + dur);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + dur + 0.05);
}

// ---- Confetti ----
function showConfetti() {
  const colors = ['#FF6B6B', '#FFE66D', '#4ECDC4', '#A8E6CF', '#FF8B94', '#FFA07A'];
  for (let i = 0; i < 60; i++) {
    const el = document.createElement('div');
    el.className = 'confetti-piece';
    el.style.cssText = `left:${Math.random()*100}vw;background:${colors[i % colors.length]};`
      + `border-radius:${Math.random() > 0.5 ? '50%' : '3px'};`
      + `width:${8 + Math.random()*8}px;height:${8 + Math.random()*8}px;`
      + `animation-duration:${1.5 + Math.random()*1.5}s;animation-delay:${Math.random()*0.5}s;`;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 3500);
  }
}

// ---- Utilities ----
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- Init ----
document.addEventListener('DOMContentLoaded', () => {
  updateStarDisplay();
  if (window.speechSynthesis) {
    speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
  }
});
