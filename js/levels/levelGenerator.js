// js/levels/levelGenerator.js
//
// Generates levels with multi-cell colored blocks and rigid LOCK tiles.
//
// Data model:
//   level.grid   – 2D array; cells are CELL_EMPTY, CELL_BALL, CELL_HOLE,
//                  CELL_LOCK, or a block ID string like "b0", "b1" ...
//   level.blocks – array of block objects:
//                  { id, shapeKey, anchor:[r,c], cells:[[r,c],...], color }

function generateLevel(rows, cols) {
  rows = rows || 6;
  cols = cols || 6;

  let level = null;
  let attempts = 0;

  while (!level && attempts < 400) {
    attempts++;
    level = _tryGenerate(rows, cols);
  }

  return level || _fallbackLevel(rows, cols);
}

// ─────────────────────────────────────────────────────────────────────────────

function _tryGenerate(rows, cols) {
  const grid = _emptyGrid(rows, cols);

  // 1. Place ball on left column, hole on right column at different rows
  const ballR = Math.floor(Math.random() * rows);
  let   holeR;
  do { holeR = Math.floor(Math.random() * rows); }
  while (holeR === ballR);

  grid[ballR][0]        = CELL_BALL;
  grid[holeR][cols - 1] = CELL_HOLE;

  // 2. Place 1–3 rigid LOCK tiles (1×1 permanent obstacles) in interior cols
  const lockCount = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < lockCount; i++) {
    _placeCell(grid, rows, CELL_LOCK, 1, cols - 2);
  }

  // 3. Build 2–4 colored movable blocks with varying shapes
  const blocks      = [];
  const blockCount  = 2 + Math.floor(Math.random() * 3);
  const colorPool   = [...BLOCK_COLORS].sort(() => Math.random() - 0.5);

  for (let i = 0; i < blockCount; i++) {
    const color    = colorPool[i % colorPool.length];
    const shapeKey = AVAILABLE_SHAPES[
      Math.floor(Math.random() * AVAILABLE_SHAPES.length)
    ];
    const offsets  = BLOCK_SHAPES[shapeKey];

    // Try to place this shape at a random anchor in the interior
    const block = _placeBlock(grid, rows, cols, "b" + i, shapeKey, offsets, color);
    if (block) blocks.push(block);
  }

  // 4. Validate: ball must have ≥1 move; at least one block must have ≥1 move
  const ballMoves = getBallMoves(grid, ballR, 0);
  if (ballMoves.length === 0) return null;

  const hasBlockMoves = blocks.some(b => getBlockMoves(grid, b).length > 0);
  if (blocks.length === 0 || !hasBlockMoves) return null;

  return { rows, cols, grid, blocks };
}

// ─────────────────────────────────────────────────────────────────────────────
// Attempt to place a block shape at a random anchor. Returns block or null.

function _placeBlock(grid, rows, cols, id, shapeKey, offsets, color) {
  const maxAttempts = 80;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    // Pick random anchor such that the full shape fits within interior columns
    const maxOffR = Math.max(...offsets.map(([dr]) => dr));
    const maxOffC = Math.max(...offsets.map(([, dc]) => dc));

    const anchorR = Math.floor(Math.random() * (rows - maxOffR));
    const anchorC = 1 + Math.floor(Math.random() * (cols - 2 - maxOffC));

    const cells = offsets.map(([dr, dc]) => [anchorR + dr, anchorC + dc]);

    // All cells must be EMPTY
    const allEmpty = cells.every(([r, c]) =>
      r >= 0 && r < rows && c >= 0 && c < cols && grid[r][c] === CELL_EMPTY
    );

    if (allEmpty) {
      for (const [r, c] of cells) grid[r][c] = id;
      return { id, shapeKey, anchor: [anchorR, anchorC], cells, color };
    }
  }

  return null;  // could not place this block
}

// Place a single CELL_LOCK at a random interior cell
function _placeCell(grid, rows, type, minC, maxC) {
  for (let safety = 0; safety < 60; safety++) {
    const r = Math.floor(Math.random() * rows);
    const c = minC + Math.floor(Math.random() * (maxC - minC + 1));
    if (grid[r][c] === CELL_EMPTY) {
      grid[r][c] = type;
      return;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback: a hand-crafted, always-solvable 6×6 puzzle

function _fallbackLevel(rows, cols) {
  const grid = _emptyGrid(rows, cols);

  // Ball top-left, hole bottom-right
  grid[0][0]           = CELL_BALL;
  grid[rows-1][cols-1] = CELL_HOLE;

  // A vertical 2×1 block blocking the path down from the ball
  const b0 = makeBlock("b0", "2x1", 0, 1, "purple");
  // A horizontal 1×2 block in the middle
  const b1 = makeBlock("b1", "1x2", 2, 2, "yellow");
  // A single block near the hole
  const b2 = makeBlock("b2", "1x1", rows-1, cols-2, "blue");

  const blocks = [b0, b1, b2];
  stampBlocks(grid, blocks);

  return { rows, cols, grid, blocks };
}

function _emptyGrid(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(CELL_EMPTY));
}