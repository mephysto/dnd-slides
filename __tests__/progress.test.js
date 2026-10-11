/**
 * @jest-environment jsdom
 */

import { createSlideProgress } from "../public/js/control/progress.js";

// A margin comfortably larger than one animation frame, so assertions do not
// depend on exactly which tick a frame happens to land on.
const FRAME_MARGIN_MS = 100;

const setFractions = () => global.NProgress.set.mock.calls.map(([fraction]) => fraction);
const lastFraction = () => setFractions().at(-1);

describe("Slide progress", () => {
  beforeEach(() => {
    // Fake timers must be installed before createSlideProgress() runs: it
    // captures requestAnimationFrame once, at creation time.
    jest.useFakeTimers();
    // progress.js expects NProgress as a global (script tag in control.html).
    global.NProgress = {
      configure: jest.fn(),
      set: jest.fn(),
      done: jest.fn(),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    delete global.NProgress;
  });

  test("configures NProgress as a plain bar without spinner or trickle", () => {
    createSlideProgress();

    expect(NProgress.configure).toHaveBeenCalledTimes(1);
    expect(NProgress.configure).toHaveBeenCalledWith(
      expect.objectContaining({ showSpinner: false, trickle: false, minimum: 0 })
    );
    expect(NProgress.set).not.toHaveBeenCalled();
  });

  test("reset starts at 0 and progresses to 1 over the duration", () => {
    const progress = createSlideProgress();

    progress.reset(2000);
    expect(setFractions()).toEqual([0]);

    jest.advanceTimersByTime(1000);
    expect(lastFraction()).toBeGreaterThan(0.4);
    expect(lastFraction()).toBeLessThanOrEqual(0.5);

    jest.advanceTimersByTime(1000 + FRAME_MARGIN_MS);
    expect(lastFraction()).toBe(1);

    const fractions = setFractions();
    expect(fractions).toEqual([...fractions].sort((a, b) => a - b));
    expect(fractions.every((fraction) => fraction >= 0 && fraction <= 1)).toBe(true);
  });

  test("stops scheduling frames once the bar is full", () => {
    const progress = createSlideProgress();

    progress.reset(2000);
    jest.advanceTimersByTime(2000 + FRAME_MARGIN_MS);
    const callsWhenFull = NProgress.set.mock.calls.length;

    jest.advanceTimersByTime(5000);
    expect(NProgress.set).toHaveBeenCalledTimes(callsWhenFull);
    expect(jest.getTimerCount()).toBe(0);
  });

  test("reset restarts a running timer from 0", () => {
    const progress = createSlideProgress();

    progress.reset(2000);
    jest.advanceTimersByTime(1500);
    NProgress.set.mockClear();

    progress.reset(4000);
    expect(setFractions()).toEqual([0]);

    jest.advanceTimersByTime(1000);
    expect(lastFraction()).toBeGreaterThan(0.2);
    expect(lastFraction()).toBeLessThanOrEqual(0.25);
    // Only one frame loop may be alive, otherwise the bar updates twice per frame.
    expect(jest.getTimerCount()).toBe(1);
  });

  test("pause stops updates", () => {
    const progress = createSlideProgress();

    progress.reset(2000);
    jest.advanceTimersByTime(500);
    progress.pause();
    const callsWhenPaused = NProgress.set.mock.calls.length;
    expect(callsWhenPaused).toBeGreaterThan(1);

    jest.advanceTimersByTime(5000);
    expect(NProgress.set).toHaveBeenCalledTimes(callsWhenPaused);
    expect(jest.getTimerCount()).toBe(0);
  });

  test("resume continues updating until the bar is full", () => {
    const progress = createSlideProgress();

    progress.reset(2000);
    jest.advanceTimersByTime(500);
    progress.pause();
    jest.advanceTimersByTime(5000);
    const callsWhenPaused = NProgress.set.mock.calls.length;

    progress.resume();
    jest.advanceTimersByTime(FRAME_MARGIN_MS);
    expect(NProgress.set.mock.calls.length).toBeGreaterThan(callsWhenPaused);

    jest.advanceTimersByTime(2000);
    expect(lastFraction()).toBe(1);
  });

  // Pins current behaviour: resume() restarts the clock, so the bar jumps back
  // to the beginning and runs the full duration again instead of picking up
  // from where it was paused. If that is fixed, this test should change with it.
  test("resume restarts the fraction from 0 rather than continuing", () => {
    const progress = createSlideProgress();

    progress.reset(2000);
    jest.advanceTimersByTime(1000);
    progress.pause();
    const fractionWhenPaused = lastFraction();
    expect(fractionWhenPaused).toBeGreaterThan(0.4);

    progress.resume();
    jest.advanceTimersByTime(FRAME_MARGIN_MS);
    expect(lastFraction()).toBeLessThan(fractionWhenPaused);
    expect(lastFraction()).toBeLessThanOrEqual(FRAME_MARGIN_MS / 2000);

    // Still short of full at the point where a continuing timer would be done.
    jest.advanceTimersByTime(1000);
    expect(lastFraction()).toBeLessThan(1);
  });

  test("resume does nothing when not paused", () => {
    const progress = createSlideProgress();

    progress.reset(2000);
    jest.advanceTimersByTime(1000);
    progress.resume();

    expect(jest.getTimerCount()).toBe(1);
    jest.advanceTimersByTime(FRAME_MARGIN_MS);
    expect(lastFraction()).toBeGreaterThan(0.5);
  });

  test("stop finishes the bar and halts updates", () => {
    const progress = createSlideProgress();

    progress.reset(2000);
    jest.advanceTimersByTime(500);
    expect(NProgress.done).not.toHaveBeenCalled();

    progress.stop();
    expect(NProgress.done).toHaveBeenCalledTimes(1);
    const callsWhenStopped = NProgress.set.mock.calls.length;

    jest.advanceTimersByTime(5000);
    expect(NProgress.set).toHaveBeenCalledTimes(callsWhenStopped);
    expect(jest.getTimerCount()).toBe(0);
  });

  test.each([
    ["zero", 0],
    ["negative", -500],
    ["non-numeric", "soon"],
    ["undefined", undefined],
    ["NaN", NaN],
  ])("a %s duration does not schedule updates", (_label, duration) => {
    const progress = createSlideProgress();

    progress.reset(duration);
    expect(jest.getTimerCount()).toBe(0);

    jest.advanceTimersByTime(5000);
    expect(setFractions()).toEqual([0]);
  });
});
