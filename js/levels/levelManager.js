// js/levels/levelManager.js
// FIXED VERSION — March 2026
//
// Fixes:
// 1. advance() now clears _savedGrid immediately to prevent reset() from using stale data during generation
// 2. _createEmergencyLevel() now properly updates _savedGrid and _savedBlocks
// 3. reset() now validates that saved data matches current level number
// 4. Added _levelStateVersion to detect stale data

class LevelManager {
  constructor() {
    this.levelNumber     = 1;
    this.score           = 0;
    this.attempts        = 0;
    this.levelsCompleted = 0;
    this.levelsFailed    = 0;
    this.currentLevel    = null;
    this._savedGrid      = null;
    this._savedBlocks    = null;
    this._savedLevelNum  = null;  // NEW: Track which level the saved data belongs to
    this._isGenerating   = false;
    this._pendingLevel   = null;
    this._onLevelReady   = null;
    this._generateCurrent();
  }

  // ── Public API ────────────────────────────────────────────────────────────

  getCurrent() {
    return this.currentLevel;
  }

  getLevelNumber() {
    return this.levelNumber;
  }

  getScore() {
    return this.score;
  }

  getStats() {
    return {
      score:        this.score,
      levelReached: this.levelNumber,
      attempts:     this.attempts,
      completed:    this.levelsCompleted,
      failed:       this.levelsFailed
    };
  }

  isGameOver() {
    return false;
  }

  recordWin(movesUsed) {
    this.score += SCORE_CORRECT;
    this.levelsCompleted++;
    this.attempts++;
    console.log(`[LevelManager] Win! Level ${this.levelNumber} done. Score: ${this.score}`);
    return this.score;
  }

  recordLose() {
    this.score = Math.max(0, this.score + SCORE_WRONG);
    this.levelsFailed++;
    this.attempts++;
    console.log(`[LevelManager] Loss! Level ${this.levelNumber} failed. Score: ${this.score}`);
    return this.score;
  }

  // FIXED: Clears saved data immediately to prevent race conditions
  async advance() {
    this.levelNumber++;
    console.log(`[LevelManager] Advancing to level ${this.levelNumber}`);
    
    // CRITICAL FIX: Clear saved data immediately so reset() can't use stale data
    this._savedGrid = null;
    this._savedBlocks = null;
    this._savedLevelNum = null;
    this.currentLevel = null; // Force getCurrent() to return null until ready
    
    this._showLoadingIndicator();
    await this._delay(5);
    
    await this._generateCurrentAsync();
    
    this._hideLoadingIndicator();
    return this.currentLevel;
  }

  // FIXED: Validates saved data belongs to current level
  reset() {
    console.log(`[LevelManager] Resetting level ${this.levelNumber}`);
    
    // CRITICAL FIX: Check that saved data exists AND belongs to current level
    if (this._savedGrid && this._savedBlocks && this._savedLevelNum === this.levelNumber) {
      console.log(`[LevelManager] Using saved layout for level ${this.levelNumber}`);
      this.currentLevel = {
        rows:        this._savedGrid.length,
        cols:        this._savedGrid[0].length,
        grid:        cloneGrid(this._savedGrid),
        blocks:      cloneBlocks(this._savedBlocks),
        moveLimit:   this._savedMoveLimit || 12,
        levelNumber: this.levelNumber
      };
    } else {
      console.log(`[LevelManager] No saved layout found (saved: ${this._savedLevelNum}, current: ${this.levelNumber}), generating fresh`);
      this._generateCurrent();
    }
    return this.currentLevel;
  }

  skip() {
    console.log(`[LevelManager] Skipping level ${this.levelNumber}`);
    // Clear saved data to force fresh generation
    this._savedGrid = null;
    this._savedBlocks = null;
    this._savedLevelNum = null;
    this._generateCurrent();
    return this.currentLevel;
  }

  // ── Internal ──────────────────────────────────────────────────────────────

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _showLoadingIndicator() {
    let loader = document.getElementById('level-loading');
    if (!loader) {
      loader = document.createElement('div');
      loader.id = 'level-loading';
      loader.className = 'level-loading hidden';
      loader.innerHTML = '<div class="spinner"></div><span>Generating next level...</span>';
      document.body.appendChild(loader);
    }
    loader.classList.remove('hidden');
  }

