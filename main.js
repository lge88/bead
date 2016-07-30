var game = {
  numUnits: 5,
  numNewPiecesPerMove: 5,

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

function step() {
  render();
  requestAnimationFrame(step);
}

function start() {
  game.stop = false;
  step();
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
    this._movingPiece = null;
    this._movingDurationPerUnit = 200;
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

  handleClick(pos) {
    const { x, y } = pos;
    const numUnits = this._chart.length;
    if (x >= 0 && x < numUnits &&
        y >= 0 && y < numUnits) {
      if (this._chart[x][y] === null) {
        this.movePieceTo(pos);
      } else {
        this.toggleSelect(pos);
      }
    }
  }

  toggleSelect(pos) {
    const { x, y } = pos;
    if (this._selected &&
        this._selected.x === x &&
        this._selected.y === y) {
      this._selected = null;
    } else {
      this._selected = { x, y, timestamp: Date.now() };
    }
  }

  movePieceTo(pos) {
    const { x, y } = pos;
    if (this._selected &&
        (this._selected.x !== x || this._selected.y !== y)) {
      const from = { x: this._selected.x, y: this._selected.y };
      const to = pos;
      const path = this.getShortestPath(from, to);
      console.log(path);
      if (path !== null) {
        // Path is a list of positions starts with `from`, end with `to`
        // Romove selected piece from board
        // Create a movingPiece object to kick off the animation.
        // When animation is done:
        //   - Remove movingPiece object
        //   - Put piece at `to`
        const piece = this._chart[from.x][from.y];
        this._chart[from.x][from.y] = null;
        const duration = this._movingDurationPerUnit * (path.length - 1);
        this._movingPiece = {
          startTimestamp: Date.now(),
          piece,
          path
        };
        const done = () => {
          this._movingPiece = null;
          this._chart[to.x][to.y] = piece;
        };
        window.setTimeout(done, duration);
      } else {
        alert('Can not move to there');
      }
    }
  }

  getShortestPath(from, to) {
    // TODO: BFS search path from => to
    // https://en.wikipedia.org/wiki/Breadth-first_search
    const numUnits = this._chart.length;

    const getKey = ({x, y}) => x + '_' + y;
    let queue = [];
    let dist = {};
    let prev = {};

    const root = { x: from.x, y: from.y };
    dist[getKey(root)] = 0;
    queue.push(root);

    while (queue.length > 0) {
      const current = queue.shift();
      const { x, y } = current;

      let neighbors = [];
      // Can go left
      if (x - 1 >= 0 && this._chart[x - 1][y] === null) {
        neighbors.push({ x: x - 1, y });
      }

      // Can go right
      if (x + 1 < numUnits && this._chart[x + 1][y] === null) {
        neighbors.push({ x: x + 1, y });
      }

      // Can go up
      if (y - 1 >= 0 && this._chart[x][y - 1] === null) {
        neighbors.push({ x, y: y - 1 });
      }

      // Can go down
      if (y + 1 < numUnits && this._chart[x][y + 1] === null) {
        neighbors.push({ x, y: y + 1 });
      }

      const currentKey = getKey(current);
      console.log('currentKye', currentKey);
      for (let i = 0; i < neighbors.length; ++i) {
        const node = neighbors[i];
        const key = getKey(node);
        console.log('dist keky', dist[key]);
        if (typeof dist[key] === 'undefined') {
          dist[key] = dist[currentKey] + 1;
          prev[key] = current;
          queue.push(node);
        }
      }
    }

    if (typeof dist[getKey(to)] !== 'undefined') {
      let node = to;
      let path = [ node ];
      while ((node = prev[getKey(node)])) path.push(node);
      console.log(dist);
      console.log(prev);
      return path.reverse();
    }

    return null;
  }

  draw(ctx) {
    const { width } = ctx.canvas;
    const numUnits = this._chart.length;
    const unitWidth = width / numUnits;
    const now = Date.now();

    // draw grid
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = 'white';
    for (let i = 0; i <= numUnits; ++i) {
      // horizontal
      const sofar = i * unitWidth;
      ctx.moveTo(0, sofar);
      ctx.lineTo(width, sofar);

      // vertical
      ctx.moveTo(sofar, 0);
      ctx.lineTo(sofar, width);
    }
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
          const t = now - timestamp;
          y += bounce * unitWidth * Math.sin(w * t);
        }

        const { color } = piece;
        ctx.save();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, radius, 0, 2 * Math.PI);
        ctx.fill();
        ctx.restore();
      }
    }

    // draw moving piece
  }
}

function handleClick(e) {
  const { canvas, numUnits, board } = game;
  let { offsetX: x, offsetY: y } = e;
  const { width } = canvas;
  const spacing = width / numUnits;
  x = Math.round(x / spacing - 0.5);
  y = Math.round(y / spacing - 0.5);
  board.handleClick({ x, y });
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
