// js/levels/levelManager.js

class LevelManager {

  constructor() {
    this.currentLevel = generateLevel();
    this._save();
  }

  getCurrent() {
    return this.currentLevel;
  }

  next() {
    this.currentLevel = generateLevel();
    this._save();
    return this.currentLevel;
  }

  // Reset restores the exact same puzzle layout (grid + blocks).
  reset() {
    this.currentLevel = {
      rows:   this.currentLevel.rows,
      cols:   this.currentLevel.cols,
      grid:   cloneGrid(this._savedGrid),
      blocks: cloneBlocks(this._savedBlocks)
    };
    return this.currentLevel;
  }

  _save() {
    this._savedGrid   = cloneGrid(this.currentLevel.grid);
    this._savedBlocks = cloneBlocks(this.currentLevel.blocks);
  }

}