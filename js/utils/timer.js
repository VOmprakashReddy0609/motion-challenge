// js/utils/timer.js

class Timer {

  constructor(display) {
    this.display  = display;
    this.time     = TIMER_DURATION;
    this.interval = null;
    this.onExpire = null;   // optional callback when time hits 0

    if (this.display) this.display.innerText = this.time;
  }

  start() {
    // Guard: don't start a second interval if already running
    if (this.interval) return;

    this.interval = setInterval(() => {
      this.time--;

      if (this.display) this.display.innerText = this.time;

      if (this.time <= 0) {
        this.stop();
        if (typeof this.onExpire === "function") {
          this.onExpire();
        } else {
          alert("Time Over! Starting a new level.");
        }
      }
    }, 1000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  // BUG FIX: reset now resets time and display but does NOT auto-start.
  // main.js calls timer.reset() then timer.start() explicitly via startLevel().
  reset() {
    this.stop();
    this.time = TIMER_DURATION;
    if (this.display) this.display.innerText = this.time;
  }

}