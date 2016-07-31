var game = {
  numUnits: 10,
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
  constructor({ numUnits = 10, numNewPiecesPerMove = 3, minLength = 3 }) {
    this._numNewPiecesPerMove = numNewPiecesPerMove;
    this._minLength = minLength;
    this._movingDurationPerUnit = 50;
    this._disappearingDuration = 500;

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
    this._disappearingPieces = null;
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
    // Block if animation in progress
    if (this._movingPiece !== null || this._disappearingPieces !== null) return;

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
      // console.log('shortest path:', path);
      if (path !== null) {
        // Path is a list of positions starts with `from`, end with `to`
        // Romove selected piece from board
        // Create a movingPiece object to kick off the animation.
        // When animation is done:
        //   - Remove movingPiece object
        //   - Put piece at `to`
        const piece = this._chart[from.x][from.y];
        this._chart[from.x][from.y] = null;
        this._selected = null;
        const duration = this._movingDurationPerUnit * (path.length - 1);
        this._movingPiece = {
          startTimestamp: Date.now(),
          piece,
          path
        };
        const done = () => {
          this._movingPiece = null;
          this._chart[to.x][to.y] = piece;
          this.check(to);
        };
        window.setTimeout(done, duration);
      } else {
        alert('Can not move to there');
      }
    }
  }

  // Rules: finds max continious sequence of same color as pos in
  // horizontal, vertical and two diagnal directions. If the
  // connecting sequence has no less than minLength elements, the
  // sequence will be disappeared.
  check(pos) {
    const { x, y } = pos;
    const chart = this._chart;
    const numUnits = chart.length;
    const color = chart[x][y].color;

    // horizontal & vertical
    let hPath = [], vPath = [];
    let left = x, right = x, top = y, bottom = y;
    while (left - 1 >= 0 && chart[left - 1][y] && chart[left - 1][y].color === color) left -= 1;
    while (right + 1 < numUnits && chart[right + 1][y] && chart[right + 1][y].color === color) right += 1;
    while (top - 1 >= 0 && chart[x][top - 1] && chart[x][top - 1].color === color) top -= 1;
    while (bottom + 1 < numUnits && chart[x][bottom + 1] && chart[x][bottom + 1].color === color) bottom += 1;
    for (let i = left; i <= right; ++i) hPath.push({ x: i, y });
    for (let i = top; i <= bottom; ++i) vPath.push({ x, y: i });

    // TODO: diagnal
    // let leftTopToRightBottomPath = [], leftBottomToRightTopPath = [];


    const paths = [ hPath, vPath ];
    const longestPath = paths.reduce((sofar, current) => {
      if (current.length > sofar.length) {
        return { path: current, length: current.length };
      }
      return sofar;
    }, {
      length: -Infinity,
      path: null
    }).path;

    // Remove all pieces in the longest path from chart
    // Create disappearing pieces
    // When animation finished:
    //   - Remove disappearing pieces
    //   - Call nextRound
    const done = () => {
      this._disappearingPieces = null;
      this.nextRound();
    };

    // console.log('longest path for ', color, longestPath);
    if (longestPath.length >= this._minLength) {
      longestPath.forEach(({ x, y }) => chart[x][y] = null);
      this._disappearingPieces = {
        startTimestamp: Date.now(),
        color: color,
        path: longestPath
      };
      window.setTimeout(done, this._disappearingDuration);
    } else {
      done();
    }
  }

  getShortestPath(from, to) {
    // BFS search path from => to
    // https://en.wikipedia.org/wiki/Breadth-first_search
    const chart = this._chart;
    const numUnits = chart.length;

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
      if (x - 1 >= 0 && chart[x - 1][y] === null) {
        neighbors.push({ x: x - 1, y });
      }

      // Can go right
      if (x + 1 < numUnits && chart[x + 1][y] === null) {
        neighbors.push({ x: x + 1, y });
      }

      // Can go up
      if (y - 1 >= 0 && chart[x][y - 1] === null) {
        neighbors.push({ x, y: y - 1 });
      }

      // Can go down
      if (y + 1 < numUnits && chart[x][y + 1] === null) {
        neighbors.push({ x, y: y + 1 });
      }

      const currentKey = getKey(current);
      for (let i = 0; i < neighbors.length; ++i) {
        const node = neighbors[i];
        const key = getKey(node);
        if (typeof dist[key] === 'undefined') {
          dist[key] = dist[currentKey] + 1;
          prev[key] = current;
          queue.push(node);

          if (node.x === to.x && node.y === to.y) {
            let it = to;
            let path = [ it ];
            while ((it = prev[getKey(it)])) path.push(it);
            return path.reverse();
          }
        }
      }
    }

    return null;
  }

  draw(ctx) {
    this.drawGrid(ctx);
    this.drawStaticPieces(ctx);
    if (this._movingPiece !== null) {
      this.drawMovingPiece(ctx);
    }
    if (this._disappearingPieces !== null) {
      this.drawDisappearingPieces(ctx);
    }
  }

  drawGrid(ctx) {
    const { width } = ctx.canvas;
    const numUnits = this._chart.length;
    const unitWidth = width / numUnits;

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
  }

  drawStaticPieces(ctx) {
    const shrink = 0.75;
    const bounce = 0.06;
    const period = 500;

    const { width } = ctx.canvas;
    const numUnits = this._chart.length;
    const unitWidth = width / numUnits;
    const now = Date.now();

    // Bouncing amplitude
    const A = bounce * unitWidth;
    const w = 2 * Math.PI / period;
    const radius = 0.5 * unitWidth * shrink;

    for (let i = 0; i < numUnits; ++i) {
      for (let j = 0; j < numUnits; ++j) {
        const piece = this._chart[i][j];
        if (piece === null) continue;

        const x = (i + 0.5) * unitWidth;

        // For selected piece, bounce up and down.
        let y = (j + 0.5) * unitWidth;
        if (this._selected && i === this._selected.x && j === this._selected.y) {
          const { timestamp } = this._selected;
          const t = now - timestamp;
          y += A * Math.sin(w * t);
        }

        const { color } = piece;
        this.drawPiece(ctx, { x, y, color, radius });
      }
    }
  }

  drawMovingPiece(ctx) {
    const { width } = ctx.canvas;
    const numUnits = this._chart.length;
    const unitWidth = width / numUnits;
    const now = Date.now();
    const { startTimestamp, piece, path } = this._movingPiece;
    const elapsed = now - startTimestamp;

    // path[i], path[i+1] is the segement the moving piece currently in
    const i = Math.floor(elapsed / this._movingDurationPerUnit);
    if (i + 1 >= path.length) return;

    // t is the relative time (in range [0, 1]) inside segment path[i], path[i+1]
    const t = elapsed / this._movingDurationPerUnit - i;
    const x1 = (path[i].x + 0.5) * unitWidth, y1 = (path[i].y + 0.5) * unitWidth;
    const x2 = (path[i + 1].x + 0.5) * unitWidth, y2 = (path[i + 1].y + 0.5) * unitWidth;
    const x = x1 + t * (x2 - x1);
    const y = y1 + t * (y2 - y1);

    // Extract this to drawPiece function.
    const shrink = 0.75;
    const radius = 0.5 * unitWidth * shrink;
    const { color } = piece;
    this.drawPiece(ctx, { x, y, color, radius });
  }

  drawDisappearingPieces(ctx) {
    const shrink = 0.75;
    const duration = this._disappearingDuration;
    const { path, color, startTimestamp } = this._disappearingPieces;
    const chart = this._chart;
    const { width } = ctx.canvas;
    const numUnits = this._chart.length;
    const unitWidth = width / numUnits;
    const now = Date.now();
    const initialRadius = 0.5 * unitWidth * shrink;
    const t = (now - startTimestamp) / duration;

    for (let i = 0; i < path.length; ++i) {
      const pos = path[i];
      const x = (pos.x + 0.5) * unitWidth;
      const y = (pos.y + 0.5) * unitWidth;
      const radius = (1 - t) * initialRadius;
      this.drawPiece(ctx, { x, y, color, radius });
    }
  }

  drawPiece(ctx, { x, y, color, radius }) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fill();
    ctx.restore();
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
