// js/engine/collision.js

// ── Ball passability ──────────────────────────────────────────────────────────

// Can the ball move into grid cell (r,c)?
// The ball travels one step at a time: EMPTY cells and the HOLE are passable.
// Everything else (locks, block cells) is a wall.
function isBallPassable(grid, r, c) {
  const rows = grid.length;
  const cols = grid[0].length;
  if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
  const cell = grid[r][c];
  return cell === CELL_EMPTY || cell === CELL_HOLE;
}

// ── Multi-cell block passability ──────────────────────────────────────────────

// Can block `block` slide one step in `dir`?
//
// Algorithm:
//   1. Compute the set of cells the block currently occupies.
//   2. Compute the set of cells the block WOULD occupy after the move.
//   3. The "new-only" cells (in new set but not old set) are the leading edge.
//   4. Every new-only cell must be EMPTY (not a lock, not another block,
//      not the ball, not outside the grid).
//
// This correctly handles all shapes: 1×1, 1×2, 2×1, 2×2, 1×3, 3×1.
function canBlockMove(grid, block, dir) {
  const rows = grid.length;
  const cols = grid[0].length;
  const { dr, dc } = DIRECTIONS[dir];

  const currentCells = new Set(
    block.cells.map(([r, c]) => r + "," + c)
  );

  for (const [r, c] of block.cells) {
    const nr = r + dr;
    const nc = c + dc;

    // Out of bounds → blocked
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return false;

    const key = nr + "," + nc;

    // If this new cell is already occupied by THIS block → fine (we're moving there)
    if (currentCells.has(key)) continue;

    // Otherwise the cell must be empty
    const cell = grid[nr][nc];
    if (cell !== CELL_EMPTY) return false;
  }

  return true;
}

// Which directions can block `block` move?
function getBlockMoves(grid, block) {
  return ["UP", "DOWN", "LEFT", "RIGHT"].filter(dir => canBlockMove(grid, block, dir));
}