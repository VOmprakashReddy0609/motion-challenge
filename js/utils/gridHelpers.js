// js/utils/gridHelpers.js

// ── Grid cloning ──────────────────────────────────────────────────────────────

function cloneGrid(grid) {
  if (!Array.isArray(grid)) return [];
  return grid.map(row => row.slice());
}

function cloneBlocks(blocks) {
  if (!Array.isArray(blocks)) return [];
  return blocks.map(b => ({
    id:       b.id,
    shapeKey: b.shapeKey,
    anchor:   [...b.anchor],
    cells:    b.cells.map(cell => [...cell]),
    color:    b.color
  }));
}

// ── Cell search ───────────────────────────────────────────────────────────────

function findCell(grid, value) {
  if (!Array.isArray(grid) || grid.length === 0) return null;
  for (let r = 0; r < grid.length; r++)
    for (let c = 0; c < grid[0].length; c++)
      if (grid[r][c] === value) return [r, c];
  return null;
}

// ── State serialization for BFS solvability check ────────────────────────────
// Encodes the full game state (ball position + all block positions) as a string
// key so BFS can detect visited states without object comparison.

function serializeState(ballR, ballC, blocks) {
  const blockStr = blocks
    .map(b => b.id + ":" + b.anchor[0] + "," + b.anchor[1])
    .sort()
    .join("|");
  return ballR + "," + ballC + ";" + blockStr;
}

// ── Grid dimensions ───────────────────────────────────────────────────────────

function gridRows(grid) { return grid.length; }
function gridCols(grid) { return grid.length > 0 ? grid[0].length : 0; }