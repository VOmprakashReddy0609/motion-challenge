// js/main.js
// FIXED VERSION — Stable, Non-Async to prevent recursion crashes

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

  const PROGRESS_DISPLAY_WINDOW = 20;

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
      if (!isGameActive || _isTransitioning) return;
      _timerSeconds--;
      _renderTimer();
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
    if (level2El && engine) level2El.textContent = engine.moveLimit;
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
      // Retry shortly if transitioning
      setTimeout(() => { 
        if (!_isTransitioning) startLevel(); 
      }, 50);
      return;
    }

    const level = levelManager.getCurrent();
    if (!level) { 
      
      return; 
    }

    

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

    if (levelManager.isGameOver()) {
      _stopTimer();
      _showEndModal();
      _isTransitioning = false;
      return;
    }

    // Use setTimeout instead of async/await to prevent recursion issues
    setTimeout(() => {
      // Generate next level synchronously
      levelManager.advance().then(() => {
        _isTransitioning = false;
        startLevel();
      }).catch(err => {
      
        _isTransitioning = false;
        // Try to continue anyway
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

    if (levelManager.isGameOver()) {
      _stopTimer();
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
      _showEndModal();
      _isTransitioning = false;
    }, 600);
  }

  // ── End-game modal ─────────────────────────────────────────────────────────

  function _showEndModal() {
    if (!levelManager) return;

    _stopTimer();
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
    isGameActive = false;
  }

  // ── Restart ────────────────────────────────────────────────────────────────

  window.restartGame = function () {
   
    if (modalOverlay) modalOverlay.classList.add('hidden');
    isGameActive     = false;
    _isTransitioning = false;
    _stopTimer();
    _resetTimerForNewGame();
    levelManager = new LevelManager();
    isGameActive = true;
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
        startLevel();
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

  function initGame() {
    if (_gameStarted) return;
    _gameStarted = true;

  
    isGameActive = true;
    levelManager = new LevelManager();
    _attachControls();
    _resetTimerForNewGame();
    startLevel();
  }

  window.startGame = function () {
   
    const overlay = document.getElementById('start-overlay');
    if (overlay) overlay.classList.add('hidden');
    initGame();
  };

  if (!document.getElementById('start-overlay')) {
    initGame();
  }

})();