var game = {
  numUnits: 10,
  numNewPiecesPerMove: 10,

  ctx: null,
  board: null
};

function init() {
  const { numUnits, numNewPiecesPerMove } = game;

  const canvas = document.querySelector('#canvas');
  const ctx = canvas.getContext('2d');

  const board = new Board({ numUnits, numNewPiecesPerMove });
  board.nextRound();

  canvas.addEventListener('click', handleClick);

  game.canvas = canvas;
  game.ctx = ctx;
  game.board = board;
}

function step(ts) {
  update(ts);
  render(ts);
  requestAnimationFrame(step);
}

function start() {
  game.stop = false;
  step();
}

function update() {
  const { board } = game;
  // TODO: update board based on user input
}

function render() {
  const { board, ctx } = game;
  const { width, height } = ctx.canvas;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = 'grey';
  ctx.fillRect(0, 0, width, height);
  board.draw(ctx);
}

class Board {
  constructor({ numUnits = 10, numNewPiecesPerMove = 3 }) {
    this._numNewPiecesPerMove = numNewPiecesPerMove;
    this._colors = [
      'red',
      'blue',
      'yellow',
      'green',
      'purple',
    ];
    this._chart = Array.apply(null, Array(numUnits)).map(x => (
      Array.apply(null, Array(numUnits)).map(x => null)));
    this._selected = null;
    this._animating = false;
  }

  nextRound() {
    const colors = this._colors;
    const numNewPiecesPerMove = this._numNewPiecesPerMove;
    let availableSlots = this.getAvailableSlots();

    shuffle(availableSlots);
    const picked = availableSlots.slice(0, numNewPiecesPerMove);

    for (let i = 0; i < picked.length; ++i) {
      const { x, y } = picked[i];
      const color = colors[randomInt(colors.length)];
      const piece = { color };
      this._chart[x][y] = piece;
    }

    // TODO: Check pieces

    availableSlots = this.getAvailableSlots();
    if (availableSlots.length === 0) {
      alert('Game over');
    }
  }

  getAvailableSlots() {
    const numUnits = this._chart.length;
    let slots = [];
    for (let x = 0; x < numUnits; ++x)
      for (let y = 0; y < numUnits; ++y)
        if (this._chart[x][y] === null) { slots.push({ x, y }); }
    return slots;
  }

  toggleSelect({x, y}) {
    const numUnits = this._chart.length;
    if (x >= 0 && x < numUnits &&
        y >= 0 && y < numUnits &&
        this._chart[x][y] !== null) {
      if (this._selected &&
          this._selected.x === x &&
          this._selected.y === y) {
        this._selected = null;
      } else {
        this._selected = { x, y, timestamp: Date.now() };
      }
    }
  }

  getPathFromSelected(to) {
    const from = { x: this._selected.x, y: this._selected.y };
    // TODO: BFS search path from => to
    let path = [];
    return path;
  }

  draw(ctx) {
    const { width } = ctx.canvas;
    const numUnits = this._chart.length;
    const unitWidth = width / numUnits;

    // draw grid
    ctx.save();
    for (let i = 0; i <= numUnits; ++i) {
      // horizontal
      const sofar = i * unitWidth;
      ctx.moveTo(0, sofar);
      ctx.lineTo(width, sofar);

      // vertical
      ctx.moveTo(sofar, 0);
      ctx.lineTo(sofar, width);
    }
    ctx.strokeStyle = 'white';
    ctx.stroke();
    ctx.restore();

    // draw pieces
    const shrink = 0.75;
    const bounce = 0.06;
    const T = 500;
    const w = 2 * Math.PI / T;
    const radius = 0.5 * unitWidth * shrink;
    for (let i = 0; i < numUnits; ++i) {
      for (let j = 0; j < numUnits; ++j) {
        const piece = this._chart[i][j];
        if (piece === null) continue;

        const x = (i + 0.5) * unitWidth;

        // bounce up and down if selected.
        let y = (j + 0.5) * unitWidth;
        if (this._selected && i === this._selected.x && j === this._selected.y) {
          const { timestamp } = this._selected;
          const t = Date.now() - timestamp;
          y += bounce * unitWidth * Math.sin(w * t);
        }

        const { color } = piece;
        ctx.save();
        ctx.strokeStyle = '';
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      }
    }
  }
}

function handleClick(e) {
  const { canvas, numUnits, board } = game;
  let { offsetX: x, offsetY: y } = e;
  const { width } = canvas;
  const spacing = width / numUnits;
  x = Math.round(x / spacing - 0.5);
  y = Math.round(y / spacing - 0.5);
  board.toggleSelect({ x, y });
}

// random int in { 0, 1, ..., n-1 }
function randomInt(n) {
  return Math.floor(Math.random() * n);
}

function shuffle(a) {
  let j, x, i;
  for (i = a.length; i; i--) {
    j = Math.floor(Math.random() * i);
    x = a[i - 1];
    a[i - 1] = a[j];
    a[j] = x;
  }
}

init();
requestAnimationFrame(step);
