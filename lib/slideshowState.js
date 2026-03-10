const DEFAULT_ENCOUNTER_SLIDE_DURATION = 5000;
const DEFAULT_EXPLORATION_SLIDE_DURATION = 30000;

function createSlideshowState({ onStateChange } = {}) {
  const state = {
    mode: "encounter", // "encounter" | "exploration"
    monsters: [],
    monsterIndex: 0,
    environment: null,
    slideIndex: 0,
    slideDuration: DEFAULT_ENCOUNTER_SLIDE_DURATION,
    paused: false,
    visible: true,
    kenBurns: false,
  };

  let timer = null;

  const notify = () => {
    if (typeof onStateChange === "function") {
      onStateChange(getState());
    }
  };

  const getState = () => ({
    ...state,
    kenBurns: Boolean(state.kenBurns),
    currentItem: getCurrentItem(),
    environment: state.mode === "exploration" ? state.environment : null,
  });

  const getCurrentItem = () => {
    if (state.mode === "exploration") {
      return state.environment;
    }
    if (
      !Array.isArray(state.monsters) ||
      state.monsters.length === 0 ||
      state.monsterIndex < 0 ||
      state.monsterIndex >= state.monsters.length
    ) {
      return null;
    }
    return state.monsters[state.monsterIndex];
  };

  const getActiveItem = () => {
    if (state.mode === "exploration") return state.environment;
    return getCurrentItem();
  };

  const stopTimer = () => {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  };

  const startTimer = () => {
    stopTimer();

    const active = getActiveItem();
    if (state.paused || !active || !Array.isArray(active.urls) || active.urls.length === 0) {
      return;
    }

    timer = setInterval(() => {
      advance();
      notify();
    }, state.slideDuration);
  };

  const nextMonster = () => {
    if (!Array.isArray(state.monsters) || state.monsters.length <= 1) return;
    state.monsterIndex = (state.monsterIndex + 1) % state.monsters.length;
    state.slideIndex = 0;
  };

  const prevMonster = () => {
    if (!Array.isArray(state.monsters) || state.monsters.length <= 1) return;
    state.monsterIndex = (state.monsterIndex - 1 + state.monsters.length) % state.monsters.length;
    state.slideIndex = 0;
  };

  const advance = () => {
    const active = getActiveItem();
    if (!active || !Array.isArray(active.urls) || active.urls.length === 0) return;

    state.slideIndex = (state.slideIndex + 1) % active.urls.length;

    if (state.mode === "encounter" && state.slideIndex === 0) {
      nextMonster();
    }
  };

  const previous = () => {
    const active = getActiveItem();
    if (!active || !Array.isArray(active.urls) || active.urls.length === 0) return;

    if (state.slideIndex > 0) {
      state.slideIndex -= 1;
      return;
    }

    // If we're at the beginning of slides, step back to previous monster (encounter mode)
    if (state.mode === "encounter") {
      prevMonster();
      const prevMonsterItem = getCurrentItem();
      state.slideIndex = prevMonsterItem?.urls?.length ? prevMonsterItem.urls.length - 1 : 0;
    }
  };

  const setMode = (mode) => {
    if (mode !== "encounter" && mode !== "exploration") return;
    state.mode = mode;
    state.slideIndex = 0;
    state.paused = false;
    state.slideDuration = mode === "exploration" ? DEFAULT_EXPLORATION_SLIDE_DURATION : DEFAULT_ENCOUNTER_SLIDE_DURATION;

    // Only apply Ken Burns in exploration mode
    if (mode !== "exploration") {
      state.kenBurns = false;
    }

    startTimer();
    notify();
  };

  const setEncounter = (monsters) => {
    state.mode = "encounter";
    state.slideDuration = DEFAULT_ENCOUNTER_SLIDE_DURATION;
    state.monsters = Array.isArray(monsters) ? monsters : [];
    state.monsterIndex = 0;
    state.environment = null;
    state.slideIndex = 0;
    state.paused = false;
    state.visible = true;
    startTimer();
    notify();
  };

  const setEnvironment = (environment) => {
    state.mode = "exploration";
    state.slideDuration = DEFAULT_EXPLORATION_SLIDE_DURATION;
    state.environment = environment || null;
    state.monsters = [];
    state.monsterIndex = 0;
    state.slideIndex = 0;
    state.paused = false;
    state.visible = true;
    startTimer();
    notify();
  };

  const setSlideDuration = (ms) => {
    const duration = Math.max(500, Number(ms) || 0);
    state.slideDuration = duration;
    startTimer();
    notify();
  };

  const togglePause = () => {
    state.paused = !state.paused;
    if (state.paused) {
      stopTimer();
    } else {
      startTimer();
    }
    notify();
  };

  const setVisible = (visible) => {
    state.visible = Boolean(visible);
    notify();
  };

  const setKenBurns = (enabled) => {
    state.kenBurns = Boolean(enabled);
    notify();
  };

  const clear = () => {
    state.monsters = [];
    state.environment = null;
    state.slideIndex = 0;
    state.paused = false;
    state.visible = true;
    state.kenBurns = false;
    stopTimer();
    notify();
  };

  return {
    getState,
    notify,
    setMode,
    setEncounter,
    setEnvironment,
    setSlideDuration,
    togglePause,
    setVisible,
    setKenBurns,
    clear,
    advance,
    previous,
    nextMonster,
    prevMonster,
    startTimer,
  };
}

module.exports = {
  createSlideshowState,
};
