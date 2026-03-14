// js/ui/controls.js

function attachControls(resetBtn, nextBtn, resetFn, nextFn) {

  if (resetBtn && typeof resetFn === "function") {
    resetBtn.addEventListener("click", function (e) {
      e.preventDefault();
      resetFn();
    });
  }

  if (nextBtn && typeof nextFn === "function") {
    nextBtn.addEventListener("click", function (e) {
      e.preventDefault();
      nextFn();
    });
  }

}