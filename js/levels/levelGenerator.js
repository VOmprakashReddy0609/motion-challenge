// js/levels/levelGenerator.js
//
// 🎯 STRATEGIC BLOCK PLACEMENT — GUARANTEED SOLVABLE
// March 2026 • Every block has purpose, every level has solution
//
// KEY FIXES:
// • Blocks validated for movability BEFORE placement
// • Escape routes guaranteed for every placed block
// • Path connectivity verified after each placement
// • Complex shapes placed only in "movable zones"
// • Post-placement solvability check with repair

const MAX_ATTEMPTS   = 600;
const MAX_BFS_STATES = 30000;
const GENERATION_TIMEOUT_MS = 3500;
const BFS_DISCOVERY_LIMIT = 150;

const DEBUG = typeof window !== 'undefined' && window.DEBUG_LEVEL_GEN;

// ─────────────────────────────────────────────────────────────────────────────
// PRNG & Hashing
// ─────────────────────────────────────────────────────────────────────────────
function createSplitMix32(seed) {
  return function() {
    seed |= 0; seed = (seed + 0x9e3779b9) | 0;
    let t = seed ^ (seed >>> 16);
    t = Math.imul(t, 0x21f0aaad);
    t = t ^ (t >>> 15); t = Math.imul(t, 0x735a2d97);
    return ((t = t ^ (t >>> 15)) >>> 0) / 4294967296;
  };
}

function hashLevelNumber(levelNumber) {
  let h = (levelNumber * 0x9e3779b9) ^ (levelNumber >>> 16);
  h = Math.imul(h, 0x85ebca6b); h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35); h ^= h >>> 16;
  return h >>> 0;
}

function serializeState(ballR, ballC, blocks) {
  let key = ballR + ':' + ballC + ':';
  const anchors = blocks.map(b => b.id + '=' + b.anchor[0] + ',' + b.anchor[1]).sort();
  return key + anchors.join(';');
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Entry Point
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
      if (DEBUG) console.warn('Level ' + levelNumber + ' timeout → fallback');
      return _fallbackLevel(tier, levelNumber, rng, true);
    }
    const level = _tryGenerate(rows, cols, tier, levelNumber, rng);
    if (level) {
      level.backgroundGrid = cloneGrid(level.grid);
      if (DEBUG) console.log(`✅ L${levelNumber}: ${level.rows}x${level.cols} blocks:${level.blocks.length} sol:${level._solutionLen} limit:${level.moveLimit}`);
      return level;
    }
  }
  if (DEBUG) console.warn('Level ' + levelNumber + ' max attempts → fallback');
  return _fallbackLevel(tier, levelNumber, rng, true);
}

// ─────────────────────────────────────────────────────────────────────────────
// TIER SYSTEM
// ─────────────────────────────────────────────────────────────────────────────
function getTier(levelNumber) {
  const L = Math.max(1, levelNumber);
  const gridRows = Math.min(9, 5 + Math.min(4, Math.floor((L - 1) / 4)));
  const gridCols = Math.min(10, 6 + Math.min(4, Math.floor((L - 1) / 4)));
  const minBlocks = Math.min(16, 3 + L + Math.floor(L * 0.4));
  const maxBlocks = Math.min(18, minBlocks + 2);
  const minLocks = Math.min(12, 1 + Math.floor(L * 0.9));
  const maxLocks = Math.min(14, minLocks + 1);
  const targetSolutionLen = Math.min(60, 8 + L * 2 + Math.floor(L * 0.8));

  const requiredShapes = [];
  if (L >= 1) requiredShapes.push("2x2");
  if (L >= 4) requiredShapes.push("L1", "T1");
  if (L >= 7) requiredShapes.push("Z1", "S1");
  if (L >= 10) requiredShapes.push("1x3", "3x1");

  const features = {
    chokepointGates: L >= 2, forcedDetours: L >= 3,
    multiStepClearance: L >= 6, trapZones: L >= 8,
    symmetricObstruction: L >= 10
  };

  return { gridRows, gridCols, minBlocks, maxBlocks, minLocks, maxLocks, targetSolutionLen, requiredShapes, features, level: L };
}

