// js/ui/directionIndicator.js
//
// showDirections() attaches directional arrow buttons to a cell.
// For multi-cell blocks the caller passes the CLICKED cell (not just the anchor),
// so arrows appear exactly where the user tapped — Issue #1 & #3 fix.
//
// Issue #3 fixes applied here:
//   • pointer-events: auto  — guarantees arrows are always clickable
//   • z-index set inline    — arrows sit above any overlapping elements
//   • touch events added    — mobile responsiveness
//   • stopPropagation + preventDefault on both click and touchend
//     to prevent the board click handler from firing through the arrow

function showDirections(board, r, c, dirs, cols, callback) {
  const idx    = r * cols + c;
  const cellEl = board.children[idx];
  if (!cellEl) return;

  // Remove any stale arrows on the whole board first (keeps one set at a time)
  board.querySelectorAll(".arrow").forEach(a => a.remove());

  if (!dirs || dirs.length === 0) return;

  const SYMBOLS = { UP: "↑", DOWN: "↓", LEFT: "←", RIGHT: "→" };

  for (const dir of dirs) {
    const arrow = document.createElement("button");
    arrow.classList.add("arrow", "arrow--" + dir.toLowerCase());
    arrow.textContent = SYMBOLS[dir];
    arrow.title       = dir;
    arrow.setAttribute("aria-label", "Move " + dir.toLowerCase());
    arrow.setAttribute("type", "button"); // prevent accidental form submission

    // Issue #3: ensure arrows are always on top and clickable
    arrow.style.pointerEvents = "auto";
    arrow.style.zIndex        = "10";

    // ── Click handler ─────────────────────────────────────────────────────
    arrow.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      callback(dir);
    });

    // ── Touch handler (mobile) ────────────────────────────────────────────
    // touchend fires before the synthetic click, so we call callback here
    // and prevent the duplicate click from also firing.
    arrow.addEventListener("touchend", (e) => {
      e.stopPropagation();
      e.preventDefault();
      callback(dir);
    }, { passive: false });

    cellEl.appendChild(arrow);
  }
}

// Remove all arrows from the board without touching selection highlights.
function clearArrows(board) {
  board.querySelectorAll(".arrow").forEach(a => a.remove());
}