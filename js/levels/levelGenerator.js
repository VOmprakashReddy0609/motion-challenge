// js/levels/levelGenerator.js
//
// 🎯 HARDCODED LEVELS 1-15 — All levels manually designed for consistent gameplay
// No procedural generation — every level is hand-crafted for optimal puzzle design
//

const DEBUG = typeof window !== 'undefined' && window.DEBUG_LEVEL_GEN;

// ─────────────────────────────────────────────────────────────────────────────
// Main Entry Point
// ─────────────────────────────────────────────────────────────────────────────
function generateLevel(levelNumber) {
  levelNumber = Math.max(1, Math.min(15, levelNumber || 1));

  let level;
  
  switch(levelNumber) {
    case 1:
      level = _buildHardcodedLevel1();
      break;
    case 2:
      level = _buildHardcodedLevel2();
      break;
    case 3:
      level = _buildHardcodedLevel3();
      break;
    case 4:
      level = _buildHardcodedLevel4();  // This is actually your original level 5
      break;
    case 5:
      level = _buildHardcodedLevel5();  // This is actually your original level 6
      break;
    case 6:
      level = _buildHardcodedLevel6();  // This is actually your original level 7
      break;
    case 7:
      level = _buildHardcodedLevel7();  // This is actually your original level 8
      break;
    case 8:
      level = _buildHardcodedLevel8();  // This is actually your original level 9
      break;
    case 9:
      level = _buildHardcodedLevel9();  // This is actually your original level 10
      break;
    case 10:
      level = _buildHardcodedLevel10(); // This is actually your original level 11
      break;
    case 11:
      level = _buildHardcodedLevel11(); // This is actually your original level 12
      break;
    case 12:
      level = _buildHardcodedLevel12(); // This is actually your original level 13
      break;
    case 13:
      level = _buildHardcodedLevel13(); // This is actually your original level 14
      break;
    case 14:
      level = _buildHardcodedLevel14(); // This is actually your original level 15
      break;
    case 15:
      level = _buildHardcodedLevel15(); // New level 15
      break;
    case 16:
      level = _buildHardcodedLevel16(); // New level 16
      break;
    // case 17:
    //   level = _buildHardcodedLevel17(); // New level 17
    //   break;
    default:
      level = _buildHardcodedLevel1();
  }
  
  level.backgroundGrid = cloneGrid(level.grid);
  if (DEBUG) console.log(`✅ Loaded hardcoded level ${levelNumber}`);
  return level;
}

