// Manages the slide progress bar shown in the control panel.
// Usage:
//   const progress = createSlideProgress(fillElement, labelElement);
//   progress.reset(durationMs);
//   progress.pause();
//   progress.resume();
//
export function createSlideProgress(fillEl, labelEl) {
  let raf = null;
  let start = 0;
  let duration = 0;
  let paused = false;

  const rafFn = typeof requestAnimationFrame === "function" ? requestAnimationFrame : (cb) => setTimeout(cb, 16);
  const cancelRaf = typeof cancelAnimationFrame === "function" ? cancelAnimationFrame : (id) => clearTimeout(id);

  const update = () => {
    if (!fillEl || !labelEl) return;
    const elapsed = Date.now() - start;
    const progress = Math.min(1, Math.max(0, elapsed / duration));

    fillEl.style.width = `${progress * 100}%`;
    const remainingMs = Math.max(0, duration - elapsed);
    labelEl.textContent = `${Math.ceil(remainingMs / 1000)}s`;

    if (progress < 1 && !paused) {
      raf = rafFn(update);
    }
  };

  const reset = (ms) => {
    duration = Math.max(0, Number(ms) || 0);
    start = Date.now();
    paused = false;
    cancelRaf(raf);
    if (duration > 0) {
      raf = rafFn(update);
    }
  };

  const pause = () => {
    paused = true;
    cancelRaf(raf);
  };

  const resume = () => {
    if (!paused) return;
    paused = false;
    start = Date.now();
    cancelRaf(raf);
    raf = rafFn(update);
  };

  const stop = () => {
    paused = true;
    cancelRaf(raf);
  };

  return { reset, pause, resume, stop };
}
