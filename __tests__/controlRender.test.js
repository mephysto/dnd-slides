/**
 * @jest-environment jsdom
 */

let createControlRenderer;
let getPlayPauseAction;

describe("Control renderer", () => {
  beforeAll(async () => {
    const module = await import("../public/js/control/render.js");
    createControlRenderer = module.createControlRenderer;
    getPlayPauseAction = module.getPlayPauseAction;
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  function createDom() {
    const dom = {};
    dom.grid = document.createElement("div");
    dom.emptyState = document.createElement("div");
    dom.previewImg = document.createElement("img");
    dom.previewName = document.createElement("div");
    dom.currentPreview = document.createElement("div");
    dom.modeToggle = document.createElement("input");
    dom.modeToggle.type = "checkbox";
    dom.modeToggleLabel = document.createElement("span");
    dom.btnPrev = document.createElement("button");
    dom.btnNext = document.createElement("button");
    dom.btnPlayPause = document.createElement("button");
    dom.btnStop = document.createElement("button");
    dom.selectedItems = document.createElement("div");
    return dom;
  }

  test("renders monster grid and toggles selected/active state", () => {
    const dom = createDom();
    const renderer = createControlRenderer(dom);

    const monsters = [
      { name: "orc", urls: ["/monsters/orc-1.jpg"], thumbUrl: "/monsters/orc-1.jpg" },
      { name: "goblin", urls: ["/monsters/goblin-1.jpg"], thumbUrl: "/monsters/goblin-1.jpg" },
    ];

    renderer.renderGrid({
      mode: "encounter",
      filter: "",
      monsters,
      environments: [],
      selectedMonsters: [monsters[1]],
      selectedEnvironment: null,
      currentMonster: monsters[1],
      currentEnvironment: null,
    });

    const cards = dom.grid.querySelectorAll(".item-card");
    expect(cards.length).toBe(2);
    expect(cards[0].classList.contains("active")).toBe(false);
    expect(cards[1].classList.contains("active")).toBe(true);
    expect(cards[1].classList.contains("selected")).toBe(true);
  });

  test("updatePreview updates preview UI", () => {
    const dom = createDom();
    const renderer = createControlRenderer(dom);

    const monster = { name: "goblin", urls: ["/monsters/goblin-1.jpg"] };

    renderer.updatePreview({
      mode: "encounter",
      currentMonster: monster,
      currentEnvironment: null,
      currentSlideIndex: 0,
      selectedMonsters: [monster],
      isPaused: false,
    });

    expect(dom.previewImg.src).toContain("/monsters/goblin-1.jpg");
    expect(dom.previewName.textContent).toContain("goblin");
    expect(dom.currentPreview.classList.contains("empty")).toBe(false);
  });

  test("attachGridListeners calls handler with item", () => {
    const dom = createDom();
    const renderer = createControlRenderer(dom);

    const monsters = [{ name: "orc", urls: ["/monsters/orc-1.jpg"], thumbUrl: "/monsters/orc-1.jpg" }];

    renderer.renderGrid({
      mode: "encounter",
      filter: "",
      monsters,
      environments: [],
      selectedMonsters: [],
      selectedEnvironment: null,
      currentMonster: null,
      currentEnvironment: null,
    });

    const handler = jest.fn();
    renderer.attachGridListeners(handler);

    const card = dom.grid.querySelector(".item-card");
    card.click();

    expect(handler).toHaveBeenCalledWith({
      name: "orc",
      urls: ["/monsters/orc-1.jpg"],
    });
  });

  describe("updateModeToggle", () => {
    // updateModeToggle looks the header label up in the document rather than via dom
    function addSelectedHeaderLabel() {
      document.body.innerHTML = `<div class="selected-header"><span class="label"></span></div>`;
      return document.querySelector(".selected-header .label");
    }

    test("encounter mode checks the toggle and sets both labels", () => {
      const dom = createDom();
      const headerLabel = addSelectedHeaderLabel();
      const renderer = createControlRenderer(dom);

      renderer.updateModeToggle("encounter");

      expect(dom.modeToggle.checked).toBe(true);
      expect(dom.modeToggleLabel.textContent).toBe("Encounter");
      expect(headerLabel.textContent).toBe("Selected Encounter");
    });

    test("exploration mode unchecks the toggle and sets both labels", () => {
      const dom = createDom();
      dom.modeToggle.checked = true;
      const headerLabel = addSelectedHeaderLabel();
      const renderer = createControlRenderer(dom);

      renderer.updateModeToggle("exploration");

      expect(dom.modeToggle.checked).toBe(false);
      expect(dom.modeToggleLabel.textContent).toBe("Exploration");
      expect(headerLabel.textContent).toBe("Selected Environment");
    });
  });

  describe("updateSlideControls", () => {
    test("idle shows play and disables prev/next", () => {
      const dom = createDom();
      const renderer = createControlRenderer(dom);

      renderer.updateSlideControls({ isPaused: false, currentSlideCount: 0, playPauseAction: "none" });

      expect(dom.btnPlayPause.textContent).toBe("▶");
      expect(dom.btnPlayPause.classList.contains("active")).toBe(false);
      expect(dom.btnPrev.disabled).toBe(true);
      expect(dom.btnNext.disabled).toBe(true);
    });

    test("playing shows pause and enables prev/next when there are several slides", () => {
      const dom = createDom();
      const renderer = createControlRenderer(dom);

      renderer.updateSlideControls({ isPaused: false, currentSlideCount: 3, playPauseAction: "pause" });

      expect(dom.btnPlayPause.textContent).toBe("⏸");
      expect(dom.btnPlayPause.classList.contains("active")).toBe(false);
      expect(dom.btnPrev.disabled).toBe(false);
      expect(dom.btnNext.disabled).toBe(false);
    });

    test("playing a single slide keeps prev/next disabled", () => {
      const dom = createDom();
      const renderer = createControlRenderer(dom);

      renderer.updateSlideControls({ isPaused: false, currentSlideCount: 1, playPauseAction: "pause" });

      expect(dom.btnPlayPause.textContent).toBe("⏸");
      expect(dom.btnPrev.disabled).toBe(true);
      expect(dom.btnNext.disabled).toBe(true);
    });

    test("paused shows play and marks the button active", () => {
      const dom = createDom();
      const renderer = createControlRenderer(dom);

      renderer.updateSlideControls({ isPaused: true, currentSlideCount: 3, playPauseAction: "resume" });

      expect(dom.btnPlayPause.textContent).toBe("▶");
      expect(dom.btnPlayPause.classList.contains("active")).toBe(true);
    });

    test("stop is disabled when nothing is showing", () => {
      const dom = createDom();
      const renderer = createControlRenderer(dom);

      renderer.updateSlideControls({ isPaused: false, hasActive: false, currentSlideCount: 0, playPauseAction: "none" });

      expect(dom.btnStop.disabled).toBe(true);
      expect(dom.btnStop.classList.contains("active")).toBe(false);
    });

    test("stop is enabled while showing and lit once the display is blanked", () => {
      const dom = createDom();
      const renderer = createControlRenderer(dom);

      renderer.updateSlideControls({ isPaused: false, hasActive: true, currentSlideCount: 3, playPauseAction: "pause" });
      expect(dom.btnStop.disabled).toBe(false);
      expect(dom.btnStop.classList.contains("active")).toBe(false);

      renderer.updateSlideControls({ isPaused: true, isStopped: true, hasActive: true, currentSlideCount: 3, playPauseAction: "resume" });
      expect(dom.btnStop.classList.contains("active")).toBe(true);
      expect(dom.btnPlayPause.textContent).toBe("▶");
    });

    test("a changed selection shows play while the slideshow is still running", () => {
      const dom = createDom();
      const renderer = createControlRenderer(dom);

      renderer.updateSlideControls({ isPaused: false, currentSlideCount: 3, playPauseAction: "start" });

      expect(dom.btnPlayPause.textContent).toBe("▶");
    });
  });

  describe("getPlayPauseAction", () => {
    const orc = { name: "orc", urls: ["/monsters/orc-1.jpg"] };

    test("a stopped display resumes even if the timer was never paused", () => {
      const action = getPlayPauseAction({
        mode: "encounter",
        activeMonsters: [orc],
        activeEnvironment: null,
        selectedMonsters: [orc],
        selectedEnvironment: null,
        isPaused: false,
        isStopped: true,
      });

      expect(action).toBe("resume");
    });
    const goblin = { name: "goblin", urls: ["/monsters/goblin-1.jpg"] };
    const cave = { name: "cave", urls: ["/environments/cave-1.jpg"] };
    const forest = { name: "forest", urls: ["/environments/forest-1.jpg"] };

    const action = (overrides) =>
      getPlayPauseAction({
        mode: "encounter",
        activeMonsters: [],
        activeEnvironment: null,
        selectedMonsters: [],
        selectedEnvironment: null,
        isPaused: false,
        ...overrides,
      });

    describe("encounter mode", () => {
      test("nothing active and nothing selected does nothing", () => {
        expect(action({})).toBe("none");
      });

      test("nothing active with a selection starts", () => {
        expect(action({ selectedMonsters: [orc] })).toBe("start");
      });

      test("selection matching what is showing pauses", () => {
        expect(action({ activeMonsters: [orc, goblin], selectedMonsters: [orc, goblin] })).toBe("pause");
      });

      test("matching is by name, not object identity", () => {
        expect(action({ activeMonsters: [orc], selectedMonsters: [{ ...orc }] })).toBe("pause");
      });

      test("selection matching what is showing resumes when paused", () => {
        expect(action({ activeMonsters: [orc], selectedMonsters: [orc], isPaused: true })).toBe("resume");
      });

      test("an added monster starts with the new selection", () => {
        expect(action({ activeMonsters: [orc], selectedMonsters: [goblin, orc] })).toBe("start");
      });

      test("a removed monster starts with the new selection", () => {
        expect(action({ activeMonsters: [orc, goblin], selectedMonsters: [orc] })).toBe("start");
      });

      test("the same monsters in a different order start again", () => {
        expect(action({ activeMonsters: [orc, goblin], selectedMonsters: [goblin, orc] })).toBe("start");
      });

      test("a changed selection starts even while paused", () => {
        expect(action({ activeMonsters: [orc], selectedMonsters: [goblin], isPaused: true })).toBe("start");
      });

      test("an emptied selection still toggles pause", () => {
        expect(action({ activeMonsters: [orc] })).toBe("pause");
        expect(action({ activeMonsters: [orc], isPaused: true })).toBe("resume");
      });

      test("ignores the environment", () => {
        expect(action({ activeEnvironment: cave, selectedEnvironment: forest })).toBe("none");
      });
    });

    describe("exploration mode", () => {
      const explore = (overrides) => action({ mode: "exploration", ...overrides });

      test("nothing active and nothing selected does nothing", () => {
        expect(explore({})).toBe("none");
      });

      test("nothing active with a selection starts", () => {
        expect(explore({ selectedEnvironment: cave })).toBe("start");
      });

      test("selection matching what is showing pauses", () => {
        expect(explore({ activeEnvironment: cave, selectedEnvironment: { ...cave } })).toBe("pause");
      });

      test("selection matching what is showing resumes when paused", () => {
        expect(explore({ activeEnvironment: cave, selectedEnvironment: cave, isPaused: true })).toBe("resume");
      });

      test("a different environment starts with the new selection", () => {
        expect(explore({ activeEnvironment: cave, selectedEnvironment: forest })).toBe("start");
        expect(explore({ activeEnvironment: cave, selectedEnvironment: forest, isPaused: true })).toBe("start");
      });

      test("a deselected environment still toggles pause", () => {
        expect(explore({ activeEnvironment: cave })).toBe("pause");
        expect(explore({ activeEnvironment: cave, isPaused: true })).toBe("resume");
      });

      test("ignores monsters", () => {
        expect(explore({ activeMonsters: [orc], selectedMonsters: [goblin] })).toBe("none");
      });
    });
  });
});
