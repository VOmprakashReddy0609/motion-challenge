// js/ui/renderer.js

function renderBoard(board, grid) {
  if (!board || !grid || grid.length === 0) return;

  const rows = grid.length;
  const cols = grid[0].length;

  board.innerHTML = "";

  // Ensure the board is a grid container
  board.style.display              = "grid";
  board.style.gridTemplateRows    = `repeat(${rows}, 70px)`;
  board.style.gridTemplateColumns = `repeat(${cols}, 70px)`;

  const fragment = document.createDocumentFragment();

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const cell = renderCell(grid[r][c], r, c);
      fragment.appendChild(cell);
    }
  }

  board.appendChild(fragment);
}