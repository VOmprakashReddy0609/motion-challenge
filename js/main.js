// js/main.js
// BUG FIX: This file previously contained a copy of index.html instead of JavaScript.
// It now correctly bootstraps the game by wiring together all modules.

(function () {

  const board       = document.getElementById("gameBoard");
  const movesEl     = document.getElementById("moves");
  const timerEl     = document.getElementById("timer");
  const resetBtn    = document.getElementById("resetBtn");
  const nextBtn     = document.getElementById("nextBtn");

  const levelManager = new LevelManager();
  const timer        = new Timer(timerEl);
  let   engine       = null;

  function startLevel(level) {
    // Stop any running timer before creating a new game state
    timer.reset();

    // Remove the previous engine's click listener to prevent duplicate handlers
    if (engine) engine.destroy();

    engine = new GameEngine(board, level, movesEl);
    engine.render();

    timer.start();
  }

  // Wire up Reset and Next buttons via the helper
  attachControls(
    resetBtn,
    nextBtn,
    function onReset() {
      const level = levelManager.reset();
      startLevel(level);
    },
    function onNext() {
      const level = levelManager.next();
      startLevel(level);
    }
  );

  // Kick off the first level
  startLevel(levelManager.getCurrent());

})();