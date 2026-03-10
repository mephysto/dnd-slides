const { getCurrentState } = require("../public/js/displayState");

describe("displayState.getCurrentState", () => {
  test("GIVEN encounter state with one monster WHEN computing state THEN returns correct url and indices", () => {
    // GIVEN
    const state = {
      mode: "encounter",
      monsters: [
        { name: "Goblin", urls: ["/monsters/goblin-1.png", "/monsters/goblin-2.png"] },
      ],
      monsterIndex: 0,
      slideIndex: 1,
      visible: true,
    };

    // WHEN
    const result = getCurrentState(state);

    // THEN
    expect(result.mode).toBe("encounter");
    expect(result.item.name).toBe("Goblin");
    expect(result.urls).toEqual(["/monsters/goblin-1.png", "/monsters/goblin-2.png"]);
    expect(result.slideIndex).toBe(1);
    expect(result.itemCount).toBe(1);
  });

  test("GIVEN exploration state WHEN missing urls THEN returns empty list", () => {
    // GIVEN
    const state = {
      mode: "exploration",
      environment: { name: "Cave" },
      slideIndex: 0,
      visible: true,
    };

    // WHEN
    const result = getCurrentState(state);

    // THEN
    expect(result.mode).toBe("exploration");
    expect(result.item.name).toBe("Cave");
    expect(result.urls).toEqual([]);
    expect(result.slideIndex).toBe(0);
    expect(result.itemCount).toBe(1);
  });

  test("GIVEN invalid slideIndex WHEN computing state THEN clamps within range", () => {
    // GIVEN
    const state = {
      mode: "encounter",
      monsters: [{ name: "Orc", urls: ["/monsters/orc-1.png"] }],
      monsterIndex: 0,
      slideIndex: 100,
      visible: true,
    };

    // WHEN
    const result = getCurrentState(state);

    // THEN
    expect(result.slideIndex).toBe(0);
  });
});
