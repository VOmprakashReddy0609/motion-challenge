// js/engine/collision.js

// ── Ball passability ──────────────────────────────────────────────────────────
// The ball slides (not one step) until it hits a wall, block, or lock.
// The HOLE is passable — the ball enters it and wins.
// Blocks and locks are walls for the ball.

function isBallPassable(grid, r, c) {
  const rows = grid.length;
  const cols = grid[0].length;
  if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
  const cell = grid[r][c];
  // Ball can enter empty cells and the hole. Block cells and locks are walls.
  return cell === CELL_EMPTY || cell === CELL_HOLE;
}

// ── Block passability ─────────────────────────────────────────────────────────
// A block cell's target must be EMPTY or the HOLE (blocks can slide over hole).
// Ball cells, lock cells, other block cells, and out-of-bounds are walls.

function isBlockPassable(grid, r, c) {
  const rows = grid.length;
  const cols = grid[0].length;
  if (r < 0 || r >= rows || c < 0 || c >= cols) return false;
  const cell = grid[r][c];
  return cell === CELL_EMPTY || cell === CELL_HOLE;
}

// ── Can block slide one step in direction? ────────────────────────────────────
// Leading-edge algorithm:
//   For each cell in the block, compute where it would move.
//   If the destination is occupied by ANOTHER block's cell (not our own),
//   a lock, the ball, or is out of bounds → blocked.
//   Empty cells and the hole are passable for blocks.

function canBlockMove(grid, block, dir) {
  const rows = grid.length;
  const cols = grid[0].length;
  const { dr, dc } = DIRECTIONS[dir];

  const ownCells = new Set(block.cells.map(([r, c]) => r + "," + c));

  for (const [r, c] of block.cells) {
    const nr = r + dr;
    const nc = c + dc;

    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return false;
    const key  = nr + "," + nc;
    if (ownCells.has(key)) continue;   // moving into our own vacated cell — fine

    const cell = grid[nr][nc];
    // Ball is a wall for blocks
    if (cell === CELL_BALL) return false;
    // Lock is always a wall
    if (cell === CELL_LOCK) return false;
    // Another block's cell is a wall
    if (cell !== CELL_EMPTY && cell !== CELL_HOLE) return false;
  }

  return true;
}

// Returns all valid slide directions for a given block.
function getBlockMoves(grid, block) {
  return DIR_KEYS.filter(dir => canBlockMove(grid, block, dir));
}

// ── Find all same-colored adjacent blocks (connected group) ───────────────────
// Uses BFS on the blocks array to find all blocks that share the same color
// and are directly adjacent (touching) to each other.
// Returns an array of block objects that form the connected group.

function findConnectedBlocks(blocks, startBlock) {
  if (!startBlock) return [];

  const targetColor = startBlock.color;

  // Build a spatial lookup: "r,c" → blockId for quick adjacency checks
  const cellToBlock = {};
  for (const block of blocks) {
    for (const [r, c] of block.cells) {
      cellToBlock[r + "," + c] = block.id;
    }
  }

  const blockById = {};
  for (const b of blocks) blockById[b.id] = b;

  const visited = new Set();
  const queue   = [startBlock.id];
  visited.add(startBlock.id);

  while (queue.length > 0) {
    const currentId = queue.shift();
    const current   = blockById[currentId];
    if (!current) continue;

    // Check all 4 neighbours of every cell in this block
    for (const [r, c] of current.cells) {
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const key = (r + dr) + "," + (c + dc);
        const neighborId = cellToBlock[key];
        if (!neighborId || visited.has(neighborId)) continue;
        const neighbor = blockById[neighborId];
        if (neighbor && neighbor.color === targetColor) {
          visited.add(neighborId);
          queue.push(neighborId);
        }
      }
    }
  }

  return [...visited].map(id => blockById[id]);
}

// ── Can a group of blocks all slide one step in direction? ────────────────────
// Treats all blocks in the group as a single combined piece.
// The leading-edge algorithm is applied to the union of all cells.

function canBlockGroupMove(grid, groupBlocks, dir) {
  const rows = grid.length;
  const cols = grid[0].length;
  const { dr, dc } = DIRECTIONS[dir];

  // Union of all cells in the group
  const ownCells = new Set();
  for (const block of groupBlocks) {
    for (const [r, c] of block.cells) {
      ownCells.add(r + "," + c);
    }
  }

  for (const block of groupBlocks) {
    for (const [r, c] of block.cells) {
      const nr = r + dr;
      const nc = c + dc;

      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) return false;
      const key = nr + "," + nc;
      if (ownCells.has(key)) continue; // moving into our group's own vacated cell — fine

      const cell = grid[nr][nc];
      if (cell === CELL_BALL)  return false;
      if (cell === CELL_LOCK)  return false;
      if (cell !== CELL_EMPTY && cell !== CELL_HOLE) return false;
    }
  }

  return true;
}

// Returns all valid slide directions for a group of blocks.
function getBlockGroupMoves(grid, groupBlocks) {
  return DIR_KEYS.filter(dir => canBlockGroupMove(grid, groupBlocks, dir));
}

// ── Slide distance helper ─────────────────────────────────────────────────────
// How many steps can this piece (ball or block) slide before it must stop?
// Returns the maximum steps it can take (could be 0 if already blocked).
// Used by the auto-slide logic in movement.js.

function maxSlideSteps(grid, block, dir, isBall) {
  let steps = 0;
  // Clone grid and block state for simulation
  const simGrid   = cloneGrid(grid);
  const simBlock  = { ...block, cells: block.cells.map(c => [...c]), anchor: [...block.anchor] };

  while (true) {
    const canMove = isBall
      ? _canBallStepSim(simGrid, simBlock.cells[0][0], simBlock.cells[0][1], dir)
      : canBlockMove(simGrid, simBlock, dir);
    if (!canMove) break;

    // Advance the simulation by one step
    const { dr, dc } = DIRECTIONS[dir];
    if (isBall) {
      const [r, c] = simBlock.cells[0];
      simGrid[r][c] = CELL_EMPTY;
      simGrid[r + dr][c + dc] = CELL_BALL;
      simBlock.cells[0] = [r + dr, c + dc];
    } else {
      for (const [r, c] of simBlock.cells) simGrid[r][c] = CELL_EMPTY;
      simBlock.cells = simBlock.cells.map(([r, c]) => [r + dr, c + dc]);
      for (const [r, c] of simBlock.cells) simGrid[r][c] = simBlock.id;
    }
    steps++;
    if (steps > 20) break; // safety cap
  }
  return steps;
}

function _canBallStepSim(grid, r, c, dir) {
  const { dr, dc } = DIRECTIONS[dir];
  return isBallPassable(grid, r + dr, c + dc);
}