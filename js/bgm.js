(function () {
  // C major pentatonic melody (16 eighth-note steps, loops)
  const MELODY = [
    783.99, 880.00, 783.99, 659.25,
    783.99, 880.00, 1046.50, 880.00,
    783.99, 659.25, 783.99, 587.33,
    659.25, 783.99, 659.25, 523.25
  ];
  // Bass root per beat (4 beats per loop)
  const BASS = [130.81, 130.81, 196.00, 196.00];

  class BGMPlayer {
    constructor() {
      this.ctx = null;
      this.master = null;
      this.playing = false;
      this.step = 0;
      this.nextTime = 0;
      this.timerId = null;
      this.BPM = 112;
      this.STEP = 60 / this.BPM / 2; // eighth note duration
      this.muted = localStorage.getItem('bgmMuted') === 'true';
    }

    _init() {
      if (this.ctx) return;
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.16;
      this.master.connect(this.ctx.destination);
    }

    _tone(freq, t, dur, type = 'triangle', vol = 0.25) {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.001, t + dur);
      osc.connect(g);
      g.connect(this.master);
      osc.start(t);
      osc.stop(t + dur + 0.02);
    }

    _hihat(t, vol = 0.035) {
      const len = Math.floor(this.ctx.sampleRate * 0.05);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const hpf = this.ctx.createBiquadFilter();
      hpf.type = 'highpass';
      hpf.frequency.value = 7000;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      src.connect(hpf);
      hpf.connect(g);
      g.connect(this.master);
      src.start(t);
      src.stop(t + 0.06);
    }

    _scheduleStep(step, t) {
      const S = this.STEP;

      // Melody every eighth note
      this._tone(MELODY[step], t, S * 0.78, 'triangle', 0.18);

      // Bass every quarter note (every 2 steps)
      if (step % 2 === 0) {
        const bi = Math.floor(step / 4) % BASS.length;
        this._tone(BASS[bi], t, S * 1.8, 'sine', 0.28);
      }

      // Kick on beats 1 and 3 (steps 0 and 8)
      if (step === 0 || step === 8) {
        this._tone(90, t, 0.07, 'sine', 0.40);
        this._tone(60, t + 0.04, 0.06, 'sine', 0.28);
      }

      // Snare on beats 2 and 4 (steps 4 and 12)
      if (step === 4 || step === 12) {
        this._hihat(t, 0.12);
        this._tone(220, t, 0.05, 'square', 0.07);
      }

      // Hi-hat every eighth note
      this._hihat(t, 0.032);
    }

    _run() {
      while (this.nextTime < this.ctx.currentTime + 0.12) {
        this._scheduleStep(this.step, this.nextTime);
        this.nextTime += this.STEP;
        this.step = (this.step + 1) % 16;
      }
      this.timerId = setTimeout(() => this._run(), 25);
    }

    start() {
      this._init();
      if (this.ctx.state === 'suspended') this.ctx.resume();
      if (this.playing) return;
      this.playing = true;
      this.step = 0;
      this.nextTime = this.ctx.currentTime + 0.05;
      this._run();
      _updateBtn();
    }

    toggle() {
      this._init();
      if (!this.playing) {
        this.muted = false;
        this.start();
      } else if (this.muted) {
        this.muted = false;
        this.master.gain.linearRampToValueAtTime(0.16, this.ctx.currentTime + 0.3);
        if (this.ctx.state === 'suspended') this.ctx.resume();
      } else {
        this.muted = true;
        this.master.gain.linearRampToValueAtTime(0, this.ctx.currentTime + 0.3);
      }
      localStorage.setItem('bgmMuted', this.muted);
      _updateBtn();
    }
  }

  function _updateBtn() {
    const btn = document.getElementById('bgm-toggle');
    if (!btn) return;
    const on = window.bgm.playing && !window.bgm.muted;
    btn.textContent = on ? '🎵' : '🔇';
    btn.title = on ? '음악 끄기' : '음악 켜기';
  }

  window.bgm = new BGMPlayer();

  document.addEventListener('DOMContentLoaded', () => {
    _updateBtn();
    // Auto-start on first user interaction
    document.addEventListener('pointerdown', () => {
      if (!window.bgm.playing && !window.bgm.muted) window.bgm.start();
    }, { once: true });
  });
})();
