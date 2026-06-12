// Phonics Snake Game

let snakeGame = null;

function startSnake() {
  if (snakeGame) snakeGame.destroy();
  showScreen('screen-snake');
  document.getElementById('snake-over-overlay').style.display = 'none';
  document.getElementById('snake-start-overlay').style.display = 'flex';

  const canvas = document.getElementById('snake-canvas');
  const size = Math.max(
    Math.min(window.innerWidth - 16, window.innerHeight - 310, 400),
    260
  );
  canvas.width = size;
  canvas.height = size;

  snakeGame = new PhonicsSnake(canvas);
  snakeGame.drawWelcome();
  snakeGame.pickNextTarget(false);
}

function beginSnake() {
  document.getElementById('snake-start-overlay').style.display = 'none';
  snakeGame?.start();
}

function restartSnake() {
  document.getElementById('snake-over-overlay').style.display = 'none';
  snakeGame?.start();
}

function stopSnake() {
  snakeGame?.destroy();
  snakeGame = null;
  speechSynthesis?.cancel();
  goHome();
}

function snakeDpad(x, y) {
  snakeGame?.changeDir({ x, y });
}

// ─────────────────────────────────────────────
class PhonicsSnake {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.C = 20;                              // cell size px
    this.cols = Math.floor(canvas.width / this.C);
    this.rows = Math.floor(canvas.height / this.C);
    canvas.width  = this.cols * this.C;       // snap to grid
    canvas.height = this.rows * this.C;

    this.snake  = [];
    this.dir    = { x: 1, y: 0 };
    this.nxtDir = { x: 1, y: 0 };
    this.foods  = [];
    this.target = null;
    this.score  = 0;
    this.best   = parseInt(localStorage.getItem('snakeBest') || '0');
    this.speed  = 300;
    this.timer  = null;
    this.alive  = false;
    this.flashT = 0;

