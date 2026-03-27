// js/engine/movement.js
// Step-by-step movement (1 cell per move) - FIXED VERSION
//
// CRITICAL FIX: Block movement now preserves holes using backgroundGrid concept.
// The grid parameter should have a backgroundGrid property for hole preservation.

// ── Ball movement (ONE STEP) ─────────────────────────────────────────────────

function getBallMoves(grid, r, c) {
  const moves = [];
  for (const dir of DIR_KEYS) {
    const { dr, dc } = DIRECTIONS[dir];
    const nr = r + dr;
    const nc = c + dc;
    if (isBallPassable(grid, nr, nc)) moves.push(dir);
  }
  return moves;
}

// Move ball ONE STEP in direction. Returns new [r, c].
function moveBallOneStep(grid, r, c, dir) {
  const { dr, dc } = DIRECTIONS[dir];
  const nr = r + dr;
  const nc = c + dc;
  
  if (!isBallPassable(grid, nr, nc)) return [r, c];
  
  // CRITICAL FIX: Check if we're leaving a hole (restore it)
  const wasHole = grid.backgroundGrid && grid.backgroundGrid[r][c] === CELL_HOLE;
  grid[r][c] = wasHole ? CELL_HOLE : CELL_EMPTY;
  
  grid[nr][nc] = CELL_BALL;
  
  return [nr, nc];
}

// ── Block movement (ONE STEP) ─────────────────────────────────────────────────
// FIXED: Now preserves holes when blocks move over them

function moveBlockOneStep(grid, block, dir) {
  if (!canBlockMove(grid, block, dir)) return false;
  
  const { dr, dc } = DIRECTIONS[dir];
  
  // CRITICAL FIX: Store what each cell was before clearing (for hole restoration)
  const wasHole = [];
  for (const [r, c] of block.cells) {
    // Check background grid if available, otherwise assume empty
    const isHole = grid.backgroundGrid && grid.backgroundGrid[r][c] === CELL_HOLE;
    wasHole.push(isHole);
  }
  
  // Clear current cells - restore holes where appropriate
  for (let i = 0; i < block.cells.length; i++) {
    const [r, c] = block.cells[i];
    grid[r][c] = wasHole[i] ? CELL_HOLE : CELL_EMPTY;
  }
  
  // Advance cells by one step
  block.cells = block.cells.map(([r, c]) => [r + dr, c + dc]);
  block.anchor = [block.anchor[0] + dr, block.anchor[1] + dc];
  
  // Write new cells
  for (const [r, c] of block.cells) {
    grid[r][c] = block.id;
  }
  
  return true;
}

// Get all valid movement directions for a block (ONE STEP)
function getBlockMoves(grid, block) {
  return DIR_KEYS.filter(dir => canBlockMove(grid, block, dir));
}

// ── Block registry helpers ────────────────────────────────────────────────────

function makeBlock(id, shapeKey, anchorR, anchorC, color) {
  const offsets = BLOCK_SHAPES[shapeKey];
  const cells = offsets.map(([dr, dc]) => [anchorR + dr, anchorC + dc]);
  return { id, shapeKey, anchor: [anchorR, anchorC], cells, color };
}

function findBlockAt(blocks, r, c) {
  return blocks.find(b => b.cells.some(([br, bc]) => br === r && bc === c)) || null;
}

// CRITICAL FIX: stampBlocks now preserves background holes
function stampBlocks(grid, blocks) {
  for (const block of blocks) {
    for (const [r, c] of block.cells) {
      // Only stamp if not a hole (holes persist under blocks visually)
      if (!grid.backgroundGrid || grid.backgroundGrid[r][c] !== CELL_HOLE) {
        grid[r][c] = block.id;
      }
    }
  }
}