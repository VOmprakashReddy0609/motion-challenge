// js/utils/timer.js

class Timer {

  constructor(display) {
    this.display  = display;   // the DOM element showing time
    this.time     = TIMER_DURATION;
    this.interval = null;
    this.onExpire = null;      // callback fired when time hits 0
    this._render();
  }

  start() {
    if (this.interval) return;   // guard: never double-start
    this.interval = setInterval(() => {
      this.time--;
      this._render();
      if (this.time <= 0) {
        this.stop();
        if (typeof this.onExpire === "function") this.onExpire();
      }
    }, 1000);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  // Resets time to full duration. Does NOT auto-start — caller must call start().
  reset() {
    this.stop();
    this.time = TIMER_DURATION;
    this._render();
  }

  // ── Internal rendering ────────────────────────────────────────────────────

  _render() {
    if (!this.display) return;
    const t    = Math.max(0, this.time);
    const mins = String(Math.floor(t / 60)).padStart(2, "0");
    const secs = String(t % 60).padStart(2, "0");
    this.display.textContent = mins + ":" + secs;

    // Visual warnings
    this.display.classList.remove("timer--warning", "timer--danger");
    const pct = t / TIMER_DURATION;
    if (pct <= 0.15)      this.display.classList.add("timer--danger");
    else if (pct <= 0.33) this.display.classList.add("timer--warning");
  }

}