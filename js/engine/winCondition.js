// js/engine/winCondition.js
// Win/loss condition checkers

// Win: the ball has reached the hole (goal) position.
// The engine tracks goal as a fixed [r,c] pair set at level load.
function checkWin(ballPosition, goalPosition) {
  if (!ballPosition || !goalPosition) return false;
  return ballPosition[0] === goalPosition[0] && ballPosition[1] === goalPosition[1];
}

// Lose: moves exhausted.
function checkLose(movesUsed, moveLimit) {
  return movesUsed >= moveLimit;
}

// Export for module usage (if needed)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { checkWin, checkLose };
}