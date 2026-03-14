// js/utils/constants.js

// ── Grid cell values ──────────────────────────────────────────────────────────

const CELL_EMPTY = "0";
const CELL_BALL  = "BALL";
const CELL_HOLE  = "HOLE";
const CELL_LOCK  = "X";        // rigid / non-movable obstacle

// Multi-cell blocks: grid cells store the block's unique ID string (e.g. "b0", "b1")
// so every cell knows which block it belongs to. The block registry (an array of
// block objects) holds the full shape definition. We do NOT store color names in
// the grid — only block IDs.

// ── Block colors ──────────────────────────────────────────────────────────────

const BLOCK_COLORS = ["purple", "yellow", "blue", "green"];

// ── Block shape definitions ───────────────────────────────────────────────────
// Each shape is an array of [dr, dc] offsets relative to the block's anchor (top-left).
// Shapes available: 1×1, 1×2, 2×1, 1×3, 3×1, 2×2

const BLOCK_SHAPES = {
  "1x1": [[0, 0]],
  "1x2": [[0, 0], [0, 1]],          // horizontal  2-wide
  "2x1": [[0, 0], [1, 0]],          // vertical    2-tall
  "1x3": [[0, 0], [0, 1], [0, 2]],  // horizontal  3-wide
  "3x1": [[0, 0], [1, 0], [2, 0]],  // vertical    3-tall
  "2x2": [[0, 0], [0, 1], [1, 0], [1, 1]]  // square
};

// Shapes offered to the level generator (excluding very large ones for 6×6 grid)
const AVAILABLE_SHAPES = ["1x1", "1x2", "2x1", "1x1", "1x2", "2x1", "2x2"];

// ── Rigid lock shapes ─────────────────────────────────────────────────────────
// Locks are always 1×1 and stored directly as CELL_LOCK in the grid.

// ── Timer ─────────────────────────────────────────────────────────────────────

const TIMER_DURATION = 240;

// ── Direction deltas ──────────────────────────────────────────────────────────

const DIRECTIONS = {
  UP:    { dr: -1, dc:  0 },
  DOWN:  { dr:  1, dc:  0 },
  LEFT:  { dr:  0, dc: -1 },
  RIGHT: { dr:  0, dc:  1 }
};