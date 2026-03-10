/**
 * @jest-environment jsdom
 */

import { createSlideProgress } from "../public/js/control/progress.js";

describe("Slide progress", () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("reset starts progress and updates label", () => {
    const fill = document.createElement("div");
    const label = document.createElement("div");
    const progress = createSlideProgress(fill, label);

    progress.reset(2000);
    // requestAnimationFrame fallback uses setTimeout(16ms)
    jest.advanceTimersByTime(16);
    expect(label.textContent).toBe("2s");

    // Advance 1 second
    jest.advanceTimersByTime(1000);
    expect(label.textContent).toBe("1s");

    // Advance to completion
    jest.advanceTimersByTime(1000);
    expect(label.textContent).toBe("0s");
    expect(fill.style.width).toBe("100%");
  });

  test("pause stops updates", () => {
    const fill = document.createElement("div");
    const label = document.createElement("div");
    const progress = createSlideProgress(fill, label);

    progress.reset(2000);
    jest.advanceTimersByTime(500);
    progress.pause();
    const pausedLabel = label.textContent;

    jest.advanceTimersByTime(1000);
    expect(label.textContent).toBe(pausedLabel);
  });
});
