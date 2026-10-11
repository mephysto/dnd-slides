// Rendering helpers for the DM control panel.

// Decides what the play/pause button does when pressed: "start" (send the
// selection to the display), "pause", "resume", or "none" (nothing to play).
// Shared by the click handler and the icon so the two cannot disagree.
// A stopped (blanked) display counts as resumable even if the timer is running,
// so play is always the way back from stop.
export function getPlayPauseAction({ mode, activeMonsters, activeEnvironment, selectedMonsters, selectedEnvironment, isPaused, isStopped = false }) {
  const isExploration = mode === "exploration";
  const hasActive = isExploration ? Boolean(activeEnvironment) : activeMonsters.length > 0;
  const hasSelection = isExploration ? Boolean(selectedEnvironment) : selectedMonsters.length > 0;

  // Order matters for monsters: it is the order the server plays them in.
  const selectionMatchesActive = isExploration
    ? selectedEnvironment?.name === activeEnvironment?.name
    : selectedMonsters.length === activeMonsters.length &&
      selectedMonsters.every((m, idx) => m.name === activeMonsters[idx].name);

  if (hasSelection && (!hasActive || !selectionMatchesActive)) return "start";
  if (!hasActive) return "none";
  return isPaused || isStopped ? "resume" : "pause";
}

export function createControlRenderer(dom) {
  function renderSelectedList({ mode, selectedEnvironment, selectedMonsters }) {
    if (mode === "exploration") {
      if (!selectedEnvironment) {
        dom.selectedItems.textContent = "(No environment selected)";
        return;
      }
      dom.selectedItems.innerHTML = `<div class="selected-item">${selectedEnvironment.name}</div>`;
      return;
    }

    if (selectedMonsters.length === 0) {
      dom.selectedItems.textContent = "(No monsters selected)";
      return;
    }

    dom.selectedItems.innerHTML = selectedMonsters
      .map((m, idx) => `<div class="selected-item">${idx + 1}. ${m.name}</div>`)
      .join("");
  }

  function updateSelectedCard({ mode, currentEnvironment, currentMonster, selectedEnvironment, selectedMonsters }) {
    dom.grid.querySelectorAll(".item-card").forEach((card) => {
      const name = card.dataset.name;
      const isSelected =
        mode === "exploration"
          ? selectedEnvironment?.name === name
          : selectedMonsters.some((m) => m.name === name);
      const isActive =
        mode === "exploration"
          ? currentEnvironment?.name === name
          : currentMonster?.name === name;
      card.classList.toggle("selected", isSelected);
      card.classList.toggle("active", isActive);
    });

    renderSelectedList({ mode, selectedEnvironment, selectedMonsters });
  }

  function updateModeToggle(mode) {
    dom.modeToggle.checked = mode === "encounter";
    dom.modeToggleLabel.textContent = mode === "encounter" ? "Encounter" : "Exploration";
    const label = mode === "exploration" ? "Selected Environment" : "Selected Encounter";
    document.querySelector(".selected-header .label").textContent = label;
  }

  function updateSlideControls({ isPaused, isStopped = false, hasActive = false, currentSlideCount, playPauseAction }) {
    const hasSlides = currentSlideCount > 1;
    dom.btnPrev.disabled = !hasSlides;
    dom.btnNext.disabled = !hasSlides;

    dom.btnPlayPause.textContent = playPauseAction === "pause" ? "⏸" : "▶";
    dom.btnPlayPause.classList.toggle("active", isPaused);

    dom.btnStop.disabled = !hasActive;
    dom.btnStop.classList.toggle("active", hasActive && isStopped);
  }

  function renderGrid({ mode, filter, monsters, environments, selectedMonsters, selectedEnvironment, currentMonster, currentEnvironment }) {
    const source = mode === "exploration" ? environments : monsters;
    const filtered = filter
      ? source.filter((m) => m.name.toLowerCase().includes(filter.toLowerCase()))
      : source;

    if (source.length === 0) {
      dom.emptyState.style.display = "block";
      dom.grid.style.display = "none";
      return;
    }

    dom.emptyState.style.display = filtered.length === 0 ? "block" : "none";
    dom.grid.style.display = filtered.length === 0 ? "none" : "grid";

    const isSelected = (name) =>
      mode === "exploration"
        ? selectedEnvironment?.name === name
        : selectedMonsters.some((m) => m.name === name);

    const isActive = (name) =>
      mode === "exploration"
        ? currentEnvironment?.name === name
        : currentMonster?.name === name;

    dom.grid.innerHTML = filtered
      .map((m) => {
        const selected = isSelected(m.name);
        const active = isActive(m.name);
        const thumbUrl = m.thumbUrl || (m.urls && m.urls[0]);
        return `
        <div class="item-card ${selected ? "selected" : ""} ${active ? "active" : ""}"
             data-name="${m.name}" data-urls='${JSON.stringify(m.urls)}' title="${m.name}">
          <img src="${thumbUrl}" alt="${m.name}" loading="lazy" />
          <div class="card-name">${m.name}</div>
        </div>
      `;
      })
      .join("");
  }

  function attachGridListeners(handler) {
    dom.grid.querySelectorAll(".item-card").forEach((card) => {
      card.addEventListener("click", () => {
        const item = {
          name: card.dataset.name,
          urls: JSON.parse(card.dataset.urls || "[]"),
        };
        handler(item);
      });
    });
  }

  function updatePreview(props) {
    const { mode, currentMonster, currentEnvironment, currentSlideIndex, selectedMonsters, isPaused, isStopped } = props;

    const activeItem = mode === "exploration" ? currentEnvironment : currentMonster;

    if (activeItem) {
      const urls = Array.isArray(activeItem.urls) ? activeItem.urls : [];
      const count = urls.length;
      const slideIndex = Math.min(Math.max(0, currentSlideIndex), count - 1);
      const previewUrl = count ? urls[slideIndex] : "";

      dom.previewImg.src = previewUrl || "";
      const slideProgress = count > 1 ? ` (${slideIndex + 1}/${count})` : "";
      const itemProgress =
        mode === "encounter" && selectedMonsters.length > 1
          ? ` [${currentMonster ? selectedMonsters.findIndex((m) => m.name === currentMonster.name) + 1 : 1}/${selectedMonsters.length}]`
          : "";
      const pausedText = isStopped ? " (Stopped)" : isPaused ? " (Paused)" : "";

      dom.previewName.textContent =
        activeItem.name + itemProgress + slideProgress + pausedText;
      dom.currentPreview.classList.remove("empty");
    } else {
      dom.previewImg.src = "";
      dom.previewName.textContent = "Nothing selected";
      dom.currentPreview.classList.add("empty");
    }
  }

  return {
    renderGrid,
    attachGridListeners,
    updatePreview,
    updateSelectedCard,
    updateModeToggle,
    updateSlideControls,
  };
}
