// js/utils/gridHelpers.js

function cloneGrid(grid) {
  if (!Array.isArray(grid)) return [];
  return grid.map(row => row.slice());
}

function findCell(grid, value) {
  if (!Array.isArray(grid) || grid.length === 0) return null;

  const rows = grid.length;
  const cols = grid[0].length;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] === value) return [r, c];
    }
  }

  return null;
}