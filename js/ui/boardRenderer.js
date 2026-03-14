// js/ui/boardRenderer.js
//
// renderBoard() is called with grid, blocks, and cols.
// It renders each grid cell, then overlays multi-cell block visuals on top.
//
// Multi-cell block visual strategy:
//   Each grid cell that belongs to a block renders as a "block-cell" — a plain
//   colored div that fills the cell completely. The colored cells visually
//   merge because they share the same color and have no gap between their
//   inner edges. CSS handles the border-radius only on the outer corners.
//
// This approach is simpler and more reliable than absolute-positioned overlays
// that try to span the grid gap.

function renderBoard(board, grid, blocks, cols) {
  if (!board || !grid || grid.length === 0) return;

  const rows  = grid.length;
  const numC  = grid[0].length;

  board.innerHTML = "";
  board.style.display              = "grid";
  board.style.gridTemplateRows    = `repeat(${rows}, 70px)`;
  board.style.gridTemplateColumns = `repeat(${numC}, 70px)`;

  // Build a lookup: "r,c" → block object (for fast per-cell access)
  const cellToBlock = {};
  if (blocks) {
    for (const block of blocks) {
      for (const [r, c] of block.cells) {
        cellToBlock[r + "," + c] = block;
      }
    }
  }

  const fragment = document.createDocumentFragment();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < numC; c++) {
      const cellEl = _renderCell(grid, blocks, cellToBlock, r, c, rows, numC);
      fragment.appendChild(cellEl);
    }
  }

  board.appendChild(fragment);
}

// ─────────────────────────────────────────────────────────────────────────────

function _renderCell(grid, blocks, cellToBlock, r, c, rows, cols) {
  const div  = document.createElement("div");
  div.classList.add("cell");
  div.dataset.row = r;
  div.dataset.col = c;

  const type = grid[r][c];

  if (type === CELL_EMPTY) {
    return div;
  }

  if (type === CELL_BALL) {
    div.classList.add("cell--ball");
    const ball = document.createElement("div");
    ball.classList.add("ball");
    div.appendChild(ball);
    return div;
  }

  if (type === CELL_HOLE) {
    const hole = document.createElement("div");
    hole.classList.add("hole");
    div.appendChild(hole);
    return div;
  }

  if (type === CELL_LOCK) {
    div.classList.add("locked");
    return div;
  }

  // Multi-cell (or 1×1) colored block cell
  const block = cellToBlock[r + "," + c];
  if (block) {
    div.classList.add("cell--block");
    div.dataset.blockId = block.id;

    // Determine which edges of this cell are on the outer border of the block
    // so we can apply rounded corners only there.
    const inner = _getInnerEdges(block, r, c);
    const colorFill = document.createElement("div");
    colorFill.classList.add("block-fill", "block--" + block.color);

    // Apply border-radius only on outer corners
    colorFill.style.borderTopLeftRadius     = inner.top    || inner.left   ? "0" : "8px";
    colorFill.style.borderTopRightRadius    = inner.top    || inner.right  ? "0" : "8px";
    colorFill.style.borderBottomLeftRadius  = inner.bottom || inner.left   ? "0" : "8px";
    colorFill.style.borderBottomRightRadius = inner.bottom || inner.right  ? "0" : "8px";

    // Remove the border on inner shared edges so adjacent cells look merged
    if (inner.top)    colorFill.style.borderTop    = "none";
    if (inner.bottom) colorFill.style.borderBottom = "none";
    if (inner.left)   colorFill.style.borderLeft   = "none";
    if (inner.right)  colorFill.style.borderRight  = "none";

    div.appendChild(colorFill);
    return div;
  }

  return div;
}

// For a cell at (r,c) in block, determine which of its 4 edges are shared
// with another cell of the same block (inner edges that should NOT have a
// border or rounded corner).
function _getInnerEdges(block, r, c) {
  const set = new Set(block.cells.map(([br, bc]) => br + "," + bc));
  return {
    top:    set.has((r - 1) + "," + c),
    bottom: set.has((r + 1) + "," + c),
    left:   set.has(r + "," + (c - 1)),
    right:  set.has(r + "," + (c + 1))
  };
}

// Legacy single-argument entry point (for files that still call renderBoard(board,grid))
// The new signature is renderBoard(board, grid, blocks, cols).
// Both are handled — if blocks is undefined it just skips block rendering.
function renderCell(type, r, c) {
  // kept for compatibility — not used directly since renderBoard now handles all cells
  return document.createElement("div");
}