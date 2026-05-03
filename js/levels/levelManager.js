// js/levels/levelManager.js
// FIXED VERSION — March 2026
// UPDATED: Added fromSavedState() static factory for reload persistence
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

  // ── Static factory: reconstruct from a persisted snapshot ─────────────────
  //
  // Called by main.js during the reload-restore path (Scenario 1) and the
  // navigation-away path (Scenario 2).  We skip _generateCurrent() entirely
  // because we already have the level's pristine grid/blocks from the save.

  static fromSavedState(saved) {
    const mgr = Object.create(LevelManager.prototype);

    // Restore scalar stats
    mgr.levelNumber     = saved.levelNumber     || 1;
    mgr.score           = saved.score           || 0;
    mgr.attempts        = saved.attempts        || 0;
    mgr.levelsCompleted = saved.levelsCompleted || 0;
    mgr.levelsFailed    = saved.levelsFailed    || 0;

    // Restore internal saved-state fields (pristine level start, used by reset())
    mgr._savedGrid      = saved.savedGrid     || null;
    mgr._savedBlocks    = saved.savedBlocks   || null;
    mgr._savedLevelNum  = saved.savedLevelNum || null;
    mgr._savedMoveLimit = saved.savedMoveLimit || 12;

    // Expose live mid-game state so main.js can pass it to GameEngine on restore
    mgr._liveGrid   = saved.liveGrid   || null;
    mgr._liveBlocks = saved.liveBlocks || null;
    mgr._liveBall   = saved.liveBall   || null;
    mgr._liveMoves  = saved.liveMoves  || 0;

    mgr._isGenerating   = false;
    mgr._pendingLevel   = null;
    mgr._onLevelReady   = null;

    // Reconstruct currentLevel from the PRISTINE saved grid/blocks so reset()
    // works correctly, and so the engine gets the right dimensions/moveLimit.
    // The live mid-game positions are applied separately by main.js after engine init.
    if (mgr._savedGrid && mgr._savedBlocks) {
      mgr.currentLevel = {
        rows:        mgr._savedGrid.length,
        cols:        mgr._savedGrid[0].length,
        grid:        cloneGrid(mgr._savedGrid),
        blocks:      cloneBlocks(mgr._savedBlocks),
        moveLimit:   mgr._savedMoveLimit,
        levelNumber: mgr.levelNumber
      };
    } else {
      // Fallback: generate a fresh level at the saved level number
      mgr.currentLevel = null;
      mgr._generateCurrent();
    }

    return mgr;
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
    return this.score;
  }

  recordLose() {
    this.score = Math.max(0, this.score + SCORE_WRONG);
    this.levelsFailed++;
    this.attempts++;
    return this.score;
  }

  // FIXED: Clears saved data immediately to prevent race conditions
  async advance() {
    this.levelNumber++;
    
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
    // CRITICAL FIX: Check that saved data exists AND belongs to current level
    if (this._savedGrid && this._savedBlocks && this._savedLevelNum === this.levelNumber) {
      this.currentLevel = {
        rows:        this._savedGrid.length,
        cols:        this._savedGrid[0].length,
        grid:        cloneGrid(this._savedGrid),
        blocks:      cloneBlocks(this._savedBlocks),
        moveLimit:   this._savedMoveLimit || 12,
        levelNumber: this.levelNumber
      };
    } else {
      this._generateCurrent();
    }
    return this.currentLevel;
  }

  skip() {
    // Clear saved data to force fresh generation
    this.levelNumber++;
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
    const newLevel = generateLevel(this.levelNumber);

    if (!newLevel || !newLevel.grid || !newLevel.blocks) {
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
  }

  async _generateCurrentAsync() {
    const newLevel = await new Promise((resolve) => {
      setTimeout(() => {
        resolve(generateLevel(this.levelNumber));
      }, 10);
    });

    if (!newLevel || !newLevel.grid || !newLevel.blocks) {
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