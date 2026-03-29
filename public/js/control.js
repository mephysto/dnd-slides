// DM control panel logic (UI state + socket interactions)

import { createSlideProgress } from './control/progress.js';
import { createControlRenderer } from './control/render.js';

const socket = io();
const grid = document.getElementById('item-grid');
const searchInput = document.getElementById('search');
const emptyState = document.getElementById('empty-state');
const previewImg = document.getElementById('preview-img');
const previewName = document.getElementById('preview-name');
const currentPreview = document.getElementById('current-preview');
const connDot = document.getElementById('conn-dot');
const connText = document.getElementById('conn-text');
const btnModeEncounter = document.getElementById('btn-mode-encounter');
const btnModeExploration = document.getElementById('btn-mode-exploration');
const btnStart = document.getElementById('btn-start');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnPause = document.getElementById('btn-pause');
const slideDurationInput = document.getElementById('slide-duration');
const btnClearSelection = document.getElementById('btn-clear-selection');
const kbToggle = document.getElementById('kb-toggle');
const btnHide = document.getElementById('btn-hide');
const btnClear = document.getElementById('btn-clear');
const btnRefresh = document.getElementById('btn-refresh');
const selectedItems = document.getElementById('selected-items');

const renderer = createControlRenderer({
    grid,
    emptyState,
    previewImg,
    previewName,
    currentPreview,
    btnHide,
    btnModeEncounter,
    btnModeExploration,
    btnPrev,
    btnNext,
    btnPause,
    selectedItems,
});

let mode = 'encounter'; // "encounter" or "exploration"
let monsters = [];
let environments = [];
let selectedMonsters = [];
let selectedEnvironment = null;
let currentMonster = null;
let currentEnvironment = null;
let currentMonsterIndex = 0;
let isHidden = false;
let currentSlideIndex = 0;
let currentSlideCount = 0;
let currentSlideDuration = 5000;
let isPaused = false;

const progress = createSlideProgress();

// Connection status
socket.on('connect', () => {
    connDot.className = 'dot connected';
    connText.textContent = 'Connected';
});

socket.on('disconnect', () => {
    connDot.className = 'dot disconnected';
    connText.textContent = 'Disconnected';
});

// State sync
socket.on('state', (state) => {
    mode = state.mode || 'encounter';

    selectedMonsters = Array.isArray(state.monsters) ? state.monsters : [];
    const monsterIndex = Number(state.monsterIndex) || 0;
    currentMonster = selectedMonsters[monsterIndex] || null;
    currentMonsterIndex = monsterIndex;

    currentEnvironment = state.environment || null;
    selectedEnvironment = currentEnvironment;

    isHidden = !state.visible;
    currentSlideIndex = Number(state.slideIndex) || 0;
    currentSlideDuration = Number(state.slideDuration) || 10_000;
    isPaused = Boolean(state.paused);
    currentSlideCount = Array.isArray((mode === 'exploration' ? currentEnvironment : currentMonster)?.urls)
        ? mode === 'exploration'
            ? currentEnvironment.urls.length
            : currentMonster.urls.length
        : 0;

    slideDurationInput.value = Math.max(1, Math.round(currentSlideDuration / 1_000));
    kbToggle.checked = Boolean(state.kenBurns);
    kbToggle.disabled = mode !== 'exploration';

    // Reset slide progress timer whenever state updates
    if (isPaused) {
      stopSlideProgress();
    } else {
      resetSlideProgress();
    }

    refreshUI();
});

function resetSlideProgress() {
    progress.reset(currentSlideDuration);
}

function startSlideProgress() {
    progress.reset(currentSlideDuration);
}

function stopSlideProgress() {
    progress.pause();
}

// Load monsters
async function loadMonsters() {
    try {
        const res = await fetch('/api/monsters');
        monsters = await res.json();
        if (mode === 'encounter') refreshUI();
    } catch (err) {
        console.error('Failed to load monsters:', err);
    }
}

async function loadEnvironments() {
    try {
        const res = await fetch('/api/environments');
        environments = await res.json();
        if (mode === 'exploration') refreshUI();
    } catch (err) {
        console.error('Failed to load environments:', err);
    }
}

