// js/main.js
// FIXED VERSION — Stable, Non-Async to prevent recursion crashes
// UPDATED: Two-key storage strategy for reload persistence

// ── Storage keys ──────────────────────────────────────────────────────────────
const SAVE_KEY    = 'motionChallenge_state';   // localStorage  — survives reload
const SESSION_KEY = 'motionChallenge_session'; // sessionStorage — dies on tab close / navigation

// ── Theme management ──────────────────────────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  const icon = theme === 'dark' ? '☀️' : '🌙';
  const startToggle = document.getElementById('start-theme-toggle');
  const themeToggle = document.getElementById('theme-toggle');
  if (startToggle) startToggle.innerText = icon;
  if (themeToggle) themeToggle.innerText = icon;
  localStorage.setItem('theme', theme);
}

function toggleTheme() {
  const current = document.documentElement.getAttribute('data-theme');
  applyTheme(current === 'dark' ? 'light' : 'dark');
}

(function initTheme() {
  const saved = localStorage.getItem('theme') || 'light';
  applyTheme(saved);
})();

// ── Main game module ──────────────────────────────────────────────────────────
(function () {

  // ── DOM references ─────────────────────────────────────────────────────────
  const board   = document.getElementById("gameBoard");
  const movesEl = document.getElementById("moves");
  const limitEl = document.getElementById("moveLimit");
  const levelEl = document.getElementById("levelNum");
  const scoreEl = document.getElementById("score");
  const resetBtn = document.getElementById("resetBtn");
  const nextBtn  = document.getElementById("nextBtn");

  // Side panel elements
  const levelProgressEl = document.getElementById("level-progress");
  const progressBarFill = document.getElementById("progress-bar-fill");
  const level2El        = document.getElementById("level2");
  const timerMinEl      = document.getElementById("timer-min");
  const timerSecEl      = document.getElementById("timer-sec");
  const timerBarFill    = document.getElementById("timer-bar-fill");

  // End-game modal
  const modalOverlay = document.getElementById("modal-overlay");
  const resScore     = document.getElementById("res-score");
  const resLevel     = document.getElementById("res-level");
  const resAttempts  = document.getElementById("res-attempts");
  const resCorrect   = document.getElementById("res-correct");
  const resWrong     = document.getElementById("res-wrong");
  const accPct       = document.getElementById("acc-pct");
  const accBarFill   = document.getElementById("acc-bar-fill");

  // ── Game state ─────────────────────────────────────────────────────────────
  let levelManager     = null;
  let engine           = null;
  let isGameActive     = false;
  let _timerSeconds    = TIMER_DURATION;
  let _timerInterval   = null;
  let _gameStarted     = false;
  let _isTransitioning = false;
  let _isRestoring     = false;  // NEW: flag to prevent double-init during restore

  const PROGRESS_DISPLAY_WINDOW = 20;

  // ── Storage helpers ────────────────────────────────────────────────────────

  function markSessionAlive() {
    try { sessionStorage.setItem(SESSION_KEY, '1'); } catch (e) {}
  }

  function isSessionAlive() {
    try { return sessionStorage.getItem(SESSION_KEY) === '1'; } catch (e) { return false; }
  }

  function saveState() {
    if (!levelManager || !isGameActive || _isRestoring) return;
    try {
      // Save the LIVE engine state (ball/blocks at their current positions)
      // so reload restores exactly where the player left off — not just the
      // pristine level start. Falls back to the pristine grid if no engine exists yet.
      const liveGrid   = engine ? engine.grid.map(row => row.slice()) : levelManager._savedGrid;
      const liveBlocks = engine ? engine.blocks.map(b => ({
        id: b.id, shapeKey: b.shapeKey,
        anchor: [...b.anchor],
        cells: b.cells.map(([r, c]) => [r, c]),
        color: b.color
      })) : levelManager._savedBlocks;
      const liveBall   = engine ? [...engine.ball] : null;
      const liveMoves  = engine ? engine.moves : 0;

      const state = {
        timerSeconds:    _timerSeconds,
        gameStarted:     true,
        levelNumber:     levelManager.levelNumber,
        score:           levelManager.score,
        attempts:        levelManager.attempts,
        levelsCompleted: levelManager.levelsCompleted,
        levelsFailed:    levelManager.levelsFailed,
        // Pristine level start — used by reset() and as fallback
        savedGrid:       levelManager._savedGrid,
        savedBlocks:     levelManager._savedBlocks,
        savedLevelNum:   levelManager._savedLevelNum,
        savedMoveLimit:  levelManager._savedMoveLimit,
        // Live mid-game state — used by reload restore
        liveGrid,
        liveBlocks,
        liveBall,
        liveMoves
      };
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    } catch (e) {
      console.warn('MotionChallenge: could not save state', e);
    }
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function clearSavedState() {
    try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    try { sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  // ── Timer helpers ──────────────────────────────────────────────────────────

  function _stopTimer() {
    if (_timerInterval) {
      clearInterval(_timerInterval);
      _timerInterval = null;
    }
  }

  function _startTimer() {
    if (_timerInterval) return;
    _timerInterval = setInterval(() => {
      if (!isGameActive || _isTransitioning || _isRestoring) return;
      _timerSeconds--;
      _renderTimer();
      saveState();
      if (_timerSeconds <= 0) {
        _stopTimer();
        handleTimeUp();
      }
    }, 1000);
  }

  function _resetTimerForNewGame() {
    _stopTimer();
    _timerSeconds = TIMER_DURATION;
    _renderTimer();
  }

  function _renderTimer() {
    const m = Math.floor(Math.max(0, _timerSeconds) / 60);
    const s = Math.max(0, _timerSeconds) % 60;
    if (timerMinEl) timerMinEl.textContent = String(m).padStart(2, '0');
    if (timerSecEl) timerSecEl.textContent = String(s).padStart(2, '0');

    if (timerBarFill) {
      const pct = (_timerSeconds / TIMER_DURATION) * 100;
      timerBarFill.style.width = Math.max(0, Math.min(100, pct)) + '%';
      timerBarFill.classList.remove('timer--warning', 'timer--danger');
      if      (pct <= 15) timerBarFill.classList.add('timer--danger');
      else if (pct <= 35) timerBarFill.classList.add('timer--warning');
    }
  }

  // ── HUD helpers ────────────────────────────────────────────────────────────

  function _updateHUD() {
    if (!levelManager) return;
    const lvl   = levelManager.getLevelNumber();
    const score = levelManager.getScore();

    if (levelEl)        levelEl.textContent  = lvl;
    if (scoreEl)        scoreEl.textContent  = score;
    // Only update moveLimit from engine if engine exists and has moveLimit
    if (level2El) {
      if (engine && engine.moveLimit !== undefined) {
        level2El.textContent = engine.moveLimit;
      } else if (levelManager.currentLevel && levelManager.currentLevel.moveLimit !== undefined) {
        level2El.textContent = levelManager.currentLevel.moveLimit;
      }
    }
    if (levelProgressEl) levelProgressEl.textContent = lvl;

    const qnum = document.getElementById("level");
    if (qnum) qnum.textContent = lvl;

    if (progressBarFill) {
      const pct = (((lvl - 1) % PROGRESS_DISPLAY_WINDOW) / PROGRESS_DISPLAY_WINDOW) * 100;
      progressBarFill.style.width = Math.min(100, pct) + '%';
    }
  }

  // ── Level lifecycle ────────────────────────────────────────────────────────

  function startLevel() {
    if (!isGameActive || !levelManager) {
      return;
    }

    if (_isTransitioning) {
      setTimeout(() => { 
        if (!_isTransitioning) startLevel(); 
      }, 50);
      return;
    }

    const level = levelManager.getCurrent();
    if (!level) {
      // If no level, try to generate one
      if (!_isRestoring) {
        levelManager._generateCurrent();
        const retryLevel = levelManager.getCurrent();
        if (!retryLevel) return;
        // Continue with the newly generated level below
        setupEngineWithLevel(retryLevel);
        return;
      }
      return;
    }

    setupEngineWithLevel(level);
  }

  function setupEngineWithLevel(level) {
    // Clean up old engine
    if (engine) { 
      engine.destroy(); 
      engine = null; 
    }

    // Create new engine
    engine = new GameEngine(board, level, movesEl, limitEl, {
      onWin:  handleWin,
      onLose: handleLose
    });
    
    engine.render();
    _updateHUD();

    // Only save if this is not a restore operation
    if (_gameStarted && !_isRestoring) saveState();

    if (!_timerInterval && _timerSeconds > 0) {
      _startTimer();
    }
  }

  // ── Win ───────────────────────────────────────────────────────────────────

  function handleWin(movesTaken) {
    if (!isGameActive || _isTransitioning) return;
    _isTransitioning = true;

    levelManager.recordWin(movesTaken);
    _updateHUD();
    if (!_isRestoring) saveState();

    if (levelManager.isGameOver()) {
      _stopTimer();
      clearSavedState();
      _showEndModal();
      _isTransitioning = false;
      return;
    }

    setTimeout(() => {
      levelManager.advance().then(() => {
        _isTransitioning = false;
        startLevel();
      }).catch(err => {
        _isTransitioning = false;
        startLevel();
      });
    }, 800);
  }

  // ── Lose ─────────────────────────────────────────────────────────────────

  function handleLose() {
    if (!isGameActive || _isTransitioning) return;
    _isTransitioning = true;

    levelManager.recordLose();
    _updateHUD();
    if (!_isRestoring) saveState();

    if (levelManager.isGameOver()) {
      _stopTimer();
      clearSavedState();
      _showEndModal();
      _isTransitioning = false;
      return;
    }

    setTimeout(() => {
      levelManager.advance().then(() => {
        _isTransitioning = false;
        startLevel();
      }).catch(err => {
        _isTransitioning = false;
        startLevel();
      });
    }, 800);
  }

  // ── Time up ──────────────────────────────────────────────────────────────

  function handleTimeUp() {
    if (!isGameActive) return;
    _isTransitioning = true;

    if (engine) engine._locked = true;
    levelManager.recordLose();
    _updateHUD();

    setTimeout(() => {
      clearSavedState();
      _showEndModal();
      _isTransitioning = false;
    }, 600);
  }

  // ── End-game modal ─────────────────────────────────────────────────────────

  function _showEndModal() {
    if (!levelManager) return;

    _stopTimer();
    isGameActive = false;
    const stats = levelManager.getStats();

    if (resScore)    resScore.textContent    = stats.score;
    if (resLevel)    resLevel.textContent    = stats.levelReached - 1;
    if (resAttempts) resAttempts.textContent = stats.attempts;
    if (resCorrect)  resCorrect.textContent  = stats.completed;
    if (resWrong)    resWrong.textContent    = stats.failed;

    const rate = stats.attempts > 0
      ? Math.round((stats.completed / stats.attempts) * 100)
      : 0;
    if (accPct)     accPct.textContent      = rate + '%';
    if (accBarFill) accBarFill.style.width  = rate + '%';

    if (modalOverlay) modalOverlay.classList.remove('hidden');
  }

  // ── Restore UI after reload ────────────────────────────────────────────────

  function _restoreUI() {
    _isRestoring = true;

    // Hide the start overlay since we're restoring a mid-game state
    const overlay = document.getElementById('start-overlay');
    if (overlay) overlay.classList.add('hidden');

    _renderTimer();
    _updateHUD();

    // Build the engine from the pristine level definition (gives us correct
    // dimensions, moveLimit, event handlers etc.)
    const level = levelManager.getCurrent();
    if (level) {
      setupEngineWithLevel(level);

      // NOW overwrite the engine's internal state with the live mid-game snapshot
      // (ball position, block positions, moves used) so the board shows exactly
      // where the player left off — not the pristine level start.
      if (engine && levelManager._liveGrid && levelManager._liveBlocks && levelManager._liveBall) {
        // Replace grid and blocks with live positions
        engine.grid   = levelManager._liveGrid.map(row => row.slice());
        engine.blocks = levelManager._liveBlocks.map(b => ({
          id: b.id, shapeKey: b.shapeKey,
          anchor: [...b.anchor],
          cells: b.cells.map(([r, c]) => [r, c]),
          color: b.color
        }));
        engine.ball   = [...levelManager._liveBall];
        engine.moves  = levelManager._liveMoves || 0;

        // Carry the backgroundGrid reference so holes render correctly
        engine.grid.backgroundGrid = engine.backgroundGrid;

        // Re-render with the live positions
        engine.render();
        engine._updateMovesUI();
        engine._updateLevelBarUI();
      }
    }

    _isRestoring = false;
  }

  // ── Restart ────────────────────────────────────────────────────────────────

  window.restartGame = function () {
    clearSavedState();
    if (modalOverlay) modalOverlay.classList.add('hidden');
    isGameActive     = false;
    _isTransitioning = false;
    _isRestoring     = false;
    _stopTimer();
    _resetTimerForNewGame();
    levelManager = new LevelManager();
    isGameActive = true;
    _gameStarted = true;
    markSessionAlive();
    saveState();
    startLevel();
  };

  // ── Button wiring ──────────────────────────────────────────────────────────

  function _attachControls() {
    const newResetBtn = resetBtn ? resetBtn.cloneNode(true) : null;
    const newNextBtn  = nextBtn  ? nextBtn.cloneNode(true)  : null;

    if (resetBtn && resetBtn.parentNode) resetBtn.parentNode.replaceChild(newResetBtn, resetBtn);
    if (nextBtn  && nextBtn.parentNode)  nextBtn.parentNode.replaceChild(newNextBtn, nextBtn);

    const finalResetBtn = document.getElementById("resetBtn");
    const finalNextBtn  = document.getElementById("nextBtn");

    if (finalResetBtn) {
      finalResetBtn.addEventListener('click', () => {
        if (!isGameActive || !levelManager || _isTransitioning) return;
        
        _isTransitioning = false;
        levelManager.reset();
        if (engine) { engine.destroy(); engine = null; }
        if (!_timerInterval && _timerSeconds > 0) _startTimer();
        setupEngineWithLevel(levelManager.getCurrent());
      });
    }

    if (finalNextBtn) {
      finalNextBtn.addEventListener('click', () => {
        if (!isGameActive || !levelManager || _isTransitioning) return;
     
        _isTransitioning = false;
        levelManager.skip();
        if (engine) { engine.destroy(); engine = null; }
        if (!_timerInterval && _timerSeconds > 0) _startTimer();
        startLevel();
      });
    }
  }

  // ── Init ───────────────────────────────────────────────────────────────────
  // NOTE: _gameStarted guard removed — the inline startGame() already cleared
  // state before calling here, so we always want a fresh init.  During a
  // restore (Scenario 1) this function is NOT called at all; window.onload
  // handles that path directly.

  function initGame() {
    _gameStarted = true;

    isGameActive = true;
    levelManager = new LevelManager();
    _attachControls();
    _resetTimerForNewGame();
    markSessionAlive();
    saveState();
    startLevel();
  }

  // Exposed so the inline <script> startGame() can reach it without name clash.
  // The inline script uses window._mcInitGame(); main.js's own startGame stays
  // as the hub-hook entry point (see window.motionChallenge below).
  window._mcInitGame = initGame;

  window.startGame = function () {
    const overlay = document.getElementById('start-overlay');
    if (overlay) overlay.classList.add('hidden');
    clearSavedState(); // Clear any previous game state
    initGame();
  };

  // ── Boot: two-key decision logic ──────────────────────────────────────────

  window.onload = function () {
    _stopTimer();
    _timerInterval = null;

    const sessionAlive  = isSessionAlive();
    const saved         = loadState();
    const hasActiveGame = saved && saved.gameStarted;

    if (sessionAlive && hasActiveGame) {
      // ── SCENARIO 1: Reload → restore game seamlessly ──────────────────────
      _gameStarted  = true;
      isGameActive  = true;
      _timerSeconds = saved.timerSeconds;

      // Rebuild LevelManager from the saved snapshot
      levelManager = LevelManager.fromSavedState(saved);

      _attachControls();
      _restoreUI();

      // Resume the timer (don't restart it — just pick up where we left off).
      // NOTE: setupEngineWithLevel() inside _restoreUI() also calls _startTimer()
      // only when _timerInterval is null, so this guard prevents double-start.
      if (!_timerInterval && _timerSeconds > 0) {
        _startTimer();
      }

    } else if (!sessionAlive && hasActiveGame) {
      // ── SCENARIO 2: Navigated away / new tab → show end modal ─────────────
      _gameStarted = true;
      isGameActive = false;

      // Rebuild manager just enough to show stats
      levelManager = LevelManager.fromSavedState(saved);

      // Hide start overlay, show modal with final score
      const overlay = document.getElementById('start-overlay');
      if (overlay) overlay.classList.add('hidden');

      _attachControls();
      _renderTimer();
      _updateHUD();
      clearSavedState();
      _showEndModal();

    } else {
      // ── SCENARIO 3: Fresh start ────────────────────────────────────────────
      clearSavedState();
      // Don't auto-init — wait for user to click Start Assessment
    }
  };

  // ── Parent hub hooks ─────────────────────────────────────────────────────
  window.motionChallenge = {
    pauseAndSave: function () {
      _stopTimer();
      if (_gameStarted) {
        saveState();
        clearSavedState();
        _showEndModal();
      }
    },
    resumeGame: function () {
      clearSavedState();
      isGameActive     = false;
      _isTransitioning = false;
      _isRestoring     = false;
      _stopTimer();
      _resetTimerForNewGame();
      levelManager = new LevelManager();
      isGameActive = true;
      _gameStarted = true;
      markSessionAlive();
      saveState();
      startLevel();
    }
  };

})();