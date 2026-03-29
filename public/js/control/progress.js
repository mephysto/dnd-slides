// Drives the NProgress top bar as a slide timer.
// NProgress is loaded as a global via script tag in control.html.
export function createSlideProgress() {
  let raf = null;
  let start = 0;
  let duration = 0;
  let paused = false;

  NProgress.configure({ showSpinner: false, trickle: false, minimum: 0 });

  const rafFn    = typeof requestAnimationFrame  === 'function' ? requestAnimationFrame  : (cb) => setTimeout(cb, 16);
  const cancelRaf = typeof cancelAnimationFrame  === 'function' ? cancelAnimationFrame  : (id) => clearTimeout(id);

  const update = () => {
    const elapsed  = Date.now() - start;
    const fraction = Math.min(1, Math.max(0, elapsed / duration));

    NProgress.set(fraction);

    if (fraction < 1 && !paused) {
      raf = rafFn(update);
    }
  };

  const reset = (ms) => {
    duration = Math.max(0, Number(ms) || 0);
    start    = Date.now();
    paused   = false;
    cancelRaf(raf);
    NProgress.set(0);
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
    start  = Date.now();
    cancelRaf(raf);
    raf = rafFn(update);
  };

  const stop = () => {
    paused = true;
    cancelRaf(raf);
    NProgress.done();
  };

  return { reset, pause, resume, stop };
}