function refreshUI() {
    renderer.updateModeButtons(mode);
    renderer.updatePreview({
        mode,
        currentMonster,
        currentEnvironment,
        currentSlideIndex,
        selectedMonsters,
        isHidden,
        isPaused,
    });
    renderer.updateSelectedCard({
        mode,
        currentEnvironment,
        currentMonster,
        selectedEnvironment,
        selectedMonsters,
    });
    renderer.updateHideButton(isHidden);
    renderer.updateSlideControls({ isPaused, currentSlideCount });

    renderer.renderGrid({
        mode,
        filter: searchInput.value,
        monsters,
        environments,
        selectedMonsters,
        selectedEnvironment,
        currentMonster,
        currentEnvironment,
    });

    renderer.attachGridListeners(handleGridItemClick);
}

function handleGridItemClick(item) {
    if (mode === 'exploration') {
        if (selectedEnvironment?.name === item.name) {
            selectedEnvironment = null;
        } else {
            selectedEnvironment = item;
        }
    } else {
        const idx = selectedMonsters.findIndex((m) => m.name === item.name);
        if (idx === -1) {
            selectedMonsters.unshift(item);
        } else {
            selectedMonsters.splice(idx, 1);
        }
    }

    refreshUI();
}

function setMode(newMode) {
    mode = newMode;
    btnModeEncounter.classList.toggle('btn-mode--active', mode === 'encounter');
    btnModeExploration.classList.toggle('btn-mode--active', mode === 'exploration');
    const label = mode === 'exploration' ? 'Selected Environment' : 'Selected Encounter';
    document.querySelector('.selected-header .label').textContent = label;

    // Reset selections for the other mode when switching
    if (mode === 'exploration') {
        selectedMonsters = [];
    } else {
        selectedEnvironment = null;
    }

    const emptyMessage =
        mode === 'exploration'
            ? `No environment images found.<br>Drop image files into the <code>environments/</code> folder and click <strong>⟳ Refresh</strong>.<br><br>Supports: PNG, JPG, GIF, WebP, SVG`
            : `No monster images found.<br>Drop image files into the <code>monsters/</code> folder and click <strong>⟳ Refresh</strong>.<br><br>Supports: PNG, JPG, GIF, WebP, SVG`;
    document.querySelector('#empty-state p').innerHTML = emptyMessage;

    refreshUI();
}

// Event listeners
searchInput.addEventListener('input', (e) => {
    refreshUI();
});

btnStart.addEventListener('click', () => {
    if (mode === 'exploration') {
        if (!selectedEnvironment) return;
        socket.emit('show-environment', selectedEnvironment);
    } else {
        if (selectedMonsters.length === 0) return;
        socket.emit('show-monsters', selectedMonsters);
    }
});

btnModeEncounter.addEventListener('click', () => {
    setMode('encounter');
    socket.emit('set-mode', 'encounter');
});

btnModeExploration.addEventListener('click', () => {
    setMode('exploration');
    socket.emit('set-mode', 'exploration');
});

btnPrev.addEventListener('click', () => {
    socket.emit('prev-slide');
});

btnNext.addEventListener('click', () => {
    socket.emit('next-slide');
});

btnPause.addEventListener('click', () => {
    socket.emit('toggle-pause');
});

slideDurationInput.addEventListener('change', () => {
    const seconds = Number(slideDurationInput.value);
    if (seconds > 0) {
        socket.emit('set-slide-duration', seconds * 1000);
    }
});

kbToggle.addEventListener('change', () => {
    console.log('Ken Burns toggle:', kbToggle.checked);
    socket.emit('set-kenburns', kbToggle.checked);
});

btnClearSelection.addEventListener('click', () => {
    selectedMonsters = [];
    selectedEnvironment = null;
    socket.emit('clear');
    refreshUI();
});

btnClear.addEventListener('click', () => {
    socket.emit('clear');
    selectedMonsters = [];
    selectedEnvironment = null;
    searchInput.value = '';
    refreshUI();
});

btnRefresh.addEventListener('click', () => {
    loadMonsters();
    loadEnvironments();
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        searchInput.value = '';
        refreshUI();
        searchInput.blur();
    }
});

// Initial load
loadMonsters();
loadEnvironments();
setMode(mode);
