// js/engine/gameEngine.js

class GameEngine {

  constructor(board, level, movesEl) {
    this.board        = board;
    this.cols         = level.cols;
    this.rows         = level.rows;
    this.moves        = 0;
    this.movesDisplay = movesEl;
    this.selection    = null;
    // selection shape: { type: "ball"|"block", blockId: string|null }

    // Deep-clone grid and blocks so the original level stays pristine for reset
    this.grid   = cloneGrid(level.grid);
    this.blocks = cloneBlocks(level.blocks);

    // Ensure block IDs are stamped onto the grid
    stampBlocks(this.grid, this.blocks);

    this.ball = findCell(this.grid, CELL_BALL);
    this.goal = findCell(this.grid, CELL_HOLE);

    this._clickHandler = (e) => this.handleClick(e);
    this.board.addEventListener("click", this._clickHandler);
  }

  destroy() {
    this.board.removeEventListener("click", this._clickHandler);
  }

  render() {
    renderBoard(this.board, this.grid, this.blocks, this.cols);
  }

  // ── Click handling ────────────────────────────────────────────────────────

  handleClick(event) {
    const cellEl = event.target.closest(".cell");
    if (!cellEl) return;

    const r    = Number(cellEl.dataset.row);
    const c    = Number(cellEl.dataset.col);
    const type = this.grid[r][c];

    const isBall  = (type === CELL_BALL);
    const block   = isBall ? null : findBlockAt(this.blocks, r, c);
    const isBlock = (block !== null);

    // Click on non-interactive cell (empty, hole, lock) → deselect only
    if (!isBall && !isBlock) {
      this._deselect();
      return;
    }

    // Clicking the same piece that is already selected → toggle off
    if (this.selection) {
      const sameAsBall  = (this.selection.type === "ball"  && isBall);
      const sameAsBlock = (this.selection.type === "block" && isBlock &&
                           this.selection.blockId === block.id);
      if (sameAsBall || sameAsBlock) {
        this._deselect();
        return;
      }
    }

    // Select the new piece (clears any previous selection first)
    this._deselect();

    if (isBall) {
      this.selection = { type: "ball", blockId: null };
      this._highlightCell(r, c);
      const dirs = getBallMoves(this.grid, r, c);
      showDirections(this.board, r, c, dirs, this.cols, (dir) => {
        this._applyBallMove(dir, r, c);
      });

    } else {
      this.selection = { type: "block", blockId: block.id };

      // Highlight every cell this block occupies
      for (const [br, bc] of block.cells) {
        this._highlightCell(br, bc);
      }

      const dirs = getBlockMoves(this.grid, block);

      // Arrows always attach to the block's anchor (top-left) cell
      const [ar, ac] = block.anchor;
      showDirections(this.board, ar, ac, dirs, this.cols, (dir) => {
        this._applyBlockMove(block.id, dir);
      });
    }
  }

  // ── Ball move ─────────────────────────────────────────────────────────────

  _applyBallMove(dir, fromR, fromC) {
    this._deselect();

    const newPos = moveBall(this.grid, dir, fromR, fromC);
    const moved  = (newPos[0] !== fromR || newPos[1] !== fromC);

    if (moved) {
      this.ball = newPos;
      this._recordMove();
    }

    this.render();
    this._checkWin();
  }

  // ── Block move ────────────────────────────────────────────────────────────

  _applyBlockMove(blockId, dir) {
    this._deselect();

    const block = this.blocks.find(b => b.id === blockId);
    if (!block) return;

    const moved = slideBlock(this.grid, block, dir);
    if (moved) this._recordMove();

    this.render();
    this._checkWin();
  }

  // ── Shared helpers ────────────────────────────────────────────────────────

  _recordMove() {
    this.moves++;
    if (this.movesDisplay) this.movesDisplay.innerText = this.moves;
  }

  _checkWin() {
    if (checkWin(this.ball, this.goal)) {
      setTimeout(() => {
        alert("🎉 Level Complete! Solved in " + this.moves +
              " move" + (this.moves !== 1 ? "s" : "") + ".");
      }, 80);
    }
  }

  _highlightCell(r, c) {
    const idx    = r * this.cols + c;
    const cellEl = this.board.children[idx];
    if (cellEl) cellEl.classList.add("cell--selected");
  }

  _deselect() {
    this.board.querySelectorAll(".arrow").forEach(a => a.remove());
    this.board.querySelectorAll(".cell--selected").forEach(el =>
      el.classList.remove("cell--selected")
    );
    this.selection = null;
  }

}