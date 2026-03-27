// js/ui/controls.js

function attachControls(resetBtn, nextBtn, resetFn, nextFn) {

  if (resetBtn && typeof resetFn === "function") {
    resetBtn.addEventListener("click", (e) => { e.preventDefault(); resetFn(); });
  }

  if (nextBtn && typeof nextFn === "function") {
    nextBtn.addEventListener("click", (e) => { e.preventDefault(); nextFn(); });
  }

}

// ── Score / level UI helpers ──────────────────────────────────────────────────

function updateHUD(levelEl, scoreEl, level, score) {
  if (levelEl) levelEl.textContent = level;
  if (scoreEl) scoreEl.textContent = score;
}