  _hideLoadingIndicator() {
    const loader = document.getElementById('level-loading');
    if (loader) loader.classList.add('hidden');
  }

  _generateCurrent() {
    console.log(`[LevelManager] Generating level ${this.levelNumber}`);
    const newLevel = generateLevel(this.levelNumber);

    if (!newLevel || !newLevel.grid || !newLevel.blocks) {
      console.error('[LevelManager] Generation failed — using emergency level');
      this.currentLevel = this._createEmergencyLevel();
    } else {
      this.currentLevel = newLevel;
    }

    // Save a pristine copy for reset()
    this._updateSavedState();
    
    // Store background grid for hole preservation if provided by generator
    if (this.currentLevel.backgroundGrid) {
      this._savedBackgroundGrid = cloneGrid(this.currentLevel.backgroundGrid);
    }

    console.log(
      `[LevelManager] Level ${this.levelNumber} ready: ` +
      `${this.currentLevel.rows}×${this.currentLevel.cols}, ` +
      `${this.currentLevel.blocks.length} blocks, ` +
      `move limit: ${this.currentLevel.moveLimit}, ` +
      `solution: ${this.currentLevel._solutionLen || '?'} moves`
    );
  }

  async _generateCurrentAsync() {
    console.log(`[LevelManager] Generating level ${this.levelNumber} (async)`);
    
    const newLevel = await new Promise((resolve) => {
      setTimeout(() => {
        resolve(generateLevel(this.levelNumber));
      }, 10);
    });

    if (!newLevel || !newLevel.grid || !newLevel.blocks) {
      console.error('[LevelManager] Generation failed — using emergency level');
      this.currentLevel = this._createEmergencyLevel();
    } else {
      this.currentLevel = newLevel;
    }

    // Save a pristine copy for reset()
    this._updateSavedState();
    
    // Store background grid for hole preservation if provided by generator
    if (this.currentLevel.backgroundGrid) {
      this._savedBackgroundGrid = cloneGrid(this.currentLevel.backgroundGrid);
    }

    console.log(
      `[LevelManager] Level ${this.levelNumber} ready: ` +
      `${this.currentLevel.rows}×${this.currentLevel.cols}, ` +
      `${this.currentLevel.blocks.length} blocks, ` +
      `move limit: ${this.currentLevel.moveLimit}, ` +
      `solution: ${this.currentLevel._solutionLen || '?'} moves`
    );
  }

  // NEW: Centralized method to update saved state with level tracking
  _updateSavedState() {
    this._savedGrid = cloneGrid(this.currentLevel.grid);
    this._savedBlocks = cloneBlocks(this.currentLevel.blocks);
    this._savedLevelNum = this.levelNumber;  // CRITICAL: Track which level this is for
    this._savedMoveLimit = this.currentLevel.moveLimit;
  }

  // FIXED: Now updates _savedGrid and _savedBlocks properly
  _createEmergencyLevel() {
    const rows = 5, cols = 5;
    const grid = Array.from({ length: rows }, () => Array(cols).fill(CELL_EMPTY));

    grid[2][0] = CELL_BALL;
    grid[2][4] = CELL_HOLE;

    const blocks = [{
      id:       "b0",
      shapeKey: "1x1",
      anchor:   [2, 2],
      cells:    [[2, 2]],
      color:    BLOCK_COLORS[0] || "purple"
    }];

    stampBlocks(grid, blocks);

    const emergencyLevel = { 
      rows, 
      cols, 
      grid, 
      blocks, 
      moveLimit: 12, 
      levelNumber: this.levelNumber 
    };
    
    // CRITICAL FIX: Update saved state so reset() works properly
    this._savedGrid = cloneGrid(grid);
    this._savedBlocks = cloneBlocks(blocks);
    this._savedLevelNum = this.levelNumber;
    this._savedMoveLimit = 12;
    
    return emergencyLevel;
  }
}