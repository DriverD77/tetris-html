(() => {
  'use strict';

  const COLS = 10;
  const ROWS = 20;
  const BLOCK = 30;

  const canvas = document.getElementById('board');
  const ctx = canvas.getContext('2d');

  const nextCanvas = document.getElementById('next');
  const nctx = nextCanvas.getContext('2d');

  const scoreEl = document.getElementById('score');
  const bestEl = document.getElementById('best');
  const levelEl = document.getElementById('level');
  const linesEl = document.getElementById('lines');
  const overlay = document.getElementById('overlay');
  const overlayText = document.getElementById('overlay-text');
  const btn = document.getElementById('btn');

  const SHAPES = {
    I: [[0, 0, 0, 0], [1, 1, 1, 1], [0, 0, 0, 0], [0, 0, 0, 0]],
    O: [[1, 1], [1, 1]],
    T: [[0, 1, 0], [1, 1, 1], [0, 0, 0]],
    S: [[0, 1, 1], [1, 1, 0], [0, 0, 0]],
    Z: [[1, 1, 0], [0, 1, 1], [0, 0, 0]],
    J: [[1, 0, 0], [1, 1, 1], [0, 0, 0]],
    L: [[0, 0, 1], [1, 1, 1], [0, 0, 0]],
  };

  const COLORS = {
    I: '#00d8e8', O: '#f5d300', T: '#a02ce0', S: '#3ddc84',
    Z: '#f04545', J: '#3a6cf0', L: '#f09a2e',
  };

  const LINE_POINTS = [0, 100, 300, 500, 800];

  let board, piece, nextType, bag;
  let score, level, lines;
  let best = Number(localStorage.getItem('tetris-best') || 0);
  let dropInterval, dropTimer, lastTime = 0;
  let running = false, paused = false, over = false;

  bestEl.textContent = best;

  // ---------- helpers ----------

  function newBoard() {
    return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
  }

  function shuffleBag() {
    const types = Object.keys(SHAPES);
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }
    bag.push(...types);
  }

  function pullFromBag() {
    if (bag.length < 7) shuffleBag();
    return bag.pop();
  }

  function collides(shape, x, y) {
    for (let r = 0; r < shape.length; r++) {
      for (let c = 0; c < shape[r].length; c++) {
        if (!shape[r][c]) continue;
        const nx = x + c;
        const ny = y + r;
        if (nx < 0 || nx >= COLS || ny >= ROWS) return true;
        if (ny >= 0 && board[ny][nx]) return true;
      }
    }
    return false;
  }

  function rotateCW(shape) {
    return shape[0].map((_, i) => shape.map(row => row[i]).reverse());
  }

  // ---------- game flow ----------

  function spawn() {
    const type = nextType || pullFromBag();
    nextType = pullFromBag();
    drawNext();

    const shape = SHAPES[type].map(r => r.slice());
    piece = {
      type,
      shape,
      x: Math.floor((COLS - shape[0].length) / 2),
      y: 0,
    };

    if (collides(piece.shape, piece.x, piece.y)) {
      piece.y -= 1;
      if (collides(piece.shape, piece.x, piece.y)) {
        endGame();
      }
    }
    dropTimer = 0;
  }

  function lockPiece() {
    piece.shape.forEach((row, r) => {
      row.forEach((v, c) => {
        if (v) {
          const y = piece.y + r;
          if (y >= 0) board[y][piece.x + c] = piece.type;
        }
      });
    });
    clearLines();
    spawn();
  }

  function clearLines() {
    let cleared = 0;
    for (let r = ROWS - 1; r >= 0; r--) {
      if (board[r].every(cell => cell)) {
        board.splice(r, 1);
        board.unshift(Array(COLS).fill(null));
        cleared++;
        r++; // re-check the same row index after shift
      }
    }
    if (cleared) {
      lines += cleared;
      score += LINE_POINTS[cleared] * level;
      level = Math.floor(lines / 10) + 1;
      dropInterval = Math.max(80, 800 - (level - 1) * 60);
      if (score > best) {
        best = score;
        localStorage.setItem('tetris-best', String(best));
      }
      updateHud();
    }
  }

  function hardDrop() {
    let dist = 0;
    while (!collides(piece.shape, piece.x, piece.y + 1)) {
      piece.y++;
      dist++;
    }
    score += dist * 2;
    updateHud();
    lockPiece();
  }

  function updateHud() {
    scoreEl.textContent = score;
    bestEl.textContent = best;
    levelEl.textContent = level;
    linesEl.textContent = lines;
  }

  function start() {
    board = newBoard();
    bag = [];
    nextType = null;
    score = 0; level = 1; lines = 0;
    dropInterval = 800; dropTimer = 0;
    over = false; paused = false;
    overlay.classList.add('hidden');
    btn.textContent = 'Pause';
    updateHud();
    spawn();
    running = true;
    lastTime = performance.now();
    requestAnimationFrame(loop);
  }

  function endGame() {
    over = true;
    running = false;
    btn.textContent = 'Play again';
    overlayText.innerHTML = 'Game over<br>Score: ' + score;
    overlay.classList.remove('hidden');
  }

  function togglePause() {
    if (over) return;
    paused = !paused;
    btn.textContent = paused ? 'Resume' : 'Pause';
    if (paused) {
      overlayText.textContent = 'Paused — press P to resume';
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
    }
  }

  // ---------- drawing ----------

  function drawCell(g, x, y, color, size = BLOCK, ghost = false) {
    const px = x * size;
    const py = y * size;
    if (ghost) {
      g.strokeStyle = color;
      g.globalAlpha = 0.35;
      g.strokeRect(px + 2, py + 2, size - 4, size - 4);
      g.globalAlpha = 1;
      return;
    }
    g.fillStyle = color;
    g.fillRect(px + 1, py + 1, size - 2, size - 2);
    // simple bevel highlight
    g.fillStyle = 'rgba(255,255,255,0.25)';
    g.fillRect(px + 1, py + 1, size - 2, 4);
    g.fillStyle = 'rgba(0,0,0,0.25)';
    g.fillRect(px + 1, py + size - 5, size - 2, 4);
  }

  function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // grid lines
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    for (let c = 1; c < COLS; c++) {
      ctx.beginPath();
      ctx.moveTo(c * BLOCK, 0);
      ctx.lineTo(c * BLOCK, canvas.height);
      ctx.stroke();
    }
    for (let r = 1; r < ROWS; r++) {
      ctx.beginPath();
      ctx.moveTo(0, r * BLOCK);
      ctx.lineTo(canvas.width, r * BLOCK);
      ctx.stroke();
    }

    // settled blocks
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        if (board[r][c]) drawCell(ctx, c, r, COLORS[board[r][c]]);
      }
    }

    if (piece) {
      // ghost
      let gy = piece.y;
      while (!collides(piece.shape, piece.x, gy + 1)) gy++;
      if (gy !== piece.y) {
        piece.shape.forEach((row, r) =>
          row.forEach((v, c) => {
            if (v) drawCell(ctx, piece.x + c, gy + r, COLORS[piece.type], BLOCK, true);
          })
        );
      }
      // active piece
      piece.shape.forEach((row, r) =>
        row.forEach((v, c) => {
          if (v && piece.y + r >= 0) drawCell(ctx, piece.x + c, piece.y + r, COLORS[piece.type]);
        })
      );
    }
  }

  function drawNext() {
    nctx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
    if (!nextType) return;
    const shape = SHAPES[nextType];
    // trim empty rows/cols to center the piece
    const rows = shape.filter(r => r.some(v => v));
    const cols = shape[0].map((_, i) => rows.some(r => r[i]));
    const w = cols.length, h = rows.length;
    const offX = (nextCanvas.width - w * BLOCK) / 2 / BLOCK;
    const offY = (nextCanvas.height - h * BLOCK) / 2 / BLOCK;
    rows.forEach((row, r) =>
      row.forEach((v, c) => {
        if (v) drawCell(nctx, offX + c, offY + r, COLORS[nextType]);
      })
    );
  }

  // ---------- main loop ----------

  function loop(time) {
    if (!running) return;
    requestAnimationFrame(loop);

    if (!paused && !over) {
      const delta = time - lastTime;
      lastTime = time;
      dropTimer += delta;
      if (dropTimer >= dropInterval) {
        dropTimer = 0;
        if (!collides(piece.shape, piece.x, piece.y + 1)) {
          piece.y++;
        } else {
          lockPiece();
        }
      }
      draw();
    }
  }

  // ---------- input ----------

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !running) { start(); return; }
    if (e.key === 'r' || e.key === 'R') { start(); return; }
    if (e.key === 'p' || e.key === 'P') { togglePause(); return; }
    if (!running || paused || over) return;

    switch (e.key) {
      case 'ArrowLeft':
        if (!collides(piece.shape, piece.x - 1, piece.y)) piece.x--;
        break;
      case 'ArrowRight':
        if (!collides(piece.shape, piece.x + 1, piece.y)) piece.x++;
        break;
      case 'ArrowDown':
        if (!collides(piece.shape, piece.x, piece.y + 1)) {
          piece.y++;
          score += 1;
          dropTimer = 0;
          updateHud();
        }
        break;
      case 'ArrowUp':
      case 'x':
      case 'X':
        rotated();
        break;
      case ' ':
        e.preventDefault();
        if (running && !paused && !over) hardDrop();
        break;
    }
    draw();
  });

  function rotated() {
    const shape = rotateCW(piece.shape);
    const kicks = [0, -1, 1, -2, 2];
    for (const k of kicks) {
      if (!collides(shape, piece.x + k, piece.y)) {
        piece.x += k;
        piece.shape = shape;
        return;
      }
      if (!collides(shape, piece.x, piece.y - 1)) {
        piece.y -= 1;
        piece.shape = shape;
        return;
      }
    }
  }

  btn.addEventListener('click', () => {
    if (!running) start();
    else togglePause();
  });

  draw();
})();
