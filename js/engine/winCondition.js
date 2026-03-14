// js/engine/winCondition.js

function checkWin(ballPosition, goalPosition) {
  if (!ballPosition || !goalPosition) return false;

  const [br, bc] = ballPosition;
  const [gr, gc] = goalPosition;

  return br === gr && bc === gc;
}