// js/ui/directionIndicator.js
//
// showDirections() places directional arrow indicators on a specific cell.
// For multi-cell blocks, the caller passes the block's anchor (top-left) cell.
// Arrows appear outside the anchor cell in each valid direction.

function showDirections(board, r, c, dirs, cols, callback) {
  const index  = r * cols + c;
  const cellEl = board.children[index];
  if (!cellEl) return;

  // Remove any pre-existing arrows on this cell
  cellEl.querySelectorAll(".arrow").forEach(a => a.remove());

  const SYMBOLS = { UP: "↑", DOWN: "↓", LEFT: "←", RIGHT: "→" };

  dirs.forEach(dir => {
    const arrow = document.createElement("div");
    arrow.classList.add("arrow", dir.toLowerCase());
    arrow.textContent = SYMBOLS[dir];
    arrow.addEventListener("click", (e) => {
      e.stopPropagation();
      callback(dir);
    });
    cellEl.appendChild(arrow);
  });
}