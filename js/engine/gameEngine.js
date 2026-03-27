// js/engine/gameEngine.js
// Step-by-step movement implementation for Motion Challenge
// FIXED VERSION — March 2026
//
// Fixes applied:
// 1. Black hole preservation: Uses backgroundGrid to track original static elements
// 2. Async callbacks: onWin/onLose are now properly awaited for level transitions
// 3. Block movement: Restores holes when blocks move away from them

class GameEngine {

  constructor(board, level, movesEl, moveLimitEl, callbacks) {
    this.board      = board;
    this.cols       = level.cols;
    this.rows       = level.rows;
    this.moveLimit  = level.moveLimit;
    this.moves      = 0;
    this.movesEl    = movesEl;
    this.limitEl    = moveLimitEl;
    this.selection  = null;
    this._locked    = false;
    this._animating = false;
    this._timers    = [];

    // Support async callbacks for proper level transition
    this.onWin  = (callbacks && callbacks.onWin)  || function () {};
    this.onLose = (callbacks && callbacks.onLose) || function () {};

    // CRITICAL: Store background grid to preserve holes
    this.backgroundGrid = level.backgroundGrid ? cloneGrid(level.backgroundGrid) : null;
    
    // If no background provided, create one from initial grid state
    if (!this.backgroundGrid) {
      this.backgroundGrid = cloneGrid(level.grid);
    }
    
    this.grid   = cloneGrid(level.grid);
    this.blocks = cloneBlocks(level.blocks);
    
    // Attach backgroundGrid reference for movement functions
    this.grid.backgroundGrid = this.backgroundGrid;
    
    stampBlocks(this.grid, this.blocks);

    this.ball = findCell(this.grid, CELL_BALL);
    this.goal = findCell(this.grid, CELL_HOLE);

    this._updateMovesUI();
    this._updateLevelBarUI();

    this._banner       = this._createBanner();
    this._clickHandler = (e) => this.handleClick(e);
    this.board.addEventListener("click", this._clickHandler);
  }

  destroy() {
    this.board.removeEventListener("click", this._clickHandler);
    clearArrows(this.board);
    this._timers.forEach(id => clearTimeout(id));
    this._timers = [];
    this._removeBoardStateClasses();
    if (this._banner && this._banner.parentNode) {
      this._banner.parentNode.removeChild(this._banner);
    }
    this._banner = null;
  }

  render() {
    // Use backgroundGrid so holes are preserved under blocks
    renderBoard(this.board, this.grid, this.blocks, this.cols, this.backgroundGrid);
  }

  _after(ms, fn) {
    const id = setTimeout(() => {
      this._timers = this._timers.filter(t => t !== id);
      fn();
    }, ms);
    this._timers.push(id);
    return id;
  }

  _createBanner() {
    const el = document.createElement("div");
    el.className = "game-banner game-banner--hidden";
    const parent = this.board.parentNode;
    if (parent) parent.insertBefore(el, this.board.nextSibling);
    return el;
  }

  _showBanner(type, movesUsed) {
    if (!this._banner) return;
    const isWin = type === "win";
    this._banner.className = `game-banner game-banner--${isWin ? "win" : "lose"}`;
    this._banner.innerHTML = isWin
      ? `<span class="banner-icon">✓</span>
         <span class="banner-text">Level complete!</span>
         <span class="banner-sub">Solved in ${movesUsed} / ${this.moveLimit} moves</span>`
      : `<span class="banner-icon">✗</span>
         <span class="banner-text">Out of moves</span>
         <span class="banner-sub">Next level loading…</span>`;
  }

  _hideBanner() {
    if (this._banner) this._banner.className = "game-banner game-banner--hidden";
  }

  _removeBoardStateClasses() {
    this.board.classList.remove("board--win", "board--lose");
  }

  // ── Click handler ─────────────────────────────────────────────────────────

  handleClick(event) {
    if (this._locked || this._animating) return;

    const cellEl = event.target.closest(".cell");
    if (!cellEl) return;

    const r    = Number(cellEl.dataset.row);
    const c    = Number(cellEl.dataset.col);
    const type = this.grid[r][c];

    const isBall  = (type === CELL_BALL);
    const block   = isBall ? null : findBlockAt(this.blocks, r, c);
    const isBlock = block !== null;

    if (!isBall && !isBlock) { this._deselect(); return; }

    // Toggle off if clicking the same selection
    if (this.selection) {
      const sameBall = this.selection.type === "ball" && isBall;
      const sameGroup = this.selection.type === "block" && isBlock &&
        this.selection.groupIds && this.selection.groupIds.includes(block.id);

      if (sameBall || sameGroup) { this._deselect(); return; }
    }

    this._deselect();

    // Ball selection
    if (isBall) {
      this.selection = { type: "ball", blockId: null, groupIds: null };
      this._highlightCells([[r, c]]);
      const dirs = getBallMoves(this.grid, r, c);
      showDirections(this.board, r, c, dirs, this.cols, (dir) => {
        this._applyBallMove(dir);
      });
      return;
    }

    // Block / connected-group selection
    const group    = findConnectedBlocks(this.blocks, block);
    const groupIds = group.map(b => b.id);

    this.selection = { type: "block", blockId: block.id, groupIds };

    const allCells = group.flatMap(b => b.cells);
    this._highlightCells(allCells);

    const dirs = getBlockGroupMoves(this.grid, group);

    showDirections(this.board, r, c, dirs, this.cols, (dir) => {
      this._applyBlockGroupMove(groupIds, dir);
    });
  }

