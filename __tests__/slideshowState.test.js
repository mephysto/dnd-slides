const { createSlideshowState } = require("../lib/slideshowState");

describe("slideshowState", () => {
  let manager;

  afterEach(() => {
    if (manager) {
      manager.clear();
    }
  });

  test("GIVEN kenBurns enabled WHEN state updates THEN kenBurns remains true", () => {
    const states = [];
    manager = createSlideshowState({ onStateChange: (s) => states.push(s) });

    // GIVEN
    manager.setKenBurns(true);

    // WHEN
    manager.setEnvironment({ name: "Cave", urls: ["/env/cave-1.jpg"] });
    manager.advance();

    // THEN
    expect(states[0].kenBurns).toBe(true);
    expect(states[1].kenBurns).toBe(true);
  });

  test("GIVEN exploration mode THEN setMode(encounter) clears kenBurns", () => {
    manager = createSlideshowState();
    manager.setMode("exploration");
    manager.setKenBurns(true);

    manager.setMode("encounter");

    expect(manager.getState().kenBurns).toBe(false);
  });
});
