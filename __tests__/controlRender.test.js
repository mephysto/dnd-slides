/**
 * @jest-environment jsdom
 */

let createControlRenderer;

describe("Control renderer", () => {
  beforeAll(async () => {
    const module = await import("../public/js/control/render.js");
    createControlRenderer = module.createControlRenderer;
  });

  function createDom() {
    const dom = {};
    dom.grid = document.createElement("div");
    dom.emptyState = document.createElement("div");
    dom.previewImg = document.createElement("img");
    dom.previewName = document.createElement("div");
    dom.currentPreview = document.createElement("div");
    dom.btnHide = document.createElement("button");
    dom.btnModeEncounter = document.createElement("button");
    dom.btnModeExploration = document.createElement("button");
    dom.btnPrev = document.createElement("button");
    dom.btnNext = document.createElement("button");
    dom.btnPause = document.createElement("button");
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
      isHidden: false,
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
});