  // ── Ball move ─────────────────────────────────────────────────────────────

  _applyBallMove(dir) {
    this._deselect();
    if (this._locked || this._animating) return;
    this._animating = true;

    const [fromR, fromC] = this.ball;
    const [toR, toC]     = moveBallOneStep(this.grid, fromR, fromC, dir);

    if (toR === fromR && toC === fromC) {
      this._animating = false;
      return;
    }

    this.ball = [toR, toC];
    this.render();
    this._recordMove();
    this._animating = false;
    this._checkEndConditions();
  }

  // ── Single-block move (kept for internal use / backwards compat) ──────────

  _applyBlockMove(blockId, dir) {
    this._deselect();
    if (this._locked || this._animating) return;
    this._animating = true;

    const block = this.blocks.find(b => b.id === blockId);
    if (!block) { this._animating = false; return; }

    const moved = moveBlockOneStep(this.grid, block, dir);
    if (!moved) { this._animating = false; return; }

    this.render();
    this._recordMove();
    this._animating = false;
    this._checkEndConditions();
  }

  // ── Connected-group move — FIXED FOR HOLE PRESERVATION ────────────────────
  // Moves all blocks in the group one step together as a single rigid piece.
  // CRITICAL FIX: Preserves holes when blocks move away from them.

  _applyBlockGroupMove(groupIds, dir) {
    this._deselect();
    if (this._locked || this._animating) return;
    this._animating = true;

    const group = groupIds.map(id => this.blocks.find(b => b.id === id)).filter(Boolean);
    if (group.length === 0) { this._animating = false; return; }

    // Verify the move is still valid
    if (!canBlockGroupMove(this.grid, group, dir)) {
      this._animating = false;
      return;
    }

    const { dr, dc } = DIRECTIONS[dir];

    // CRITICAL FIX: Store which cells were holes before clearing
    const cellStates = [];
    for (const b of group) {
      for (const [r, c] of b.cells) {
        const isHole = this.backgroundGrid[r][c] === CELL_HOLE;
        cellStates.push({r, c, isHole});
      }
    }

    // Clear cells - restore holes where appropriate, empty elsewhere
    for (const {r, c, isHole} of cellStates) {
      this.grid[r][c] = isHole ? CELL_HOLE : CELL_EMPTY;
    }

    // Shift every block's cells and anchor
    for (const b of group) {
      b.cells  = b.cells.map(([r, c]) => [r + dr, c + dc]);
      b.anchor = [b.anchor[0] + dr, b.anchor[1] + dc];
    }

    // Stamp new positions
    for (const b of group) {
      for (const [r, c] of b.cells) {
        this.grid[r][c] = b.id;
      }
    }

    this.render();
    this._recordMove();
    this._animating = false;
    this._checkEndConditions();
  }

  // ── End condition checks ──────────────────────────────────────────────────

  _checkEndConditions() {
    if (typeof checkWin !== 'undefined' && checkWin(this.ball, this.goal)) {
      this._locked = true;
      this._triggerWin();
      return;
    }
    if (typeof checkLose !== 'undefined' && checkLose(this.moves, this.moveLimit)) {
      this._locked = true;
      this._triggerLose();
    }
  }

  // ── Win/Lose triggers — FIXED: Now async to await callbacks ────────────────

  async _triggerWin() {
    const FLASH_MS  = 600;
    const BANNER_MS = 1100;

    this.board.classList.add("board--win");
    await new Promise(resolve => this._after(FLASH_MS, resolve));
    this._removeBoardStateClasses();
    this._showBanner("win", this.moves);
    await new Promise(resolve => this._after(BANNER_MS, resolve));
    this._hideBanner();
    await this.onWin(this.moves);
  }

  async _triggerLose() {
    const FLASH_MS  = 550;
    const BANNER_MS = 1200;

    this.board.classList.add("board--lose");
    await new Promise(resolve => this._after(FLASH_MS, resolve));
    this._removeBoardStateClasses();
    this._showBanner("lose", this.moves);
    await new Promise(resolve => this._after(BANNER_MS, resolve));
    this._hideBanner();
    await this.onLose();
  }

  _recordMove() {
    this.moves++;
    this._updateMovesUI();
    this._updateLevelBarUI();
  }

  _updateMovesUI() {
    if (this.movesEl) this.movesEl.textContent = this.moves;
    if (this.limitEl) this.limitEl.textContent = this.moveLimit;

    if (this.movesEl) {
      this.movesEl.classList.remove("moves--warning", "moves--danger");
      const ratio = this.moves / this.moveLimit;
      if      (ratio >= 0.85) this.movesEl.classList.add("moves--danger");
      else if (ratio >= 0.65) this.movesEl.classList.add("moves--warning");
    }
  }

  _updateLevelBarUI() {
    const fill = document.getElementById("level-bar-fill");
    if (!fill) return;
    const remaining = Math.max(0, 1 - this.moves / this.moveLimit);
    fill.style.width = (remaining * 100) + "%";
  }

  _highlightCells(cells) {
    for (const [r, c] of cells) {
      const el = this.board.children[r * this.cols + c];
      if (el) el.classList.add("cell--selected");
    }
  }

  _deselect() {
    clearArrows(this.board);
    this.board.querySelectorAll(".cell--selected")
      .forEach(el => el.classList.remove("cell--selected"));
    this.selection = null;
  }

}