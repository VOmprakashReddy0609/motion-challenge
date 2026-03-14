// js/engine/movement.js

// ── Ball movement ─────────────────────────────────────────────────────────────

function getBallMoves(grid, r, c) {
  const moves = [];
  if (isBallPassable(grid, r - 1, c)) moves.push("UP");
  if (isBallPassable(grid, r + 1, c)) moves.push("DOWN");
  if (isBallPassable(grid, r, c - 1)) moves.push("LEFT");
  if (isBallPassable(grid, r, c + 1)) moves.push("RIGHT");
  return moves;
}

// Move ball one step. Returns new [r, c] (unchanged if blocked).
function moveBall(grid, dir, r, c) {
  const delta = DIRECTIONS[dir];
  if (!delta) return [r, c];

  const nr = r + delta.dr;
  const nc = c + delta.dc;

  if (!isBallPassable(grid, nr, nc)) return [r, c];

  grid[r][c]   = CELL_EMPTY;
  grid[nr][nc] = CELL_BALL;

  return [nr, nc];
}

// ── Multi-cell block sliding ──────────────────────────────────────────────────

// Slide block one step in dir. Mutates grid and block.cells in place.
// Returns true if the block moved, false if blocked.
function slideBlock(grid, block, dir) {
  if (!canBlockMove(grid, block, dir)) return false;

  const { dr, dc } = DIRECTIONS[dir];

  // Clear all current cells first (important: must clear before writing new ones
  // so we don't accidentally overwrite a cell we're about to move into)
  for (const [r, c] of block.cells) {
    grid[r][c] = CELL_EMPTY;
  }

  // Write all new cells
  const newCells = block.cells.map(([r, c]) => [r + dr, c + dc]);
  for (const [r, c] of newCells) {
    grid[r][c] = block.id;
  }

  // Update the block's anchor and cell list
  block.anchor = [block.anchor[0] + dr, block.anchor[1] + dc];
  block.cells  = newCells;

  return true;
}

// ── Block registry helpers ────────────────────────────────────────────────────

// Build a block object from a shape key, anchor, color, and id.
// Cells are absolute [r,c] positions derived from anchor + shape offsets.
function makeBlock(id, shapeKey, anchorR, anchorC, color) {
  const offsets = BLOCK_SHAPES[shapeKey];
  const cells   = offsets.map(([dr, dc]) => [anchorR + dr, anchorC + dc]);
  return { id, shapeKey, anchor: [anchorR, anchorC], cells, color };
}

// Given a block registry array, find the block whose cells include (r,c).
// Returns the block object or null.
function findBlockAt(blocks, r, c) {
  return blocks.find(b => b.cells.some(([br, bc]) => br === r && bc === c)) || null;
}

// Stamp all blocks onto a fresh grid (marking cells with block id).
// Used after cloning a level to rebuild the grid from block data.
function stampBlocks(grid, blocks) {
  for (const block of blocks) {
    for (const [r, c] of block.cells) {
      grid[r][c] = block.id;
    }
  }
}

// Deep-clone the blocks registry (used by LevelManager reset).
function cloneBlocks(blocks) {
  return blocks.map(b => ({
    id:       b.id,
    shapeKey: b.shapeKey,
    anchor:   [...b.anchor],
    cells:    b.cells.map(cell => [...cell]),
    color:    b.color
  }));
}