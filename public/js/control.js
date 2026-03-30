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
const modeToggle = document.getElementById('mode-toggle');
const modeToggleLabel = document.getElementById('mode-toggle-label');
const btnPrev = document.getElementById('btn-prev');
const btnNext = document.getElementById('btn-next');
const btnPlayPause = document.getElementById('btn-playpause');
const slideDurationInput = document.getElementById('slide-duration');
const btnClearSelection = document.getElementById('btn-clear-selection');
const kbToggle = document.getElementById('kb-toggle');
const btnRefresh = document.getElementById('btn-refresh');
const selectedItems = document.getElementById('selected-items');

const renderer = createControlRenderer({
    grid,
    emptyState,
    previewImg,
    previewName,
    currentPreview,
    modeToggle,
    modeToggleLabel,
    btnPrev,
    btnNext,
    btnPlayPause,
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
        progress.pause();
    } else {
        progress.reset(currentSlideDuration);
    }

    refreshUI();
});

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
    const hasActive = mode === 'exploration' ? currentEnvironment !== null : currentMonster !== null;

    renderer.updateModeToggle(mode);
    renderer.updatePreview({
        mode,
        currentMonster,
        currentEnvironment,
        currentSlideIndex,
        selectedMonsters,
        isPaused,
    });
    renderer.updateSelectedCard({
        mode,
        currentEnvironment,
        currentMonster,
        selectedEnvironment,
        selectedMonsters,
    });
    renderer.updateSlideControls({ isPaused, currentSlideCount, hasActive });

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
    modeToggle.checked = mode === 'encounter';
    modeToggleLabel.textContent = mode === 'encounter' ? 'Encounter' : 'Exploration';
    document.querySelector('.selected-header .label').textContent =
        mode === 'exploration' ? 'Selected Environment' : 'Selected Encounter';

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
searchInput.addEventListener('input', () => {
    refreshUI();
});

modeToggle.addEventListener('change', () => {
    const newMode = modeToggle.checked ? 'encounter' : 'exploration';
    setMode(newMode);
    socket.emit('set-mode', newMode);
});

// Play/pause button doubles as the start button when nothing is active
btnPlayPause.addEventListener('click', () => {
    const hasActive = mode === 'exploration' ? currentEnvironment !== null : currentMonster !== null;
    if (hasActive) {
        socket.emit('toggle-pause');
    } else if (mode === 'exploration' && selectedEnvironment) {
        socket.emit('show-environment', selectedEnvironment);
    } else if (mode === 'encounter' && selectedMonsters.length > 0) {
        socket.emit('show-monsters', selectedMonsters);
    }
});

btnPrev.addEventListener('click', () => {
    socket.emit('prev-slide');
});

btnNext.addEventListener('click', () => {
    socket.emit('next-slide');
});

slideDurationInput.addEventListener('change', () => {
    const seconds = Number(slideDurationInput.value);
    if (seconds > 0) {
        socket.emit('set-slide-duration', seconds * 1000);
    }
});

kbToggle.addEventListener('change', () => {
    socket.emit('set-kenburns', kbToggle.checked);
});

btnClearSelection.addEventListener('click', () => {
    selectedMonsters = [];
    selectedEnvironment = null;
    socket.emit('clear');
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
