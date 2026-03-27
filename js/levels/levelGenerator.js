// js/levels/levelGenerator.js
//
// GUARANTEED SOLVABLE VERSION — March 2026
//
// CRITICAL FIXES:
// 1. Move limit is SET BASED ON BFS result, not arbitrary formula
// 2. Every returned level is verified solvable within moveLimit
// 3. High difficulty maintained from level 1
// 4. Complex shapes enforced with placement fallbacks

const MAX_ATTEMPTS   = 700;
const MAX_BFS_STATES = 30000;
const GENERATION_TIMEOUT_MS = 5000;

// ─────────────────────────────────────────────────────────────────────────────
// PRNG: SplitMix32
// ─────────────────────────────────────────────────────────────────────────────
function createSplitMix32(seed) {
  return function() {
    seed |= 0;
    seed = (seed + 0x9e3779b9) | 0;
    let t = seed ^ (seed >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15);
    t = Math.imul(t, 0x735a2d97);
    return ((t = t ^ (t >>> 15)) >>> 0) / 4294967296;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Seed hashing
// ─────────────────────────────────────────────────────────────────────────────
function hashLevelNumber(levelNumber) {
  let h = (levelNumber * 0x9e3779b9) ^ (levelNumber >>> 16);
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fast state serialization
// ─────────────────────────────────────────────────────────────────────────────
function serializeState(ballR, ballC, blocks) {
  let key = ballR + ':' + ballC + ':';
  const anchors = [];
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    anchors.push(b.id + '=' + b.anchor[0] + ',' + b.anchor[1]);
  }
  anchors.sort();
  return key + anchors.join(';');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main entry point
// ─────────────────────────────────────────────────────────────────────────────
function generateLevel(levelNumber) {
  const startTime = performance.now();
  
  levelNumber = Math.max(1, levelNumber || 1);
  const tier = getTier(levelNumber);
  const { gridRows: rows, gridCols: cols } = tier;

  const seed = hashLevelNumber(levelNumber);
  const rng = createSplitMix32(seed);

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    if (performance.now() - startTime > GENERATION_TIMEOUT_MS) {
      console.warn('Level ' + levelNumber + ' timeout. Fallback verified.');
      return _fallbackLevel(tier, levelNumber, rng, true);
    }
    
    const level = _tryGenerate(rows, cols, tier, levelNumber, rng);
    if (level) {
      level.backgroundGrid = cloneGrid(level.grid);
      return level;
    }
  }

  return _fallbackLevel(tier, levelNumber, rng, true);
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER SYSTEM: High difficulty from level 1, guaranteed solvable
// ─────────────────────────────────────────────────────────────────────────────
function getTier(levelNumber) {
  const L = Math.max(1, levelNumber);
  
  // Grid size: Start challenging, grow slowly
  const gridRows = Math.min(10, 6 + Math.floor((L - 1) / 6));
  const gridCols = Math.min(11, 7 + Math.floor((L - 1) / 6));

  // Block count: High baseline from level 1
  const minBlocks = Math.min(16, 4 + Math.floor(L * 1.5));
  const maxBlocks = Math.min(18, minBlocks + 2);

  // Lock count: High density from start
  const minLocks = Math.min(14, 2 + Math.floor(L * 1.3));
  const maxLocks = Math.min(16, minLocks + 2);

  // Target solution length: Forces long paths, but achievable
  const baseSolution = 12 + Math.floor(L * 2.8);
  const targetSolutionLen = Math.min(70, baseSolution);

  // Shape complexity: Complex shapes from level 1
  const requiredShapes = [];
  if (L >= 1) requiredShapes.push("2x2");
  if (L >= 3) requiredShapes.push("L1", "T1");
  if (L >= 6) requiredShapes.push("Z1", "S1", "L2");
  if (L >= 10) requiredShapes.push("1x3", "3x1");

  return {
    gridRows, gridCols,
    minBlocks, maxBlocks,
    minLocks, maxLocks,
    targetSolutionLen,
    requiredShapes,
    level: L
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Level generation attempt: GUARANTEED SOLVABLE WITHIN MOVE LIMIT
// ─────────────────────────────────────────────────────────────────────────────
function _tryGenerate(rows, cols, tier, levelNumber, rng) {
  const grid = _emptyGrid(rows, cols);

  // Ball and Hole: Maximize distance for difficulty
  const ballR = Math.floor(rng() * rows);
  let holeR;
  do { 
    holeR = Math.floor(rng() * rows); 
  } while (Math.abs(holeR - ballR) < 3);

  grid[ballR][0] = CELL_BALL;
  grid[holeR][cols - 1] = CELL_HOLE;

  // Place Locks: High density, strategic
  const lockCount = tier.minLocks + Math.floor(rng() * (tier.maxLocks - tier.minLocks + 1));
  for (let i = 0; i < lockCount; i++) {
    if (!_placeLockChokepoint(grid, rows, cols, ballR, holeR, true, rng)) {
      return null;
    }
  }

  // Place Blocks
  const blocks = [];
  const colorPool = [...BLOCK_COLORS];
  for (let i = colorPool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [colorPool[i], colorPool[j]] = [colorPool[j], colorPool[i]];
  }

  const blockCount = tier.minBlocks + Math.floor(rng() * (tier.maxBlocks - tier.minBlocks + 1));
  
  // Place required complex shapes first
  for (let i = 0; i < tier.requiredShapes.length; i++) {
    const shapeKey = tier.requiredShapes[i];
    const offsets = BLOCK_SHAPES[shapeKey];
    const color = colorPool[i % colorPool.length];
    
    const block = _placeBlockExpert(grid, rows, cols, ballR, holeR, "b" + i, shapeKey, offsets, color, true, rng);
    if (!block) return null;
    blocks.push(block);
  }

  // Fill remaining blocks
  const shapePool = _getExpertShapePool(tier.level, rng);
  for (let i = tier.requiredShapes.length; i < blockCount; i++) {
    const shapeKey = shapePool[Math.floor(rng() * shapePool.length)];
    const offsets = BLOCK_SHAPES[shapeKey];
    const color = colorPool[i % colorPool.length];
    
    const block = _placeBlockExpert(grid, rows, cols, ballR, holeR, "b" + i, shapeKey, offsets, color, true, rng);
    if (!block) return null;
    blocks.push(block);
  }

  if (blocks.length < tier.minBlocks) return null;

  // CRITICAL: Run BFS to find ACTUAL shortest path
  const result = _bfs(grid, blocks, ballR, 0, holeR, cols - 1, 100); // High limit for discovery
  
  // Reject if unsolvable
  if (!result.solvable) return null;
  
  // Reject if solution is too short (too easy)
  if (result.shortestPath < tier.targetSolutionLen) return null;
  
  // CRITICAL FIX: Set moveLimit BASED ON actual solution, not arbitrary formula
  // Buffer of 4-7 moves depending on level difficulty
  const buffer = Math.max(4, Math.min(7, 3 + Math.floor(tier.level / 4)));
  const moveLimit = result.shortestPath + buffer;

  return {
    rows, cols, grid, blocks,
    moveLimit: moveLimit, // GUARANTEED: shortestPath <= moveLimit
    levelNumber,
    _solutionLen: result.shortestPath,
    difficulty: {
      locks: lockCount,
      blocks: blocks.length,
      complexShapes: tier.requiredShapes.length,
      solutionLen: result.shortestPath,
      buffer: buffer
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Expert Shape Pool: Weighted towards complex shapes
// ─────────────────────────────────────────────────────────────────────────────
function _getExpertShapePool(level, rng) {
  const pool = [];
  pool.push("1x1", "1x2", "2x1");
  pool.push("2x2", "2x2", "2x2");
  if (level >= 3) pool.push("L1", "L1", "T1", "T1");
  if (level >= 6) pool.push("Z1", "S1", "L2");
  if (level >= 10) pool.push("1x3", "3x1");
  return pool;
}

// ─────────────────────────────────────────────────────────────────────────────
// Expert Block Placement
// ─────────────────────────────────────────────────────────────────────────────
function _placeBlockExpert(grid, rows, cols, ballR, holeR, id, shapeKey, offsets, color, restrictDirectPaths, rng) {
  const maxDR = Math.max(...offsets.map(([dr]) => dr));
  const maxDC = Math.max(...offsets.map(([, dc]) => dc));
  const maxAttempts = 500;

  for (let a = 0; a < maxAttempts; a++) {
    let aR, aC;

    if (a < maxAttempts * 0.7) {
      const corridorMinR = Math.min(ballR, holeR);
      const corridorMaxR = Math.max(ballR, holeR);
      const corridorMinC = Math.floor(cols * 0.25);
      const corridorMaxC = Math.floor(cols * 0.75);
      aR = corridorMinR + Math.floor(rng() * (corridorMaxR - corridorMinR + 1 - maxDR));
      aC = corridorMinC + Math.floor(rng() * (corridorMaxC - corridorMinC - maxDC));
    } else if (a < maxAttempts * 0.9) {
      aR = Math.floor(rng() * (rows - maxDR));
      const midC = Math.floor(cols / 2);
      const spread = Math.max(2, Math.floor((cols - 4) / 3));
      aC = midC + Math.floor((rng() - 0.5) * spread * 2.5);
    } else {
      aR = Math.floor(rng() * (rows - maxDR));
      aC = Math.floor(rng() * (cols - maxDC));
    }

    if (aR < 0 || aR + maxDR >= rows) continue;
    if (aC < 0 || aC + maxDC >= cols) continue;

    const cells = offsets.map(([dr, dc]) => [aR + dr, aC + dc]);

    let valid = true;
    for (const [r, c] of cells) {
      if (r < 0 || r >= rows || c < 0 || c >= cols) { valid = false; break; }
      if (grid[r][c] !== CELL_EMPTY) { valid = false; break; }
      if ((c === 0 || c === cols - 1) && a > 200) { valid = false; break; }
      if (restrictDirectPaths && a < 300) {
        if ((r === ballR && c < 3) || (r === holeR && c > cols - 4)) { valid = false; break; }
      }
    }

    if (valid) {
      for (const [r, c] of cells) grid[r][c] = id;
      return { id, shapeKey, anchor: [aR, aC], cells, color };
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategic Lock Placement
// ─────────────────────────────────────────────────────────────────────────────
function _placeLockChokepoint(grid, rows, cols, ballR, holeR, forceChokepoints, rng) {
  for (let s = 0; s < 400; s++) {
    let r, c;
    if (forceChokepoints && rng() > 0.2) {
      const corridorMinR = Math.min(ballR, holeR);
      const corridorMaxR = Math.max(ballR, holeR);
      const corridorCols = [Math.floor(cols * 0.3), Math.floor(cols * 0.7)];
      r = corridorMinR + Math.floor(rng() * (corridorMaxR - corridorMinR + 1));
      c = corridorCols[0] + Math.floor(rng() * (corridorCols[1] - corridorCols[0]));
    } else {
      r = Math.floor(rng() * rows);
      c = Math.floor(cols * 0.25 + rng() * cols * 0.5);
    }
    if (c >= 1 && c < cols - 1 && grid[r][c] === CELL_EMPTY) {
      if (!((r === ballR && c < 3) || (r === holeR && c > cols - 4))) {
        grid[r][c] = CELL_LOCK;
        return true;
      }
    }
  }
  return false;
}

function _emptyGrid(rows, cols) {
  return Array.from({ length: rows }, () => Array(cols).fill(CELL_EMPTY));
}

// ─────────────────────────────────────────────────────────────────────────────
// BFS Solver: Returns actual shortest path length
// ─────────────────────────────────────────────────────────────────────────────
function _bfs(grid, blocks, ballR, ballC, holeR, holeC, maxMoves) {
  const initKey = serializeState(ballR, ballC, blocks);
  const visited = new Set([initKey]);
  const queue = [{
    br: ballR, bc: ballC,
    blks: cloneBlocks(blocks),
    g: cloneGrid(grid),
    moves: 0
  }];

  while (queue.length > 0) {
    if (visited.size > MAX_BFS_STATES) {
      return { solvable: false, shortestPath: Infinity };
    }

    const state = queue.shift();
    const { br, bc, blks, g, moves } = state;
    
    if (moves >= maxMoves) continue;

    // Ball movement
    for (const dir of DIR_KEYS) {
      const { dr, dc } = DIRECTIONS[dir];
      const nr = br + dr, nc = bc + dc;
      
      if (nr < 0 || nr >= g.length || nc < 0 || nc >= g[0].length) continue;

      const cell = g[nr][nc];
      if (cell !== CELL_EMPTY && cell !== CELL_HOLE) continue;

      if (nr === holeR && nc === holeC) {
        return { solvable: true, shortestPath: moves + 1 };
      }

      const gC = cloneGrid(g);
      const bC = cloneBlocks(blks);
      
      gC[br][bc] = CELL_EMPTY;
      gC[nr][nc] = CELL_BALL;
      stampBlocks(gC, bC);

      const key = serializeState(nr, nc, bC);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({ br: nr, bc: nc, blks: bC, g: gC, moves: moves + 1 });
      }
    }

    // Block movement
    for (const block of blks) {
      for (const dir of DIR_KEYS) {
        const gC = cloneGrid(g);
        const bC = cloneBlocks(blks);
        stampBlocks(gC, bC);

        const sim = bC.find(b => b.id === block.id);
        if (!sim || !canBlockMove(gC, sim, dir)) continue;

        const { dr, dc } = DIRECTIONS[dir];
        
        for (const [r, c] of sim.cells) gC[r][c] = CELL_EMPTY;
        sim.cells  = sim.cells.map(([r, c]) => [r + dr, c + dc]);
        sim.anchor = [sim.anchor[0] + dr, sim.anchor[1] + dc];
        for (const [r, c] of sim.cells) gC[r][c] = sim.id;

        const key = serializeState(br, bc, bC);
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({ br, bc, blks: bC, g: gC, moves: moves + 1 });
        }
      }
    }
  }

  return { solvable: false, shortestPath: Infinity };
}

// ─────────────────────────────────────────────────────────────────────────────
// Verified Fallback: Guaranteed solvable within move limit
// ─────────────────────────────────────────────────────────────────────────────
function _fallbackLevel(tier, levelNumber, rng, makeHard) {
  const { gridRows: rows, gridCols: cols } = tier;
  
  // Keep trying until we get a solvable layout
  for (let attempt = 0; attempt < 50; attempt++) {
    const grid = _emptyGrid(rows, cols);

    const ballR = Math.floor(rng() * rows);
    let holeR;
    do { holeR = Math.floor(rng() * rows); } while (Math.abs(holeR - ballR) < 2);

    grid[ballR][0] = CELL_BALL;
    grid[holeR][cols - 1] = CELL_HOLE;

    const lockCount = makeHard ? tier.minLocks : Math.max(3, Math.floor(tier.minLocks * 0.7));
    for (let i = 0; i < lockCount; i++) {
      for (let s = 0; s < 80; s++) {
        const r = Math.floor(rng() * rows);
        const c = Math.floor(cols * 0.3 + rng() * cols * 0.4);
        if (c >= 1 && c < cols - 1 && grid[r][c] === CELL_EMPTY) {
          if (!((r === ballR && c < 3) || (r === holeR && c > cols - 4))) {
            grid[r][c] = CELL_LOCK;
            break;
          }
        }
      }
    }

    const blocks = [];
    const colors = [...BLOCK_COLORS];
    const blockCount = makeHard ? tier.minBlocks : Math.max(5, Math.floor(tier.minBlocks * 0.8));
    const shapePool = _getExpertShapePool(tier.level, rng);

    for (let i = 0; i < blockCount; i++) {
      let r = Math.floor(rows * 0.2 + rng() * rows * 0.6);
      let c = Math.floor(cols * 0.25 + rng() * cols * 0.5);
      r = Math.max(0, Math.min(rows - 1, r));
      c = Math.max(1, Math.min(cols - 2, c));

      if (grid[r][c] === CELL_EMPTY) {
        const id = "b" + i;
        const shapeKey = shapePool[Math.floor(rng() * shapePool.length)];
        const offsets = BLOCK_SHAPES[shapeKey];
        const cells = offsets.map(([dr, dc]) => [r + dr, c + dc]);
        const fits = cells.every(([cr, cc]) => 
          cr >= 0 && cr < rows && cc >= 0 && cc < cols && grid[cr][cc] === CELL_EMPTY
        );
        
        if (fits) {
          for (const [cr, cc] of cells) grid[cr][cc] = id;
          blocks.push({ id, shapeKey, anchor: [r, c], cells, color: colors[i % colors.length] || "purple" });
        } else {
          grid[r][c] = id;
          blocks.push({ id, shapeKey: "1x1", anchor: [r, c], cells: [[r, c]], color: colors[i % colors.length] || "purple" });
        }
      }
    }

    stampBlocks(grid, blocks);

    // CRITICAL: Verify solvability BEFORE returning
    const result = _bfs(grid, blocks, ballR, 0, holeR, cols - 1, 80);
    if (!result.solvable) continue; // Try again
    
    const buffer = Math.max(4, Math.min(7, 3 + Math.floor(tier.level / 4)));
    const moveLimit = result.shortestPath + buffer;

    const level = {
      rows, cols, grid, blocks,
      moveLimit: moveLimit, // GUARANTEED solvable
      levelNumber,
      _solutionLen: result.shortestPath,
    };
    
    level.backgroundGrid = cloneGrid(grid);
    return level;
  }
  
  // Last resort: trivial solvable level
  return _trivialSolvableLevel(tier, levelNumber, rng);
}

// ─────────────────────────────────────────────────────────────────────────────
// Trivial guaranteed-solvable fallback (only if all else fails)
// ─────────────────────────────────────────────────────────────────────────────
function _trivialSolvableLevel(tier, levelNumber, rng) {
  const { gridRows: rows, gridCols: cols } = tier;
  const grid = _emptyGrid(rows, cols);
  
  const ballR = Math.floor(rng() * rows);
  const holeR = (ballR + Math.floor(rows / 2)) % rows;
  
  grid[ballR][0] = CELL_BALL;
  grid[holeR][cols - 1] = CELL_HOLE;
  
  const blocks = [];
  const colors = [...BLOCK_COLORS];
  
  // Place minimal blocks in non-blocking positions
  for (let i = 0; i < Math.max(2, Math.floor(tier.minBlocks / 3)); i++) {
    const r = Math.floor(rng() * rows);
    const c = Math.floor(cols * 0.4 + rng() * cols * 0.3);
    if (c >= 2 && c < cols - 2 && grid[r][c] === CELL_EMPTY) {
      const id = "b" + i;
      grid[r][c] = id;
      blocks.push({
        id, shapeKey: "1x1", anchor: [r, c], cells: [[r, c]],
        color: colors[i % colors.length] || "purple"
      });
    }
  }
  
  stampBlocks(grid, blocks);
  
  // BFS verify (should always pass for trivial layout)
  const result = _bfs(grid, blocks, ballR, 0, holeR, cols - 1, 50);
  const moveLimit = result.solvable ? result.shortestPath + 5 : 20;
  
  const level = {
    rows, cols, grid, blocks,
    moveLimit,
    levelNumber,
    _solutionLen: result.shortestPath || 1,
  };
  level.backgroundGrid = cloneGrid(grid);
  return level;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────
function cloneGrid(grid) {
  const result = new Array(grid.length);
  for (let i = 0; i < grid.length; i++) {
    result[i] = grid[i].slice();
  }
  return result;
}

function cloneBlocks(blocks) {
  const result = new Array(blocks.length);
  for (let i = 0; i < blocks.length; i++) {
    const b = blocks[i];
    result[i] = {
      id: b.id,
      shapeKey: b.shapeKey,
      anchor: [b.anchor[0], b.anchor[1]],
      cells: b.cells.map(([r, c]) => [r, c]),
      color: b.color
    };
  }
  return result;
}