// ─────────────────────────────────────────────────────────────────────────────
// 🎯 CORE GENERATION — With SOLVABLE block placement
// ─────────────────────────────────────────────────────────────────────────────
function _tryGenerate(rows, cols, tier, levelNumber, rng) {
  const grid = _emptyGrid(rows, cols);
  const ballR = Math.floor(rng() * rows);
  let holeR; do { holeR = Math.floor(rng() * rows); } while (Math.abs(holeR - ballR) < 2);
  grid[ballR][0] = CELL_BALL; grid[holeR][cols - 1] = CELL_HOLE;

  // Place locks first (they're static obstacles)
  const lockCount = tier.minLocks + Math.floor(rng() * (tier.maxLocks - tier.minLocks + 1));
  _placeStrategicLocks(grid, rows, cols, ballR, holeR, lockCount, tier.features, rng);

  // 🎯 PLACE BLOCKS WITH SOLVABILITY GUARANTEE
  const blocks = [];
  const colorPool = [...BLOCK_COLORS]; _shuffleArray(colorPool, rng);
  const blockCount = tier.minBlocks + Math.floor(rng() * (tier.maxBlocks - tier.minBlocks + 1));

  // Place required shapes with movability validation
  for (let i = 0; i < tier.requiredShapes.length; i++) {
    const shapeKey = tier.requiredShapes[i];
    const offsets = BLOCK_SHAPES[shapeKey];
    const color = colorPool[i % colorPool.length];
    
    const block = _placeSolvableBlock(grid, rows, cols, ballR, holeR, blocks,
      "b" + i, shapeKey, offsets, color, "required", tier.features, rng);
    if (!block) return null; // Fast fail if critical block can't be placed solvably
    blocks.push(block);
  }

  // Fill remaining blocks with solvability checks
  const shapePool = _getStrategicShapePool(tier.level, rng);
  for (let i = tier.requiredShapes.length; i < blockCount; i++) {
    const shapeKey = shapePool[Math.floor(rng() * shapePool.length)];
    const offsets = BLOCK_SHAPES[shapeKey];
    const color = colorPool[i % colorPool.length];
    const placementType = _selectPlacementStrategy(i, blockCount, tier.features, rng);
    
    const block = _placeSolvableBlock(grid, rows, cols, ballR, holeR, blocks,
      "b" + i, shapeKey, offsets, color, placementType, tier.features, rng);
    if (!block) return null;
    blocks.push(block);
  }

  if (blocks.length < tier.minBlocks) return null;

  // 🎯 BFS validation
  const result = _bfs(grid, blocks, ballR, 0, holeR, cols - 1, BFS_DISCOVERY_LIMIT);
  if (!result.solvable) return null;
  if (tier.level >= 4 && result.shortestPath < tier.targetSolutionLen * 0.7) return null;

  // Repair if too complex
  if (result.shortestPath > tier.targetSolutionLen) {
    const repaired = _repairLevel(grid, blocks, ballR, holeR, cols, tier, rng);
    if (repaired && _verifySolvable(repaired.grid, repaired.blocks, ballR, 0, holeR, cols - 1, repaired.moveLimit)) {
      return repaired;
    }
    return null;
  }

  const baseBuffer = tier.level < 4 ? 4 : 5;
  const strategyBuffer = _calculateStrategyBuffer(blocks, tier.features);
  const buffer = Math.min(12, baseBuffer + strategyBuffer);
  const moveLimit = result.shortestPath + buffer;

  if (!_verifySolvable(grid, blocks, ballR, 0, holeR, cols - 1, moveLimit)) return null;

  return {
    rows, cols, grid, blocks, moveLimit, levelNumber, _solutionLen: result.shortestPath,
    difficulty: {
      locks: lockCount, blocks: blocks.length,
      complexShapes: blocks.filter(b => b.shapeKey !== "1x1").length,
      solutionLen: result.shortestPath, buffer,
      strategyScore: _calculateStrategyScore(blocks, grid, ballR, holeR, tier.features)
    }
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// 🎯 KEY FIX: Place block ONLY if it remains movable and solvable
// ─────────────────────────────────────────────────────────────────────────────
function _placeSolvableBlock(grid, rows, cols, ballR, holeR, existingBlocks, id, shapeKey, offsets, color, placementType, features, rng) {
  const maxDR = Math.max(...offsets.map(([dr]) => dr));
  const maxDC = Math.max(...offsets.map(([, dc]) => dc));
  const maxAttempts = placementType === "required" ? 800 : 500;

  for (let a = 0; a < maxAttempts; a++) {
    let aR, aC;

    // Strategic positioning
    switch(placementType) {
      case "required": case "chokepoint":
        aR = _biasedRandom(Math.min(ballR, holeR), Math.max(ballR, holeR) - maxDR, 0.7, rng);
        aC = Math.floor(cols * 0.3) + Math.floor(rng() * (cols * 0.4 - maxDC)); break;
      case "detour": aR = ballR + Math.floor(rng() * 3) - 1; aC = 3 + Math.floor(rng() * 2); break;
      case "clearance": aR = Math.floor(rng() * (rows - maxDR)); aC = Math.floor(cols * 0.4 + rng() * cols * 0.3 - maxDC); break;
      case "trap": aR = holeR + Math.floor(rng() * 3) - 1; aC = cols - 5 + Math.floor(rng() * 3); break;
      default:
        if (a < maxAttempts * 0.6) {
          aR = _biasedRandom(Math.max(0, Math.min(ballR, holeR) - 1), Math.min(rows - maxDR - 1, Math.max(ballR, holeR) + 1), 0.6, rng);
          aC = Math.floor(cols * 0.25) + Math.floor(rng() * (cols * 0.5 - maxDC));
        } else { aR = Math.floor(rng() * (rows - maxDR)); aC = Math.floor(rng() * (cols - maxDC)); }
    }

    // Bounds check
    if (aR < 0 || aR + maxDR >= rows || aC < 0 || aC + maxDC >= cols) continue;

    const cells = offsets.map(([dr, dc]) => [aR + dr, aC + dc]);
    
    // Collision check
    let valid = true;
    for (const [r, c] of cells) {
      if (r < 0 || r >= rows || c < 0 || c >= cols) { valid = false; break; }
      if (grid[r][c] !== CELL_EMPTY) { valid = false; break; }
      if ((c === 0 || c === cols - 1) && a < 400) { valid = false; break; }
    }
    if (!valid) continue;

    // 🎯 CRITICAL: Check if block can move AFTER placement (at least one direction)
    if (!_blockHasEscapeRoute(grid, rows, cols, cells, shapeKey)) continue;

    // 🎯 CRITICAL: Check if placement isolates ball or hole
    const testGrid = cloneGrid(grid);
    for (const [r, c] of cells) testGrid[r][c] = id;
    if (!_floodFillReachable(testGrid, rows, cols, ballR, 0, holeR, cols - 1)) continue;

    // 🎯 CRITICAL: Quick BFS to verify solvability with this block
    const testBlocks = [...existingBlocks, { id, shapeKey, anchor: [aR, aC], cells, color }];
    const quickResult = _bfsQuick(testGrid, testBlocks, ballR, 0, holeR, cols - 1, 50);
    if (!quickResult.solvable) continue;

    // ✅ All checks passed — place the block
    for (const [r, c] of cells) grid[r][c] = id;
    return { id, shapeKey, anchor: [aR, aC], cells, color, placementType };
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// 🎯 CHECK: Does this block have at least one valid move direction?
// ─────────────────────────────────────────────────────────────────────────────
function _blockHasEscapeRoute(grid, rows, cols, cells, shapeKey) {
  // Check each of 4 directions for at least one valid move
  for (const dir of DIR_KEYS) {
    const { dr, dc } = DIRECTIONS[dir];
    let canMove = true;
    
    for (const [r, c] of cells) {
      const nr = r + dr, nc = c + dc;
      // Bounds check
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) { canMove = false; break; }
      // Collision check (allow empty, hole, ball)
      const cell = grid[nr][nc];
      if (cell !== CELL_EMPTY && cell !== CELL_HOLE && cell !== CELL_BALL) {
        // Allow moving into cells occupied by same block (will be vacated)
        if (typeof cell === 'string' && cells.some(([cr, cc]) => cr === nr && cc === nc)) continue;
        canMove = false; break;
      }
    }
    if (canMove) return true; // Found at least one escape route
  }
  return false; // Block is trapped — cannot move in any direction
}

// ─────────────────────────────────────────────────────────────────────────────
// 🎯 QUICK BFS for pre-placement solvability check (limited depth)
// ─────────────────────────────────────────────────────────────────────────────
function _bfsQuick(grid, blocks, ballR, ballC, holeR, holeC, maxDepth) {
  const initKey = serializeState(ballR, ballC, blocks);
  const visited = new Set([initKey]);
  const queue = [{ br: ballR, bc: ballC, blks: cloneBlocks(blocks), g: cloneGrid(grid), moves: 0 }];

  while (queue.length > 0) {
    const state = queue.shift();
    const { br, bc, blks, g, moves } = state;
    if (moves >= maxDepth) continue;

    // Ball moves
    for (const dir of DIR_KEYS) {
      const { dr, dc } = DIRECTIONS[dir];
      const nr = br + dr, nc = bc + dc;
      if (nr < 0 || nr >= g.length || nc < 0 || nc >= g[0].length) continue;
      const cell = g[nr][nc];
      if (cell !== CELL_EMPTY && cell !== CELL_HOLE) continue;
      if (nr === holeR && nc === holeC) return { solvable: true };

      const gC = cloneGrid(g), bC = cloneBlocks(blks);
      gC[br][bc] = CELL_EMPTY; gC[nr][nc] = CELL_BALL;
      stampBlocks(gC, bC);
      const key = serializeState(nr, nc, bC);
      if (!visited.has(key)) { visited.add(key); queue.push({ br: nr, bc: nc, blks: bC, g: gC, moves: moves + 1 }); }
    }

    // Block moves (limited)
    for (const block of blks.slice(0, 3)) { // Only check first 3 blocks for speed
      for (const dir of DIR_KEYS) {
        const gC = cloneGrid(g), bC = cloneBlocks(blks);
        stampBlocks(gC, bC);
        const sim = bC.find(b => b.id === block.id);
        if (!sim || !canBlockMove(gC, sim, dir)) continue;
        const { dr, dc } = DIRECTIONS[dir];
        for (const [r, c] of sim.cells) gC[r][c] = CELL_EMPTY;
        sim.cells = sim.cells.map(([r, c]) => [r + dr, c + dc]);
        sim.anchor = [sim.anchor[0] + dr, sim.anchor[1] + dc];
        for (const [r, c] of sim.cells) gC[r][c] = sim.id;
        const key = serializeState(br, bc, bC);
        if (!visited.has(key)) { visited.add(key); queue.push({ br, bc, blks: bC, g: gC, moves: moves + 1 }); }
      }
    }
  }
  return { solvable: false };
}

// ─────────────────────────────────────────────────────────────────────────────
// Strategic Lock Placement (unchanged, but included for completeness)
// ─────────────────────────────────────────────────────────────────────────────
function _placeStrategicLocks(grid, rows, cols, ballR, holeR, count, features, rng) {
  const placed = [];
  for (let i = 0; i < count * 2 && placed.length < count; i++) {
    let r, c, strategy;
    if (features.chokepointGates && rng() > 0.3) {
      r = Math.min(ballR, holeR) + Math.floor(rng() * (Math.abs(holeR - ballR) + 1));
      c = Math.floor(cols * 0.35 + rng() * cols * 0.3); strategy = "chokepoint";
    } else if (features.forcedDetours && rng() > 0.5) {
      r = ballR + Math.floor(rng() * 3) - 1; c = 2 + Math.floor(rng() * 2); strategy = "detour";
    } else if (features.trapZones && rng() > 0.6) {
      r = holeR + Math.floor(rng() * 3) - 1; c = cols - 4 + Math.floor(rng() * 2); strategy = "trap";
    } else { r = Math.floor(rng() * rows); c = Math.floor(cols * 0.25 + rng() * cols * 0.5); strategy = "standard"; }
    
    if (r < 0 || r >= rows || c <= 0 || c >= cols - 1) continue;
    if (grid[r][c] !== CELL_EMPTY) continue;
    const nearStart = (Math.abs(r - ballR) <= 1 && c <= 2);
    const nearEnd = (Math.abs(r - holeR) <= 1 && c >= cols - 3);
    if (nearStart || nearEnd) continue;
    if (_wouldIsolateHole(grid, rows, cols, ballR, 0, holeR, cols-1, r, c)) continue;
    
    grid[r][c] = CELL_LOCK; placed.push({r, c, strategy});
  }
  return placed;
}

// ─────────────────────────────────────────────────────────────────────────────
// Placement Strategy Selector
// ─────────────────────────────────────────────────────────────────────────────
function _selectPlacementStrategy(index, total, features, rng) {
  if (index === 0) return "chokepoint";
  const weights = [], strategies = [];
  strategies.push("standard"); weights.push(40);
  if (features.chokepointGates) { strategies.push("chokepoint"); weights.push(25); }
  if (features.forcedDetours) { strategies.push("detour"); weights.push(15); }
  if (features.multiStepClearance && index > total * 0.4) { strategies.push("clearance"); weights.push(10); }
  if (features.trapZones && index > total * 0.6) { strategies.push("trap"); weights.push(10); }
  return _weightedRandom(strategies, weights, rng);
}

function _getStrategicShapePool(level, rng) {
  const pool = [];
  if (level < 4) pool.push("1x1", "1x1", "1x2", "2x1", "2x2");
  else if (level < 7) { pool.push("1x1", "1x2", "2x1"); pool.push("2x2", "2x2"); pool.push("L1", "L1", "T1"); }
  else if (level < 10) { pool.push("1x1", "1x2"); pool.push("2x2", "L1", "T1", "Z1", "S1"); }
  else { pool.push("1x1"); pool.push("2x2", "L1", "T1", "Z1", "S1", "1x3", "3x1"); }
  return pool;
}

function _biasedRandom(min, max, biasTowardsMin, rng) {
  const r = rng(); const exponent = biasTowardsMin > 0.5 ? 1.5 : 0.7;
  return min + Math.floor(Math.pow(r, exponent) * (max - min + 1));
}

function _weightedRandom(items, weights, rng) {
  const total = weights.reduce((a, b) => a + b, 0); let rand = rng() * total;
  for (let i = 0; i < items.length; i++) { if (rand < weights[i]) return items[i]; rand -= weights[i]; }
  return items[items.length - 1];
}

function _shuffleArray(array, rng) {
  for (let i = array.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [array[i], array[j]] = [array[j], array[i]]; }
}

// ─────────────────────────────────────────────────────────────────────────────
// Connectivity Checks
// ─────────────────────────────────────────────────────────────────────────────
function _wouldIsolateHole(grid, rows, cols, startR, startC, endR, endC, blockR, blockC) {
  const testGrid = cloneGrid(grid);
  if (blockR >= 0 && blockR < rows && blockC >= 0 && blockC < cols) testGrid[blockR][blockC] = CELL_LOCK;
  if (_floodFillReachable(testGrid, rows, cols, startR, startC, endR, endC)) return false;
  return !_hasOpenCorridor(testGrid, rows, cols, startR, endR, blockR, blockC);
}

function _floodFillReachable(grid, rows, cols, startR, startC, endR, endC) {
  const visited = new Set(); const queue = [[startR, startC]]; visited.add(startR + ',' + startC);
  while (queue.length > 0) {
    const [r, c] = queue.shift(); if (r === endR && c === endC) return true;
    for (const {dr, dc} of Object.values(DIRECTIONS)) {
      const nr = r + dr, nc = c + dc, key = nr + ',' + nc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited.has(key) && grid[nr][nc] !== CELL_LOCK && grid[nr][nc] !== CELL_BALL) {
        visited.add(key); queue.push([nr, nc]);
      }
    }
  }
  return false;
}

function _hasOpenCorridor(grid, rows, cols, ballR, holeR, blockR, blockC) {
  const minR = Math.min(ballR, holeR), maxR = Math.max(ballR, holeR);
  for (let r = minR; r <= maxR; r++) {
    let openPath = true;
    for (let c = 1; c < cols - 1; c++) {
      if (grid[r][c] === CELL_LOCK || (r === blockR && c === blockC)) {
        if (r > minR && grid[r-1][c] !== CELL_LOCK) continue;
        if (r < maxR && grid[r+1][c] !== CELL_LOCK) continue;
        openPath = false; break;
      }
    }
    if (openPath) return true;
  }
  return false;
}

function _calculateStrategyScore(blocks, grid, ballR, holeR, features) {
  let score = 0;
  const corridorBlocks = blocks.filter(b => { const avgC = b.cells.reduce((s, [,c]) => s + c, 0) / b.cells.length; return avgC > grid[0].length * 0.25 && avgC < grid[0].length * 0.75; });
  score += corridorBlocks.filter(b => b.shapeKey !== "1x1").length * 3;
  score += new Set(blocks.map(b => b.shapeKey)).size * 2;
  return score;
}

function _calculateStrategyBuffer(blocks, features) {
  return Math.floor(blocks.filter(b => b.shapeKey !== "1x1").length * 0.4) + (features.multiStepClearance ? 2 : 0);
}

// ─────────────────────────────────────────────────────────────────────────────
// BFS Solver
// ─────────────────────────────────────────────────────────────────────────────
function _bfs(grid, blocks, ballR, ballC, holeR, holeC, maxMoves) {
  const initKey = serializeState(ballR, ballC, blocks);
  const visited = new Set([initKey]);
  const queue = [{ br: ballR, bc: ballC, blks: cloneBlocks(blocks), g: cloneGrid(grid), moves: 0 }];

  while (queue.length > 0) {
    if (visited.size > MAX_BFS_STATES) return { solvable: false, shortestPath: Infinity };
    const state = queue.shift();
    const { br, bc, blks, g, moves } = state;
    if (moves >= maxMoves) continue;

    for (const dir of DIR_KEYS) {
      const { dr, dc } = DIRECTIONS[dir];
      const nr = br + dr, nc = bc + dc;
      if (nr < 0 || nr >= g.length || nc < 0 || nc >= g[0].length) continue;
      const cell = g[nr][nc];
      if (cell !== CELL_EMPTY && cell !== CELL_HOLE) continue;
      if (nr === holeR && nc === holeC) return { solvable: true, shortestPath: moves + 1 };
      const gC = cloneGrid(g), bC = cloneBlocks(blks);
      gC[br][bc] = CELL_EMPTY; gC[nr][nc] = CELL_BALL;
      stampBlocks(gC, bC);
      const key = serializeState(nr, nc, bC);
      if (!visited.has(key)) { visited.add(key); queue.push({ br: nr, bc: nc, blks: bC, g: gC, moves: moves + 1 }); }
    }

    for (const block of blks) {
      for (const dir of DIR_KEYS) {
        const gC = cloneGrid(g), bC = cloneBlocks(blks);
        stampBlocks(gC, bC);
        const sim = bC.find(b => b.id === block.id);
        if (!sim || !canBlockMove(gC, sim, dir)) continue;
        const { dr, dc } = DIRECTIONS[dir];
        for (const [r, c] of sim.cells) gC[r][c] = CELL_EMPTY;
        sim.cells = sim.cells.map(([r, c]) => [r + dr, c + dc]);
        sim.anchor = [sim.anchor[0] + dr, sim.anchor[1] + dc];
        for (const [r, c] of sim.cells) gC[r][c] = sim.id;
        const key = serializeState(br, bc, bC);
        if (!visited.has(key)) { visited.add(key); queue.push({ br, bc, blks: bC, g: gC, moves: moves + 1 }); }
      }
    }
  }
  return { solvable: false, shortestPath: Infinity };
}

// ─────────────────────────────────────────────────────────────────────────────
// Verification & Repair
// ─────────────────────────────────────────────────────────────────────────────
function _verifySolvable(grid, blocks, ballR, ballC, holeR, holeC, moveLimit) {
  const result = _bfs(grid, blocks, ballR, ballC, holeR, holeC, moveLimit + 20);
  return result.solvable && result.shortestPath <= moveLimit;
}

function _repairLevel(grid, blocks, ballR, holeR, cols, tier, rng) {
  const sorted = [...blocks].sort((a, b) => {
    const aD = Math.abs(a.anchor[0] - holeR), bD = Math.abs(b.anchor[0] - holeR);
    return (bD - aD) || (a.shapeKey === "1x1" ? 1 : -1);
  });
  for (let removeCount = 1; removeCount <= 3; removeCount++) {
    const testGrid = cloneGrid(grid), testBlocks = cloneBlocks(blocks);
    for (let i = 0; i < removeCount; i++) {
      for (const [r, c] of sorted[i].cells) if (testGrid[r][c] === sorted[i].id) testGrid[r][c] = CELL_EMPTY;
    }
    const remaining = testBlocks.filter(b => !sorted.slice(0, removeCount).some(rb => rb.id === b.id));
    const result = _bfs(testGrid, remaining, ballR, 0, holeR, cols - 1, BFS_DISCOVERY_LIMIT);
    if (result.solvable && result.shortestPath <= tier.targetSolutionLen) {
      return { rows: grid.length, cols: grid[0].length, grid: testGrid, blocks: remaining,
        moveLimit: result.shortestPath + Math.min(12, 5 + Math.floor(tier.level / 4)),
        levelNumber: tier.level, _solutionLen: result.shortestPath, repaired: true };
    }
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback Levels
// ─────────────────────────────────────────────────────────────────────────────
function _fallbackLevel(tier, levelNumber, rng, makeHard) {
  const { gridRows: rows, gridCols: cols } = tier;
  for (let attempt = 0; attempt < 50; attempt++) {
    const grid = _emptyGrid(rows, cols);
    const ballR = Math.floor(rng() * rows); let holeR;
    do { holeR = Math.floor(rng() * rows); } while (Math.abs(holeR - ballR) < 2);
    grid[ballR][0] = CELL_BALL; grid[holeR][cols - 1] = CELL_HOLE;

    const lockCount = makeHard ? tier.minLocks : Math.max(2, Math.floor(tier.minLocks * 0.6));
    _placeStrategicLocks(grid, rows, cols, ballR, holeR, lockCount, tier.features, rng);

    const blocks = [], colors = [...BLOCK_COLORS];
    const blockCount = makeHard ? tier.minBlocks : Math.max(4, Math.floor(tier.minBlocks * 0.7));
    const shapePool = _getStrategicShapePool(tier.level, rng);

    for (let i = 0; i < blockCount; i++) {
      const r = Math.floor(rows * 0.3 + rng() * rows * 0.4), c = Math.floor(cols * 0.3 + rng() * cols * 0.4);
      if (r < 0 || r >= rows || c < 0 || c >= cols || grid[r][c] !== CELL_EMPTY) continue;
      const id = "b" + i;
      const shapeKey = (tier.level >= 4 && i === 0) ? "2x2" : shapePool[Math.floor(rng() * shapePool.length)];
      const offsets = BLOCK_SHAPES[shapeKey], cells = offsets.map(([dr, dc]) => [r + dr, c + dc]);
      if (cells.every(([cr, cc]) => cr >= 0 && cr < rows && cc >= 0 && cc < cols && grid[cr][cc] === CELL_EMPTY)) {
        // 🎯 Check escape route for fallback blocks too
        if (!_blockHasEscapeRoute(grid, rows, cols, cells, shapeKey)) continue;
        for (const [cr, cc] of cells) grid[cr][cc] = id;
        blocks.push({ id, shapeKey, anchor: [r, c], cells, color: colors[i % colors.length] || "purple", placementType: "fallback" });
      } else {
        grid[r][c] = id;
        blocks.push({ id, shapeKey: "1x1", anchor: [r, c], cells: [[r, c]], color: colors[i % colors.length] || "purple", placementType: "fallback" });
      }
    }

    stampBlocks(grid, blocks);
    const result = _bfs(grid, blocks, ballR, 0, holeR, cols - 1, BFS_DISCOVERY_LIMIT);
    if (!result.solvable) continue;
    const buffer = Math.min(10, 5 + Math.floor(tier.level / 4) + _calculateStrategyBuffer(blocks, tier.features));
    const moveLimit = result.shortestPath + buffer;
    if (!_verifySolvable(grid, blocks, ballR, 0, holeR, cols - 1, moveLimit)) continue;

    const level = { rows, cols, grid, blocks, moveLimit, levelNumber, _solutionLen: result.shortestPath };
    level.backgroundGrid = cloneGrid(grid); return level;
  }
  return _guaranteedSolvableLevel(tier, levelNumber, rng);
}

function _guaranteedSolvableLevel(tier, levelNumber, rng) {
  const { gridRows: rows, gridCols: cols } = tier;
  const grid = _emptyGrid(rows, cols);
  const ballR = Math.floor(rows * 0.3 + rng() * rows * 0.4), holeR = ballR;
  grid[ballR][0] = CELL_BALL; grid[holeR][cols - 1] = CELL_HOLE;
  const corridorRow = ballR, blocks = [], colors = [...BLOCK_COLORS];
  const blockCount = Math.max(2, Math.floor(tier.minBlocks * 0.6));

  for (let i = 0; i < blockCount; i++) {
    let r; do { r = Math.floor(rng() * rows); } while (r === corridorRow);
    const c = Math.floor(cols * 0.2 + rng() * cols * 0.6);
    if (c >= 1 && c < cols - 1 && r >= 0 && r < rows && grid[r][c] === CELL_EMPTY) {
      const id = "b" + i, shapeKey = (tier.level >= 4 && i === 0) ? "2x2" : "1x1";
      const offsets = BLOCK_SHAPES[shapeKey], cells = offsets.map(([dr, dc]) => [r + dr, c + dc]);
      const spills = cells.some(([cr]) => cr === corridorRow);
      const fits = !spills && cells.every(([cr, cc]) => cr >= 0 && cr < rows && cc >= 0 && cc < cols && grid[cr][cc] === CELL_EMPTY);
      if (fits) {
        for (const [cr, cc] of cells) grid[cr][cc] = id;
        blocks.push({ id, shapeKey, anchor: [r, c], cells, color: colors[i % colors.length] || "purple" });
      } else { grid[r][c] = id; blocks.push({ id, shapeKey: "1x1", anchor: [r, c], cells: [[r, c]], color: colors[i % colors.length] || "purple" }); }
    }
  }

  const lockCount = Math.min(3, Math.floor(tier.minLocks * 0.5));
  for (let i = 0; i < lockCount; i++) {
    let r, c, attempts = 0;
    do { r = Math.floor(rng() * rows); c = Math.floor(cols * 0.3 + rng() * cols * 0.4); attempts++; }
    while (attempts < 50 && (r === corridorRow || c <= 0 || c >= cols - 1 || grid[r][c] !== CELL_EMPTY));
    if (attempts < 50 && r >= 0 && r < rows && c >= 0 && c < cols) grid[r][c] = CELL_LOCK;
  }

  stampBlocks(grid, blocks);
  const directPath = cols - 1, buffer = Math.max(5, Math.floor(tier.level / 3)), moveLimit = directPath + buffer;
  const level = { rows, cols, grid, blocks, moveLimit, levelNumber, _solutionLen: directPath, guaranteed: true };
  level.backgroundGrid = cloneGrid(grid); return level;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utilities
// ─────────────────────────────────────────────────────────────────────────────
function _emptyGrid(rows, cols) { return Array.from({ length: rows }, () => Array(cols).fill(CELL_EMPTY)); }
function cloneGrid(grid) { return grid.map(row => row.slice()); }
function cloneBlocks(blocks) {
  return blocks.map(b => ({ id: b.id, shapeKey: b.shapeKey, anchor: [...b.anchor], cells: b.cells.map(([r, c]) => [r, c]), color: b.color, placementType: b.placementType }));
}

console.log('✅ levelGenerator.js loaded — Strategic Block Placement Mode');