    this._bindKeys();
    this._bindTouch();
    this.updateUI();
  }

  // ── Input ──────────────────────────────────
  _bindKeys() {
    this._onKey = (e) => {
      const map = {
        ArrowUp:{x:0,y:-1}, ArrowDown:{x:0,y:1},
        ArrowLeft:{x:-1,y:0}, ArrowRight:{x:1,y:0},
        w:{x:0,y:-1}, s:{x:0,y:1}, a:{x:-1,y:0}, d:{x:1,y:0}
      };
      if (map[e.key]) { e.preventDefault(); this.changeDir(map[e.key]); }
    };
    document.addEventListener('keydown', this._onKey);
  }

  _bindTouch() {
    let sx = 0, sy = 0;
    this.canvas.addEventListener('touchstart', e => {
      sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    }, { passive: true });
    this.canvas.addEventListener('touchend', e => {
      const dx = e.changedTouches[0].clientX - sx;
      const dy = e.changedTouches[0].clientY - sy;
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12) return;
      Math.abs(dx) >= Math.abs(dy)
        ? this.changeDir(dx > 0 ? {x:1,y:0} : {x:-1,y:0})
        : this.changeDir(dy > 0 ? {x:0,y:1} : {x:0,y:-1});
    }, { passive: true });
  }

  changeDir(d) {
    if (this.snake.length > 1 && d.x === -this.dir.x && d.y === -this.dir.y) return;
    this.nxtDir = d;
  }

  // ── Game lifecycle ──────────────────────────
  start() {
    const cx = Math.floor(this.cols / 2), cy = Math.floor(this.rows / 2);
    this.snake  = [{x:cx,y:cy},{x:cx-1,y:cy},{x:cx-2,y:cy}];
    this.dir    = { x:1, y:0 };
    this.nxtDir = { x:1, y:0 };
    this.score  = 0;
    this.speed  = 300;
    this.alive  = true;
    this.flashT = 0;
    this.updateUI();
    this.pickNextTarget(true);
    this.tick();
  }

  tick() {
    if (!this.alive) return;
    this.update();
    this.draw();
    if (this.alive) this.timer = setTimeout(() => this.tick(), this.speed);
  }

  // ── Core logic ──────────────────────────────
  update() {
    this.dir = { ...this.nxtDir };
    const head = { x: this.snake[0].x + this.dir.x, y: this.snake[0].y + this.dir.y };

    // Wall wrap
    head.x = (head.x + this.cols) % this.cols;
    head.y = (head.y + this.rows) % this.rows;
    // Self
    if (this.snake.slice(1).some(s => s.x === head.x && s.y === head.y)) {
      this.die(null); return;
    }

    this.snake.unshift(head);

    const fi = this.foods.findIndex(f => f.x === head.x && f.y === head.y);
    if (fi !== -1) {
      const food = this.foods[fi];
      if (food.isTarget) {
        this.foods.splice(fi, 1);
        this.score++;
        if (this.score > this.best) {
          this.best = this.score;
          localStorage.setItem('snakeBest', this.best);
        }
        playTone('correct');
        this.flashT = Date.now() + 260;
        if (this.score % 3 === 0 && this.speed > 120) this.speed -= 25;
        this.updateUI();
        this.pickNextTarget(true);
        // tail stays → grows
      } else {
        this.die(food.letter);
      }
    } else {
      this.snake.pop();
    }
  }

  die(wrongLetter) {
    this.alive = false;
    clearTimeout(this.timer);
    playTone('wrong');
    this.draw();

    const t = this.target, ex = t.examples[0];
    const msg = wrongLetter
      ? `That was ${wrongLetter}! You needed ${t.letter}, ${t.letter} for ${ex.word}!`
      : `Game over! ${t.letter} for ${ex.word}!`;
    setTimeout(() => speak(msg, 0.85), 350);

    setTimeout(() => {
      document.getElementById('snake-result-score').textContent = this.score;
      document.getElementById('snake-result-best').textContent  = this.best;
      document.getElementById('snake-result-letter').textContent = t.letter;
      document.getElementById('snake-result-emoji').textContent  = ex.emoji;
      document.getElementById('snake-result-word').textContent   = ex.word;
      document.getElementById('snake-over-overlay').style.display = 'flex';
    }, 750);
  }

  destroy() {
    this.alive = false;
    clearTimeout(this.timer);
    document.removeEventListener('keydown', this._onKey);
  }

  // ── Food / target ───────────────────────────
  pickNextTarget(announce) {
    this.target = PHONICS_DATA[Math.floor(Math.random() * PHONICS_DATA.length)];
    const distractors = shuffle(PHONICS_DATA.filter(d => d.letter !== this.target.letter)).slice(0, 3);

    this.foods = [];
    shuffle([
      { letter: this.target.letter, isTarget: true },
      ...distractors.map(d => ({ letter: d.letter, isTarget: false }))
    ]).forEach(item => {
      let pos, n = 0;
      do {
        pos = {
          x: 1 + Math.floor(Math.random() * (this.cols - 2)),
          y: 1 + Math.floor(Math.random() * (this.rows - 2))
        };
      } while (n++ < 300 && (
        this.snake.some(s => s.x === pos.x && s.y === pos.y) ||
        this.foods.some(f => f.x === pos.x && f.y === pos.y)
      ));
      this.foods.push({ ...pos, ...item });
    });

    this.updateTargetBar();
    if (announce) {
      const ex = this.target.examples[Math.floor(Math.random() * this.target.examples.length)];
      setTimeout(() => speak(`${this.target.letter}! ${this.target.letter} for ${ex.word}!`, 0.85), 80);
    }
  }

  updateTargetBar() {
    if (!this.target) return;
    const ex = this.target.examples[0];
    document.getElementById('snake-target-letter').textContent = this.target.letter;
    document.getElementById('snake-target-emoji').textContent  = ex.emoji;
    document.getElementById('snake-target-word').textContent   = ex.word;
  }

  updateUI() {
    document.getElementById('snake-score').textContent = this.score;
    document.getElementById('snake-best').textContent  = this.best;
  }

  announceTarget() {
    if (!this.target) return;
    const ex = this.target.examples[Math.floor(Math.random() * this.target.examples.length)];
    speak(`${this.target.letter}! ${this.target.letter} for ${ex.word}!`, 0.85);
  }

  // ── Drawing ─────────────────────────────────
  drawWelcome() {
    const ctx = this.ctx, C = this.C;
    ctx.fillStyle = '#0f0520';
    ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // Demo snake
    for (let i = 0; i < 5; i++) {
      const t = 1 - i / 6;
      this._cell(ctx, (Math.floor(this.cols/2) - 2 + i) * C, Math.floor(this.rows/2) * C,
        `hsl(128,${50+t*30}%,${28+t*22}%)`);
    }
    // Corner letters
    [['A','🍎',2,2],['B','⚽',this.cols-3,2],
     ['C','🐱',2,this.rows-3],['D','🐶',this.cols-3,this.rows-3]
    ].forEach(([l,,x,y]) => this._food(ctx, x*C + C/2, y*C + C/2, l));
  }

  draw() {
    const ctx = this.ctx, C = this.C;
    const W = this.canvas.width, H = this.canvas.height;

    ctx.fillStyle = '#0f0520';
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    for (let x = 0; x <= this.cols; x++) {
      ctx.beginPath(); ctx.moveTo(x*C, 0); ctx.lineTo(x*C, H); ctx.stroke();
    }
    for (let y = 0; y <= this.rows; y++) {
      ctx.beginPath(); ctx.moveTo(0, y*C); ctx.lineTo(W, y*C); ctx.stroke();
    }

    // Correct-eat flash
    if (Date.now() < this.flashT) {
      ctx.fillStyle = 'rgba(76,175,80,0.18)';
      ctx.fillRect(0, 0, W, H);
    }

    // Food
    this.foods.forEach(f => this._food(ctx, f.x*C + C/2, f.y*C + C/2, f.letter));

    // Snake
    this.snake.forEach((seg, i) => {
      const x = seg.x * C, y = seg.y * C;
      let color;
      if (!this.alive)      color = i === 0 ? '#666' : '#444';
      else if (i === 0)     color = '#6BCB77';
      else { const t = 1 - i / (this.snake.length + 1); color = `hsl(128,${50+t*30}%,${28+t*22}%)`; }

      this._cell(ctx, x, y, color);
      if (i === 0 &&  this.alive) this._eyes(ctx, x, y);
      if (i === 0 && !this.alive) this._deadEyes(ctx, x, y);
    });
  }

  _food(ctx, cx, cy, letter) {
    const C = this.C, r = C * 0.42;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.fillStyle = '#2d1a50';
    ctx.fill();
    ctx.strokeStyle = '#6040a0';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ddd0ff';
    ctx.font = `900 ${Math.floor(C * 0.56)}px Nunito, Arial`;
    ctx.fillText(letter, cx, cy + 1);
  }

  _cell(ctx, x, y, color) {
    const C = this.C, p = 2, r = 5;
    ctx.fillStyle = color;
    ctx.beginPath();
    if (ctx.roundRect) {
      ctx.roundRect(x+p, y+p, C-p*2, C-p*2, r);
    } else {
      const [lx, ly, lw, lh] = [x+p, y+p, C-p*2, C-p*2];
      ctx.moveTo(lx+r, ly);
      ctx.lineTo(lx+lw-r, ly); ctx.arcTo(lx+lw, ly,    lx+lw, ly+r,    r);
      ctx.lineTo(lx+lw, ly+lh-r); ctx.arcTo(lx+lw, ly+lh, lx+lw-r, ly+lh, r);
      ctx.lineTo(lx+r, ly+lh); ctx.arcTo(lx, ly+lh, lx, ly+lh-r, r);
      ctx.lineTo(lx, ly+r);  ctx.arcTo(lx, ly,    lx+r, ly,    r);
      ctx.closePath();
    }
    ctx.fill();
  }

  _eyes(ctx, x, y) {
    const C = this.C, ER = C*0.09, EO = C*0.22;
    const ecx = x+C/2 + this.dir.x*EO, ecy = y+C/2 + this.dir.y*EO;
    const px = this.dir.y*EO*0.6, py = this.dir.x*EO*0.6;
    [[ecx+px, ecy-py], [ecx-px, ecy+py]].forEach(([ex, ey]) => {
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(ex, ey, ER, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#0a0a1a';
      ctx.beginPath(); ctx.arc(ex+this.dir.x*ER*0.4, ey+this.dir.y*ER*0.4, ER*0.55, 0, Math.PI*2); ctx.fill();
    });
  }

  _deadEyes(ctx, x, y) {
    const C = this.C;
    ctx.strokeStyle = '#FF5252'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(x+C*.28, y+C*.28); ctx.lineTo(x+C*.72, y+C*.72);
    ctx.moveTo(x+C*.72, y+C*.28); ctx.lineTo(x+C*.28, y+C*.72);
    ctx.stroke();
  }
}
