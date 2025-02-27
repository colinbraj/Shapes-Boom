// Grab the canvas and context
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const scoreDisplay = document.getElementById('score');
const highScoreDisplay = document.getElementById('highScore');

// Dimensions for the grid
const COLS = 10;
const ROWS = 20;
const BLOCK_SIZE = 32; // Each block's pixel size

canvas.width = COLS * BLOCK_SIZE;
canvas.height = ROWS * BLOCK_SIZE;

// Track score
let score = 0;
let highScore = localStorage.getItem('shapesBoomHighScore') || 0;
highScoreDisplay.textContent = highScore;

// Create the grid (2D array)
let grid = createMatrix(COLS, ROWS);

// Keep track of the current piece
let currentPiece = null;
let dropCounter = 0;
let dropInterval = 1000; // 1 second
let lastTime = 0;

// Vibrant block colors (index 0 is null, so it’s ignored)
const colors = [
  null,
  '#FF0000', // red
  '#00FF00', // green
  '#0000FF', // blue
  '#FFA500', // orange
  '#FFFF00', // yellow
  '#800080', // purple
  '#00FFFF'  // cyan
];

// Define shapes (tetrominoes)
const SHAPES = [
  // T
  [
    [0, 1, 0],
    [1, 1, 1],
    [0, 0, 0]
  ],
  // O
  [
    [2, 2],
    [2, 2]
  ],
  // L
  [
    [0, 3, 0],
    [0, 3, 0],
    [0, 3, 3]
  ],
  // S
  [
    [0, 4, 4],
    [4, 4, 0],
    [0, 0, 0]
  ],
  // Z
  [
    [5, 5, 0],
    [0, 5, 5],
    [0, 0, 0]
  ],
  // I
  [
    [0, 6, 0, 0],
    [0, 6, 0, 0],
    [0, 6, 0, 0],
    [0, 6, 0, 0]
  ],
  // J
  [
    [7, 0, 0],
    [7, 7, 7],
    [0, 0, 0]
  ]
];

class Piece {
  constructor(matrix, x, y) {
    this.matrix = matrix;
    this.pos = { x, y };
  }
}

function createMatrix(width, height) {
  const matrix = [];
  for (let y = 0; y < height; y++) {
    matrix[y] = new Array(width).fill(0);
  }
  return matrix;
}

// Create a random piece
function createPiece() {
  const shape = SHAPES[Math.floor(Math.random() * SHAPES.length)];
  // Make a copy of the shape so we don't accidentally modify the original
  const shapeCopy = JSON.parse(JSON.stringify(shape));
  return new Piece(shapeCopy, COLS / 2 - 1, 0);
}

function drawMatrix(matrix, offset) {
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y].length; x++) {
      const value = matrix[y][x];
      if (value !== 0) {
        ctx.fillStyle = colors[value];
        ctx.fillRect(
          (x + offset.x) * BLOCK_SIZE,
          (y + offset.y) * BLOCK_SIZE,
          BLOCK_SIZE,
          BLOCK_SIZE
        );
        // Optional outline for each block
        ctx.strokeStyle = '#111';
        ctx.strokeRect(
          (x + offset.x) * BLOCK_SIZE,
          (y + offset.y) * BLOCK_SIZE,
          BLOCK_SIZE,
          BLOCK_SIZE
        );
      }
    }
  }
}

function draw() {
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Draw the placed blocks (the grid)
  drawMatrix(grid, { x: 0, y: 0 });

  // Draw the current falling piece
  if (currentPiece) {
    drawMatrix(currentPiece.matrix, currentPiece.pos);
  }
}

function collide(grid, piece) {
  const { matrix, pos } = piece;
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y].length; x++) {
      if (matrix[y][x] !== 0) {
        const ny = y + pos.y;
        const nx = x + pos.x;
        // Check boundaries and existing blocks
        if (
          ny < 0 ||
          ny >= ROWS ||
          nx < 0 ||
          nx >= COLS ||
          grid[ny][nx] !== 0
        ) {
          return true;
        }
      }
    }
  }
  return false;
}

function merge(grid, piece) {
  const { matrix, pos } = piece;
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < matrix[y].length; x++) {
      if (matrix[y][x] !== 0) {
        grid[y + pos.y][x + pos.x] = matrix[y][x];
      }
    }
  }
}

function clearRows() {
  let rowCount = 0;
  outer: for (let y = grid.length - 1; y >= 0; y--) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] === 0) {
        continue outer;
      }
    }
    // Row is full
    const row = grid.splice(y, 1)[0].fill(0);
    grid.unshift(row);
    y++;
    rowCount++;
  }

  // Increase score for each cleared row
  if (rowCount > 0) {
    score += rowCount * 10;
    scoreDisplay.textContent = score;
    if (score > highScore) {
      highScore = score;
      localStorage.setItem('shapesBoomHighScore', highScore);
      highScoreDisplay.textContent = highScore;
    }
  }
}

function dropPiece() {
  currentPiece.pos.y++;
  if (collide(grid, currentPiece)) {
    currentPiece.pos.y--;
    merge(grid, currentPiece);
    resetPiece();
    clearRows();
  }
  dropCounter = 0;
}

function resetPiece() {
  currentPiece = createPiece();
  currentPiece.pos.x = (COLS / 2) | 0;
  currentPiece.pos.y = 0;
  if (collide(grid, currentPiece)) {
    // Game Over: Reset grid and score
    grid.forEach(row => row.fill(0));
    score = 0;
    scoreDisplay.textContent = score;
  }
}

function rotate(matrix, dir) {
  // Transpose
  for (let y = 0; y < matrix.length; y++) {
    for (let x = 0; x < y; x++) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }
  // Reverse rows (clockwise or counter-clockwise)
  if (dir > 0) {
    matrix.forEach(row => row.reverse());
  } else {
    matrix.reverse();
  }
}

function rotatePiece(dir) {
  const pos = currentPiece.pos.x;
  let offset = 1;
  rotate(currentPiece.matrix, dir);
  while (collide(grid, currentPiece)) {
    currentPiece.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > currentPiece.matrix[0].length) {
      // Rotate back if we can't avoid collision
      rotate(currentPiece.matrix, -dir);
      currentPiece.pos.x = pos;
      return;
    }
  }
}

function update(time = 0) {
  const deltaTime = time - lastTime;
  lastTime = time;

  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    dropPiece();
  }

  draw();
  requestAnimationFrame(update);
}

document.addEventListener('keydown', event => {
  switch (event.key) {
    case 'ArrowLeft':
    case 'a':
      currentPiece.pos.x--;
      if (collide(grid, currentPiece)) {
        currentPiece.pos.x++;
      }
      break;
    case 'ArrowRight':
    case 'd':
      currentPiece.pos.x++;
      if (collide(grid, currentPiece)) {
        currentPiece.pos.x--;
      }
      break;
    case 'ArrowDown':
    case 's':
      dropPiece();
      break;
    case 'ArrowUp':
    case 'w':
      rotatePiece(1);
      break;
  }
});

let lastTime = 0;

function init() {
  resetPiece();
  update();
}

init();
