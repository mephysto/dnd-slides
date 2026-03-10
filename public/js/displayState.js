(function (root, factory) {
  if (typeof define === "function" && define.amd) {
    define(factory);
  } else if (typeof module === "object" && module.exports) {
    module.exports = factory();
  } else {
    root.displayState = factory();
  }
})(typeof self !== "undefined" ? self : this, function () {
  /**
   * Given the server state, return a normalized display state useful for the TV client.
   *
   * @param {object} state - The state object emitted by the server over socket.
   * @returns {{mode: string, item: object|null, urls: string[], index: number, slideIndex: number, itemCount: number}}
   */
  function getCurrentState(state) {
    const mode = state.mode || "encounter";

    if (mode === "exploration") {
      const environment = state.environment || null;
      const urls =
        environment?.urls && Array.isArray(environment.urls) && environment.urls.length > 0
          ? environment.urls
          : environment?.url
          ? [environment.url]
          : [];
      const slideIndex = Math.max(0, Math.min((urls.length || 1) - 1, Number(state.slideIndex) || 0));
      return {
        mode,
        item: environment,
        urls,
        index: 0,
        slideIndex,
        itemCount: 1,
      };
    }

    const items = Array.isArray(state.monsters) ? state.monsters : [];
    const itemIndex = Math.max(0, Math.min(items.length - 1, Number(state.monsterIndex) || 0));
    const item = items[itemIndex] || null;
    const urls =
      item?.urls && Array.isArray(item.urls) && item.urls.length > 0
        ? item.urls
        : item?.url
        ? [item.url]
        : [];
    const slideIndex = Math.max(0, Math.min((urls.length || 1) - 1, Number(state.slideIndex) || 0));
    return {
      mode,
      item,
      urls,
      index: itemIndex,
      slideIndex,
      itemCount: items.length,
    };
  }

  return {
    getCurrentState,
  };
});
