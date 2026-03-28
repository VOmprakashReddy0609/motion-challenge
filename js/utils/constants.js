// js/utils/constants.js

// ── Grid cell values ──────────────────────────────────────────────────────────

const CELL_EMPTY = "0";
const CELL_BALL  = "BALL";
const CELL_HOLE  = "HOLE";
const CELL_LOCK  = "X";        // rigid / non-movable obstacle (cross mark)

// Multi-cell blocks: grid cells store the block's unique ID string (e.g. "b0", "b1").
// The block registry array holds full shape definitions. Color is NOT stored in grid.

// ── Block colors ──────────────────────────────────────────────────────────────

const BLOCK_COLORS = ["purple", "yellow", "blue", "green", "orange", "teal"];

// ── Block shape definitions ───────────────────────────────────────────────────
// Each shape is [dr, dc] offsets from the block's anchor (top-left cell).

const BLOCK_SHAPES = {
  "1x1": [[0, 0]],
  "1x2": [[0, 0], [0, 1]],
  "2x1": [[0, 0], [1, 0]],
  "2x2": [[0, 0], [0, 1], [1, 0], [1, 1]],
  "L1": [[0, 0], [1, 0], [1, 1]],
  "L2": [[0, 1], [1, 0], [1, 1]],
  "T1": [[0, 0], [0, 1], [0, 2], [1, 1]],
  "Z1": [[0, 0], [0, 1], [1, 1], [1, 2]],
  "S1": [[0, 1], [0, 2], [1, 0], [1, 1]]
};

// Shapes pool used by the level generator.
// Weighted toward simpler shapes so levels stay manageable.
const AVAILABLE_SHAPES = ["1x1", "1x2", "2x1", "1x2", "2x1", "1x1", "2x2"];

// ── Timer ─────────────────────────────────────────────────────────────────────

const TIMER_DURATION = 240; // 4 minutes in seconds

// ── Scoring ───────────────────────────────────────────────────────────────────

const SCORE_CORRECT = 4;   // +4 for completing a level within move limit
const SCORE_WRONG   = -1;  // -1 for each move over the limit (penalty on fail)

// ── Direction deltas ──────────────────────────────────────────────────────────

const DIRECTIONS = {
  UP:    { dr: -1, dc:  0 },
  DOWN:  { dr:  1, dc:  0 },
  LEFT:  { dr:  0, dc: -1 },
  RIGHT: { dr:  0, dc:  1 }
};

const DIR_KEYS = ["UP", "DOWN", "LEFT", "RIGHT"];

// ── Difficulty tiers ──────────────────────────────────────────────────────────
// Each tier defines grid size, block count range, lock count range, move limit.
// Move limit is critical — it's what makes the game hard.

const DIFFICULTY_TIERS = [
  // tier 0: levels 1–3   (easy warm-up)
  { gridRows: 5, gridCols: 5, minBlocks: 2, maxBlocks: 3, minLocks: 0, maxLocks: 1, moveLimit: 12 },
  // tier 1: levels 4–7
  { gridRows: 6, gridCols: 6, minBlocks: 3, maxBlocks: 4, minLocks: 1, maxLocks: 2, moveLimit: 14 },
  // tier 2: levels 8–12
  { gridRows: 6, gridCols: 6, minBlocks: 4, maxBlocks: 5, minLocks: 2, maxLocks: 3, moveLimit: 16 },
  // tier 3: levels 13+
  { gridRows: 7, gridCols: 7, minBlocks: 5, maxBlocks: 6, minLocks: 2, maxLocks: 4, moveLimit: 18 }
];

function getTier(levelNumber) {
  if (levelNumber <= 7)  return DIFFICULTY_TIERS[0];
  if (levelNumber <= 15)  return DIFFICULTY_TIERS[1];
  if (levelNumber <= 20) return DIFFICULTY_TIERS[2];
  return DIFFICULTY_TIERS[3];
}