// ─────────────────────────────────────────────────────────────────────────────
// UNIVERSAL EXPORTS
// ─────────────────────────────────────────────────────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { generateLevel };
}
if (typeof window !== 'undefined') {
  window.generateLevel = generateLevel;
  window.LevelGenerator = { generateLevel };
  window.cloneGrid = cloneGrid;
  window.cloneBlocks = cloneBlocks;
  window.stampBlocks = stampBlocks;
  window.canBlockMove = canBlockMove;
  window.DIRECTIONS = DIRECTIONS;
  window.DIR_KEYS = DIR_KEYS;
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 1 — 6×5
// Ball: [5,0]  Hole: [0,4]
// ─────────────────────────────────────────────────────────────────────────────
function _buildHardcodedLevel1() {
  const rows = 6, cols = 5;
  const E = CELL_EMPTY, B = CELL_BALL, H = CELL_HOLE, L = CELL_LOCK;

  const grid = [
    [E,  E,  E,  E,  H],  // Row 0 - Hole at [0,4]
    [E,  E,  E,  E,  E],  // Row 1
    [E,  E,  E,  E,  L],  // Row 2 - Obstacle at [2,4]
    [E,  E,  E,  E,  E],  // Row 3
    [E,  E,  E,  E,  E],  // Row 4
    [B,  E,  E,  E,  L],  // Row 5 - Ball at [5,0], Obstacle at [5,4]
  ];

  const blocks = [
    { id: "b0", shapeKey: "1x3", anchor: [0, 1], 
      cells: [[0,1], [0,2], [0,3]], color: "yellow" },
    { id: "b1", shapeKey: "2x1", anchor: [1, 3], 
      cells: [[1,3], [2,3]], color: "purple" },
    { id: "b2", shapeKey: "1x3", anchor: [3, 0], 
      cells: [[3,0], [3,1], [3,2]], color: "yellow" },
    { id: "b3", shapeKey: "1x2", anchor: [3, 3], 
      cells: [[3,3], [3,4]], color: "green" },
    { id: "b4", shapeKey: "1x2", anchor: [5, 2], 
      cells: [[5,2], [5,3]], color: "blue" },
  ];

  return _finalizeHardcoded(grid, rows, cols, blocks, 5, 0, 0, 4, 1, 18);
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 2 — 6×5
// Ball: [2,0]  Hole: [2,4]
// ─────────────────────────────────────────────────────────────────────────────
function _buildHardcodedLevel2() {
  const rows = 6, cols = 5;
  const E = CELL_EMPTY, B = CELL_BALL, H = CELL_HOLE, L = CELL_LOCK;

  const grid = [
    [E,  E,  E,  E,  L],
    [E,  E,  L,  E,  E],
    [B,  E,  E,  E,  H],
    [E,  E,  L,  E,  E],
    [E,  E,  E,  E,  E],
    [E,  E,  E,  E,  E],
  ];

  const blocks = [
    { id: "b0", shapeKey: "3x1", anchor: [1, 1], 
      cells: [[1,1], [2,1], [3,1]], color: "blue" },
    { id: "b1", shapeKey: "2x1", anchor: [1, 3], 
      cells: [[1,3], [2,3]], color: "purple" },
    { id: "b2", shapeKey: "1x2", anchor: [4, 2], 
      cells: [[4,2], [4,3]], color: "orange" },
    { id: "b3", shapeKey: "1x1", anchor: [4, 0], 
      cells: [[4,0]], color: "teal" },
  ];

  return _finalizeHardcoded(grid, rows, cols, blocks, 2, 0, 2, 4, 2, 16);
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 3 — 6×5
// Ball: [5,0]  Hole: [5,4]
// ─────────────────────────────────────────────────────────────────────────────
function _buildHardcodedLevel3() {
  const rows = 6, cols = 5;
  const E = CELL_EMPTY, B = CELL_BALL, H = CELL_HOLE, L = CELL_LOCK;

  const grid = [
    [L,  E,  E,  E,  E],
    [L,  E,  E,  E,  E],
    [E,  E,  E,  E,  E],
    [E,  E,  E,  E,  E],
    [E,  E,  E,  E,  E],
    [B,  E,  E,  E,  H],
  ];

  const blocks = [
    { id: "b0", shapeKey: "1x3", anchor: [0, 1], 
      cells: [[0,1], [0,2], [0,3]], color: "yellow" },
    { id: "b1", shapeKey: "2x1", anchor: [1, 3], 
      cells: [[1,3], [2,3]], color: "purple" },
    { id: "b2", shapeKey: "1x3", anchor: [3, 1], 
      cells: [[3,1], [3,2], [3,3]], color: "yellow" },
    { id: "b3", shapeKey: "2x1", anchor: [4, 1], 
      cells: [[4,1], [5,1]], color: "green" },
    { id: "b4", shapeKey: "2x1", anchor: [4, 3], 
      cells: [[4,3], [5,3]], color: "blue" },
  ];

  return _finalizeHardcoded(grid, rows, cols, blocks, 5, 0, 5, 4, 3, 20);
}


function _buildHardcodedLevel4() {
  const rows = 5, cols = 3;
  const E = CELL_EMPTY, B = CELL_BALL, H = CELL_HOLE;
 
  const grid = [
    [E,  E, B],  // Ball at [0,3]
    [E,  E, E],
    [E,  E, E],
    [E,  E, E],
    [E,  H, E],  // Hole at [4,1]
  ];
 
  const blocks = [
    // Horizontal 1×2 bar — sits in row 1, cols 0-1
    { id: "b0", shapeKey: "1x2", anchor: [1, 0],
      cells: [[1,0], [1,1]], color: "yellow" },
    // Vertical 2×1 bar — sits in col 0, rows 2-3
    { id: "b1", shapeKey: "2x1", anchor: [2, 0],
      cells: [[2,0], [3,0]], color: "purple" },
    // 2×2 square — sits in rows 2-3, cols 2-3
    // Now fully interior with col 3 as the right edge of a 4-wide grid
    { id: "b2", shapeKey: "2x2", anchor: [2, 2],
      cells: [[2,1], [2,2], [3,1], [3,2]], color: "blue" },
  ];
 
  return _finalizeHardcoded(grid, rows, cols, blocks, 0, 2, 4, 1, 4, 18);
}
 
// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 5 — 6×4
// Ball: [4,3]  Hole: [0,1]

// ─────────────────────────────────────────────────────────────────────────────
function _buildHardcodedLevel5() {
  const rows = 6, cols = 4;
  const E = CELL_EMPTY, B = CELL_BALL, H = CELL_HOLE, L = CELL_LOCK;
 
  const grid = [
    [E,  H,  E,  E],  // Hole at [0,1]
    [E,  E,  E,  E],
    [E,  E,  E,  E],
    [E,  E,  L,  E],  // Lock at [3,2]
    [E,  E,  E,  B],  // Ball at [4,3] — moved from [4,2] to avoid lock shadow
    [E,  E,  E,  E],
  ];
 
  const blocks = [
    // Horizontal 1×3 bar — row 1, cols 0-2
    { id: "b0", shapeKey: "1x3", anchor: [1, 0],
      cells: [[1,0], [1,1], [1,2]], color: "yellow" },
    // Single cell — row 4, col 0
    { id: "b1", shapeKey: "1x1", anchor: [4, 0],
      cells: [[4,0]], color: "yellow" },
    // Vertical 2×1 bar — col 1, rows 2-3
    { id: "b2", shapeKey: "2x1", anchor: [2, 1],
      cells: [[2,1], [3,1]], color: "teal" },
    // Vertical 2×1 bar — col 1, rows 4-5
    { id: "b3", shapeKey: "2x1", anchor: [4, 1],
      cells: [[4,1], [5,1]], color: "purple" },
    // Single cell — row 3, col 3
    { id: "b4", shapeKey: "1x1", anchor: [3, 3],
      cells: [[3,3]], color: "blue" },
    // Horizontal 1×2 bar — row 5, cols 2-3
    { id: "b5", shapeKey: "1x2", anchor: [5, 2],
      cells: [[5,2], [5,3]], color: "orange" },
    // Horizontal 1×2 bar — row 2, cols 2-3
    { id: "b6", shapeKey: "1x2", anchor: [2, 2],
      cells: [[2,2], [2,3]], color: "green" },
  ];
 
  return _finalizeHardcoded(grid, rows, cols, blocks, 4, 3, 0, 1, 5, 24);
}
 

// LEVEL 6 — 7×5 (Original level 9 from your spec)
// Ball: [6,0]  Hole: [0,2]
// ─────────────────────────────────────────────────────────────────────────────
function _buildHardcodedLevel6() {
  const rows = 7, cols = 5;
  const E = CELL_EMPTY, B = CELL_BALL, H = CELL_HOLE;

  const grid = [
    [E,  E,  H,  E,  E],
    [E,  E,  E,  E,  E],
    [E,  E,  E,  E,  E],
    [E,  E,  E,  E,  E],
    [E,  E,  E,  E,  E],
    [E,  E,  E,  E,  E],
    [B,  E,  E,  E,  E],
  ];

  const blocks = [
    { id: "b0", shapeKey: "1x3", anchor: [1, 0], 
      cells: [[1,0], [1,1], [1,2]], color: "yellow" },
    { id: "b1", shapeKey: "2x2", anchor: [1, 3], 
      cells: [[1,3], [1,4], [2,3], [2,4]], color: "teal" },
    { id: "b2", shapeKey: "4x1", anchor: [2, 0], 
      cells: [[2,0], [3,0], [4,0], [5,0]], color: "blue" },
    { id: "b3", shapeKey: "3x1", anchor: [3, 1], 
      cells: [[3,1], [4,1], [5,1]], color: "purple" },
    { id: "b4", shapeKey: "2x1", anchor: [2, 2], 
      cells: [[2,2], [3,2]], color: "blue" },
    { id: "b5", shapeKey: "1x1", anchor: [4, 3], 
      cells: [[4,3]], color: "orange" },
    { id: "b6", shapeKey: "1x2", anchor: [5, 2], 
      cells: [[5,2], [5,3]], color: "green" },
  ];

  return _finalizeHardcoded(grid, rows, cols, blocks, 6, 0, 0, 2, 8, 30);
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 7 — 6×4 (Original level 10 from your spec)
// Ball: [5,0]  Hole: [0,3]
// ─────────────────────────────────────────────────────────────────────────────
function _buildHardcodedLevel7() {
  const rows = 6, cols = 4;
  const E = CELL_EMPTY, B = CELL_BALL, H = CELL_HOLE, L = CELL_LOCK;

  const grid = [
    [E,  E,  E,  H],
    [E,  L,  E,  E],
    [E,  E,  L,  E],
    [E,  E,  E,  E],
    [E,  E,  E,  E],
    [B,  E,  E,  E],
  ];

  const blocks = [
    { id: "b0", shapeKey: "3x1", anchor: [0, 0], 
      cells: [[0,0], [1,0], [2,0]], color: "yellow" },
    { id: "b1", shapeKey: "1x2", anchor: [1, 2], 
      cells: [[1,2], [1,3]], color: "green" },
    { id: "b2", shapeKey: "3x1", anchor: [3, 1], 
      cells: [[3,1], [4,1], [5,1]], color: "blue" },
    { id: "b3", shapeKey: "2x1", anchor: [4, 3], 
      cells: [[4,3], [5,3]], color: "purple" },
  ];

  return _finalizeHardcoded(grid, rows, cols, blocks, 5, 0, 0, 3, 9, 22);
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 8 — 4×4 (Original level 11 from your spec)
// Ball: [0,0]  Hole: [3,3]
// ─────────────────────────────────────────────────────────────────────────────
function _buildHardcodedLevel8() {
  const rows = 4, cols = 4;
  const E = CELL_EMPTY, B = CELL_BALL, H = CELL_HOLE;

  const grid = [
    [B,  E,  E,  E],
    [E,  E,  E,  E],
    [E,  E,  E,  E],
    [E,  E,  E,  H],
  ];

  const blocks = [
    { id: "b0", shapeKey: "1x3", anchor: [0, 1], 
      cells: [[0,1], [0,2], [0,3]], color: "yellow" },
    { id: "b1", shapeKey: "2x1", anchor: [1, 1], 
      cells: [[1,1], [2,1]], color: "purple" },
    { id: "b2", shapeKey: "2x1", anchor: [2, 0], 
      cells: [[2,0], [3,0]], color: "green" },
    { id: "b3", shapeKey: "1x2", anchor: [2, 2], 
      cells: [[2,2], [2,3]], color: "yellow" },
  ];

  return _finalizeHardcoded(grid, rows, cols, blocks, 0, 0, 3, 3, 10, 16);
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 9 — 4×4 (Original level 12 from your spec)
// Ball: [2,0]  Hole: [0,3]
// ─────────────────────────────────────────────────────────────────────────────
function _buildHardcodedLevel9() {
  const rows = 4, cols = 4;
  const E = CELL_EMPTY, B = CELL_BALL, H = CELL_HOLE;

  const grid = [
    [E,  E,  E,  H],
    [E,  E,  E,  E],
    [B,  E,  E,  E],
    [E,  E,  E,  E],
  ];

  const blocks = [
    { id: "b0", shapeKey: "1x2", anchor: [1, 0], 
      cells: [[1,0], [1,1]], color: "green" },
    { id: "b1", shapeKey: "2x1", anchor: [0, 2], 
      cells: [[0,2], [1,2]], color: "purple" },
    { id: "b2", shapeKey: "3x1", anchor: [1, 3], 
      cells: [[1,3], [2,3], [3,3]], color: "yellow" },
    { id: "b3", shapeKey: "1x3", anchor: [3, 0], 
      cells: [[3,0], [3,1], [3,2]], color: "yellow" },
  ];

  return _finalizeHardcoded(grid, rows, cols, blocks, 2, 0, 0, 3, 11, 18);
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 10 — 6×6 (Original level 13 from your spec)
// Ball: [0,0]  Hole: [5,5]
// ─────────────────────────────────────────────────────────────────────────────
function _buildHardcodedLevel10() {
  const rows = 6, cols = 6;
  const E = CELL_EMPTY, B = CELL_BALL, H = CELL_HOLE, L = CELL_LOCK;

  const grid = [
    [B,  E,  E,  E,  E,  E],
    [E,  E,  L,  E,  E,  E],
    [E,  E,  E,  E,  E,  E],
    [E,  E,  E,  E,  E,  E],
    [E,  E,  E,  E,  E,  E],
    [E,  E,  E,  E,  L,  H],
  ];

  const blocks = [
    { id: "b0", shapeKey: "2x1", anchor: [0, 1], 
      cells: [[0,1], [1,1]], color: "purple" },
    { id: "b1", shapeKey: "1x3", anchor: [0, 3], 
      cells: [[0,3], [0,4], [0,5]], color: "purple" },
    { id: "b2", shapeKey: "1x2", anchor: [2, 0], 
      cells: [[2,0], [2,1]], color: "teal" },
    { id: "b3", shapeKey: "3x1", anchor: [1, 4], 
      cells: [[1,4], [2,4], [3,4]], color: "green" },
    { id: "b4", shapeKey: "4x1", anchor: [1, 5], 
      cells: [[1,5], [2,5], [3,5], [4,5]], color: "orange" },
    { id: "b5", shapeKey: "1x2", anchor: [4, 3], 
      cells: [[4,3], [4,4]], color: "blue" },
  ];

  return _finalizeHardcoded(grid, rows, cols, blocks, 0, 0, 5, 5, 12, 28);
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 11 — 6×6 (Original level 14 from your spec)
// Ball: [2,4]  Hole: [5,5]
// ─────────────────────────────────────────────────────────────────────────────
function _buildHardcodedLevel11() {
  const rows = 6, cols = 6;
  const E = CELL_EMPTY, B = CELL_BALL, H = CELL_HOLE;

  const grid = [
    [E,  E,  E,  E,  E,  E],
    [E,  E,  E,  E,  E,  E],
    [E,  E,  E,  E,  B,  E],
    [E,  E,  E,  E,  E,  E],
    [E,  E,  E,  E,  E,  E],
    [E,  E,  E,  E,  E,  H],
  ];

  const blocks = [
    { id: "b0", shapeKey: "1x3", anchor: [0, 0], 
      cells: [[0,0], [0,1], [0,2]], color: "blue" },
    { id: "b1", shapeKey: "2x1", anchor: [1, 1], 
      cells: [[1,1], [2,1]], color: "purple" },
    { id: "b2", shapeKey: "1x3", anchor: [1, 2], 
      cells: [[1,2], [1,3], [1,4]], color: "yellow" },
    { id: "b3", shapeKey: "3x1", anchor: [2, 3], 
      cells: [[2,3], [3,3], [4,3]], color: "blue" },
    { id: "b4", shapeKey: "3x1", anchor: [2, 2], 
      cells: [[3,2], [4,2], [5,2]], color: "blue" },
    { id: "b5", shapeKey: "1x2", anchor: [3, 4], 
      cells: [[3,4], [4,4]], color: "teal" },
    { id: "b6", shapeKey: "1x2", anchor: [3, 1], 
      cells: [[3,0], [3,1]], color: "teal" },
    { id: "b7", shapeKey: "2x1", anchor: [4, 0], 
      cells: [[4,0], [5,0]], color: "green" },
    { id: "b8", shapeKey: "1x2", anchor: [5, 2], 
      cells: [[5,3], [5,4]], color: "green" },
    { id: "b9", shapeKey: "4x1", anchor: [0, 5], 
      cells: [[0,5], [1,5], [2,5], [3,5]], color: "orange" },
  ];

  return _finalizeHardcoded(grid, rows, cols, blocks, 2, 4, 5, 5, 13, 35);
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 12 — 6×6 (Original level 15 from your spec)
// Ball: [5,0]  Hole: [0,0]
// ─────────────────────────────────────────────────────────────────────────────
function _buildHardcodedLevel12() {
  const rows = 6, cols = 6;
  const E = CELL_EMPTY, B = CELL_BALL, H = CELL_HOLE, L = CELL_LOCK;

  const grid = [
    [H,  E,  E,  E,  E,  E],
    [L,  E,  E,  E,  E,  E],
    [E,  E,  E,  E,  E,  E],
    [L,  E,  E,  E,  E,  E],
    [E,  E,  E,  E,  E,  E],
    [B,  E,  E,  E,  E,  E],
  ];

  const blocks = [
    { id: "b0", shapeKey: "1x2", anchor: [0, 2], 
      cells: [[0,2], [0,3]], color: "purple" },
    { id: "b1", shapeKey: "1x2", anchor: [1, 3], 
      cells: [[1,3], [1,4]], color: "yellow" },
    { id: "b2", shapeKey: "3x1", anchor: [2, 0], 
      cells: [[2,0], [3,0], [4,0]], color: "green" },
    { id: "b3", shapeKey: "1x2", anchor: [3, 1], 
      cells: [[3,1], [3,2]], color: "purple" },
    { id: "b4", shapeKey: "4x1", anchor: [2, 5], 
      cells: [[2,5], [3,5], [4,5], [5,5]], color: "orange" },
    { id: "b5", shapeKey: "1x2", anchor: [5, 2], 
      cells: [[5,2], [5,3]], color: "blue" },
  ];

  return _finalizeHardcoded(grid, rows, cols, blocks, 5, 0, 0, 0, 14, 32);
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 13 — New level (custom design)
// Ball: [0,0]  Hole: [5,5]
// ─────────────────────────────────────────────────────────────────────────────
function _buildHardcodedLevel13() {
  const rows = 6, cols = 6;
  const E = CELL_EMPTY, B = CELL_BALL, H = CELL_HOLE, L = CELL_LOCK;

  const grid = [
    [B,  E,  E,  E,  E,  E],
    [E,  E,  E,  E,  E,  E],
    [E,  E,  L,  E,  E,  E],
    [E,  E,  L,  E,  E,  E],
    [E,  E,  E,  E,  E,  E],
    [E,  E,  E,  E,  E,  H],
  ];

  const blocks = [
    { id: "b0", shapeKey: "2x2", anchor: [0, 2], 
      cells: [[0,2], [0,3], [1,2], [1,3]], color: "purple" },
    { id: "b1", shapeKey: "3x1", anchor: [2, 4], 
      cells: [[2,4], [3,4], [4,4]], color: "green" },
    { id: "b2", shapeKey: "1x3", anchor: [4, 1], 
      cells: [[4,1], [4,2], [4,3]], color: "orange" },
    { id: "b3", shapeKey: "2x1", anchor: [3, 0], 
      cells: [[3,0], [4,0]], color: "blue" },
    { id: "b4", shapeKey: "1x2", anchor: [5, 3], 
      cells: [[5,3], [5,4]], color: "yellow" },
  ];

  return _finalizeHardcoded(grid, rows, cols, blocks, 0, 0, 5, 5, 15, 30);
}
// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 14 — 6×6
// Ball: [5,0]  Hole: [0,5]
// ─────────────────────────────────────────────────────────────────────────────
function _buildHardcodedLevel14() {
  const rows = 6, cols = 6;
  const E = CELL_EMPTY, B = CELL_BALL, H = CELL_HOLE, L = CELL_LOCK;

  const grid = [
    [E,  E,  E,  E,  E,  H],  // Row 0 - Hole at [0,5]
    [E,  E,  E,  E,  E,  E],  // Row 1
    [E,  E,  E,  E,  E,  L],  // Row 2 - Obstacle at [2,5]
    [E,  E,  E,  E,  E,  E],  // Row 3
    [E,  E,  E,  E,  E,  E],  // Row 4
    [B,  E,  E,  E,  E,  L],  // Row 5 - Ball at [5,0], Obstacle at [5,5]
  ];

  const blocks = [
    // Block 1: 1×2 (brown) at [0,0], [0,1]
    { id: "b0", shapeKey: "1x2", anchor: [0, 0], 
      cells: [[0,0], [0,1]], color: "yellow" },
    
    // Block 2: 1×2 (purple) at [0,2], [0,3]
    { id: "b1", shapeKey: "1x2", anchor: [0, 2], 
      cells: [[0,2], [0,3]], color: "purple" },
    
    // Block 3: 4×1 (orange) at [1,2], [2,2], [3,2], [4,2]
    { id: "b2", shapeKey: "4x1", anchor: [1, 2], 
      cells: [[1,2], [2,2], [3,2], [4,2]], color: "orange" },
    
    // Block 4: 3×1 (green) at [1,3], [2,3], [3,3]
    { id: "b3", shapeKey: "3x1", anchor: [1, 3], 
      cells: [[1,3], [2,3], [3,3]], color: "green" },
    
    // Block 5: 1×1 (blue) at [1,5]
    { id: "b4", shapeKey: "1x1", anchor: [1, 5], 
      cells: [[1,5]], color: "blue" },
    
    // Block 6: 2×1 (blue) at [3,4], [4,4]
    { id: "b5", shapeKey: "2x1", anchor: [3, 4], 
      cells: [[3,4], [4,4]], color: "blue" },
  ];

  return _finalizeHardcoded(grid, rows, cols, blocks, 5, 0, 0, 5, 15, 30);
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 15 — 6×6
// Ball: [5,0]  Hole: [0,5]
// ─────────────────────────────────────────────────────────────────────────────
function _buildHardcodedLevel15() {
  const rows = 6, cols = 6;
  const E = CELL_EMPTY, B = CELL_BALL, H = CELL_HOLE;

  const grid = [
    [E,  E,  E,  E,  E,  H],  // Row 0 - Hole at [0,5]
    [E,  E,  E,  E,  E,  E],  // Row 1
    [E,  E,  E,  E,  E,  E],  // Row 2
    [E,  E,  E,  E,  E,  E],  // Row 3
    [E,  E,  E,  E,  E,  E],  // Row 4
    [B,  E,  E,  E,  E,  E],  // Row 5 - Ball at [5,0]
  ];

  const blocks = [
    // Block 1: 1×3 (blue) at [0,0], [0,1], [0,2]
    { id: "b0", shapeKey: "1x3", anchor: [0, 0], 
      cells: [[0,0], [0,1], [0,2]], color: "blue" },
    
    // Block 2: 1×2 (purple) at [0,3], [0,4]
    { id: "b1", shapeKey: "1x2", anchor: [0, 3], 
      cells: [[0,3], [0,4]], color: "purple" },
    
    // Block 3: 3×1 (orange) at [1,2], [2,2], [3,2]
    { id: "b2", shapeKey: "3x1", anchor: [1, 2], 
      cells: [[1,2], [2,2], [3,2]], color: "orange" },
    
    // Block 4: 2×1 (green) at [1,3], [2,3]
    { id: "b3", shapeKey: "2x1", anchor: [1, 3], 
      cells: [[1,3], [2,3]], color: "green" },
    
    // Block 5: 2×1 (purple) at [2,5], [3,5]
    { id: "b4", shapeKey: "2x1", anchor: [2, 5], 
      cells: [[2,5], [3,5]], color: "purple" },
    
    // Block 6: 1×3 (blue) at [2,0], [2,1], [2,2]
    { id: "b5", shapeKey: "1x3", anchor: [2, 0], 
      cells: [[2,0], [2,1], [2,2]], color: "blue" },
    
    // Block 7: 2×1 (green) at [4,2], [5,2]
    { id: "b6", shapeKey: "2x1", anchor: [4, 2], 
      cells: [[4,2], [5,2]], color: "green" },
    
    // Block 8: 2×1 (brown) at [4,3], [5,3]
    { id: "b7", shapeKey: "2x1", anchor: [4, 3], 
      cells: [[4,3], [5,3]], color: "yellow" },
  ];

  return _finalizeHardcoded(grid, rows, cols, blocks, 5, 0, 0, 5, 16, 38);
}

// ─────────────────────────────────────────────────────────────────────────────
// LEVEL 16 — 6×6
// Ball: [0,0]  Hole: [5,5]
// ─────────────────────────────────────────────────────────────────────────────
function _buildHardcodedLevel16() {
  const rows = 6, cols = 6;
  const E = CELL_EMPTY, B = CELL_BALL, H = CELL_HOLE;

  const grid = [
    [B,  E,  E,  E,  E,  E],  // Row 0 - Ball at [0,0]
    [E,  E,  E,  E,  E,  E],  // Row 1
    [E,  E,  E,  E,  E,  E],  // Row 2
    [E,  E,  E,  E,  E,  E],  // Row 3
    [E,  E,  E,  E,  E,  E],  // Row 4
    [E,  E,  E,  E,  E,  H],  // Row 5 - Hole at [5,5]
  ];

  const blocks = [
    // Block 1: 1×2 (brown) at [0,1], [0,2]
    { id: "b0", shapeKey: "1x2", anchor: [0, 1], 
      cells: [[0,1], [0,2]], color: "teal" },
    
    // Block 2: 2×1 (purple) at [1,2], [2,2]
    { id: "b1", shapeKey: "2x1", anchor: [1, 2], 
      cells: [[1,2], [2,2]], color: "purple" },
    
    // Block 3: 3×1 (blue) at [1,3], [2,3], [3,3]
    { id: "b2", shapeKey: "3x1", anchor: [1, 3], 
      cells: [[1,3], [2,3], [3,3]], color: "yellow" },
    
    // Block 4: 4×1 (orange) at [0,4], [1,4], [2,4], [3,4]
    { id: "b3", shapeKey: "4x1", anchor: [0, 4], 
      cells: [[0,4], [1,4], [2,4], [3,4]], color: "orange" },
    
    // Block 5: 1×2 (green) at [2,0], [2,1]
    { id: "b4", shapeKey: "1x2", anchor: [2, 0], 
      cells: [[2,0], [2,1]], color: "green" },
    
    // Block 6: 2×1 (brown) at [3,1], [4,1]
    { id: "b5", shapeKey: "2x1", anchor: [3, 1], 
      cells: [[3,1], [4,1]], color: "teal" },
    
    // Block 7: 1×3 (blue) at [4,2], [4,3], [4,4]
    { id: "b6", shapeKey: "1x3", anchor: [4, 2], 
      cells: [[4,2], [4,3], [4,4]], color: "blue" },
    
    // Block 8: 1×2 (green) at [5,2], [5,3]
    { id: "b7", shapeKey: "1x2", anchor: [5, 2], 
      cells: [[5,2], [5,3]], color: "green" },
    
    // Block 9: 2×1 (purple) at [4,0], [5,0]
    { id: "b8", shapeKey: "2x1", anchor: [4, 0], 
      cells: [[4,0], [5,0]], color: "purple" },
  ];

  return _finalizeHardcoded(grid, rows, cols, blocks, 0, 0, 5, 5, 17, 42);
}
// ─────────────────────────────────────────────────────────────────────────────
// Shared finalizer for hardcoded levels
// ─────────────────────────────────────────────────────────────────────────────
function _finalizeHardcoded(grid, rows, cols, blocks, ballR, ballC, holeR, holeC, levelNumber, moveLimit) {
  // Stamp block cells into grid
  for (const block of blocks) {
    for (const [r, c] of block.cells) {
      if (r >= 0 && r < rows && c >= 0 && c < cols) {
        grid[r][c] = block.id;
      }
    }
  }

  // Ensure ball and hole are correctly set
  grid[ballR][ballC] = CELL_BALL;
  grid[holeR][holeC] = CELL_HOLE;

  const level = {
    rows, cols, grid, blocks,
    moveLimit: moveLimit,
    levelNumber,
    _solutionLen: null,
    hardcoded: true
  };
  
  level.backgroundGrid = cloneGrid(level.grid);
  return level;
}

// ─────────────────────────────────────────────────────────────────────────────
// UTILITIES
// ─────────────────────────────────────────────────────────────────────────────
function cloneGrid(grid) { 
  return grid.map(row => row.slice()); 
}

function cloneBlocks(blocks) {
  return blocks.map(b => ({
    id: b.id, shapeKey: b.shapeKey,
    anchor: [...b.anchor],
    cells: b.cells.map(([r, c]) => [r, c]),
    color: b.color,
    placementType: b.placementType
  }));
}

function stampBlocks(grid, blocks) {
  for (let r = 0; r < grid.length; r++) {
    for (let c = 0; c < grid[0].length; c++) {
      const val = grid[r][c];
      if (typeof val === 'string' && val.startsWith('b')) {
        grid[r][c] = CELL_EMPTY;
      }
    }
  }
  for (const block of blocks) {
    for (const [r, c] of block.cells) {
      if (r >= 0 && r < grid.length && c >= 0 && c < grid[0].length) {
        grid[r][c] = block.id;
      }
    }
  }
}

function canBlockMove(grid, block, dir) {
  const { dr, dc } = DIRECTIONS[dir];
  for (const [r, c] of block.cells) {
    const nr = r + dr, nc = c + dc;
    if (nr < 0 || nr >= grid.length || nc < 0 || nc >= grid[0].length) return false;
    const cell = grid[nr][nc];
    if (cell !== CELL_EMPTY && cell !== CELL_HOLE && cell !== CELL_BALL) {
      const isSelf = block.cells.some(([cr, cc]) => cr === nr && cc === nc);
      if (!isSelf) return false;
    }
  }
  return true;
}
