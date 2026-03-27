// js/ui/boardRenderer.js
// FIXED VERSION — March 2026
// Now accepts backgroundGrid to preserve hole visualization under blocks

function renderBoard(board, grid, blocks, cols, backgroundGrid = null) {
  if (!board || !grid || grid.length === 0) return;

  const rows = grid.length;
  const numC = grid[0].length;

  board.innerHTML = "";
  board.style.display              = "grid";
  board.style.gridTemplateRows    = `repeat(${rows}, var(--cell-size, 70px))`;
  board.style.gridTemplateColumns = `repeat(${numC}, var(--cell-size, 70px))`;

  const cellToBlock = {};
  if (blocks) {
    for (const block of blocks)
      for (const [r, c] of block.cells)
        cellToBlock[r + "," + c] = block;
  }

  const frag = document.createDocumentFragment();
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < numC; c++)
      frag.appendChild(_buildCell(grid, cellToBlock, r, c, rows, numC, backgroundGrid));
  
  board.appendChild(frag);
}

function _buildCell(grid, cellToBlock, r, c, rows, cols, backgroundGrid = null) {
  const div = document.createElement("div");
  div.classList.add("cell");
  div.dataset.row = r;
  div.dataset.col = c;

  let type = grid[r][c];
  const bgType = backgroundGrid ? backgroundGrid[r][c] : null;
  const hasHoleUnderneath = (bgType === CELL_HOLE);
  const block = cellToBlock[r + "," + c];

  // If grid shows empty but background has hole, show hole
  if (type === CELL_EMPTY && hasHoleUnderneath) {
    type = CELL_HOLE;
  }

  switch (type) {
    case CELL_EMPTY:
      break;

    case CELL_BALL: {
      if (hasHoleUnderneath) {
        const hole = document.createElement("div");
        hole.classList.add("hole");
        div.appendChild(hole);
      }
      div.classList.add("cell--ball");
      const ball = document.createElement("div");
      ball.classList.add("ball");
      div.appendChild(ball);
      break;
    }

    case CELL_HOLE: {
      div.classList.add("cell--hole");
      const hole = document.createElement("div");
      hole.classList.add("hole");
      div.appendChild(hole);
      break;
    }

    case CELL_LOCK: {
      div.classList.add("cell--locked");
      const mark = document.createElement("span");
      mark.classList.add("lock-mark");
      mark.textContent = "✕";
      div.appendChild(mark);
      break;
    }

    default: {
      if (!block) break;

      // CRITICAL FIX: Show hole under block
      if (hasHoleUnderneath) {
        const hole = document.createElement("div");
        hole.classList.add("hole", "hole--under-block");
        div.appendChild(hole);
      }

      div.classList.add("cell--block");
      div.dataset.blockId = block.id;

      const fill = document.createElement("div");
      fill.classList.add("block-fill", "block--" + block.color);

      const inner = _innerEdges(block, r, c);
      fill.style.borderTopLeftRadius     = (inner.top    || inner.left)   ? "0" : "10px";
      fill.style.borderTopRightRadius    = (inner.top    || inner.right)  ? "0" : "10px";
      fill.style.borderBottomLeftRadius  = (inner.bottom || inner.left)   ? "0" : "10px";
      fill.style.borderBottomRightRadius = (inner.bottom || inner.right)  ? "0" : "10px";

      if (inner.top)    { fill.style.top    = "-6px"; fill.style.borderTop    = "none"; }
      if (inner.bottom) { fill.style.bottom = "-6px"; fill.style.borderBottom = "none"; }
      if (inner.left)   { fill.style.left   = "-6px"; fill.style.borderLeft   = "none"; }
      if (inner.right)  { fill.style.right  = "-6px"; fill.style.borderRight  = "none"; }

      div.appendChild(fill);
      break;
    }
  }

  return div;
}

function _innerEdges(block, r, c) {
  const set = new Set(block.cells.map(([br, bc]) => br + "," + bc));
  return {
    top:    set.has((r - 1) + "," + c),
    bottom: set.has((r + 1) + "," + c),
    left:   set.has(r + "," + (c - 1)),
    right:  set.has(r + "," + (c + 1))
  };
}