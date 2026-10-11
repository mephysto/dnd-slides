// DM control panel logic (UI state + socket interactions)

import { createSlideProgress } from './control/progress.js';
import { createControlRenderer, getPlayPauseAction } from './control/render.js';

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
const btnStop = document.getElementById('btn-stop');
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
    btnStop,
    selectedItems,
});

let mode = 'encounter'; // "encounter" or "exploration"
let monsters = [];
let environments = [];
let selectedMonsters = [];
let selectedEnvironment = null;
// What the display is showing (server truth), kept apart from the selection
// so the DM can line up a change while a slideshow is running.
let activeMonsters = [];
// The server re-broadcasts state on every slide advance; without this flag
// each broadcast would wipe a selection the DM has edited but not yet played.
let hasPendingSelection = false;
let currentMonster = null;
let currentEnvironment = null;
let currentMonsterIndex = 0;
let currentSlideIndex = 0;
let currentSlideCount = 0;
let currentSlideDuration = 5000;
let isPaused = false;
// Stopped = the display is blanked but the slideshow and selection are kept
let isStopped = false;

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

    activeMonsters = Array.isArray(state.monsters) ? state.monsters : [];
    const monsterIndex = Number(state.monsterIndex) || 0;
    currentMonster = activeMonsters[monsterIndex] || null;
    currentMonsterIndex = monsterIndex;

    currentEnvironment = state.environment || null;

    if (!hasPendingSelection) {
        // Copied because grid clicks mutate the selection in place
        selectedMonsters = [...activeMonsters];
        selectedEnvironment = currentEnvironment;
    }

    currentSlideIndex = Number(state.slideIndex) || 0;
    currentSlideDuration = Number(state.slideDuration) || 10_000;
    isPaused = Boolean(state.paused);
    isStopped = state.visible === false;
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

function playPauseAction() {
    return getPlayPauseAction({
        mode,
        activeMonsters,
        activeEnvironment: currentEnvironment,
        selectedMonsters,
        selectedEnvironment,
        isPaused,
        isStopped,
    });
}

function refreshUI() {
    const hasActive = mode === 'exploration' ? currentEnvironment !== null : activeMonsters.length > 0;

    renderer.updateModeToggle(mode);
    renderer.updatePreview({
        mode,
        currentMonster,
        currentEnvironment,
        currentSlideIndex,
        // The [n/total] counter describes the running encounter, not a pending edit
        selectedMonsters: activeMonsters,
        isPaused,
        isStopped,
    });
    renderer.updateSelectedCard({
        mode,
        currentEnvironment,
        currentMonster,
        selectedEnvironment,
        selectedMonsters,
    });
    renderer.updateSlideControls({
        isPaused,
        isStopped,
        hasActive,
        currentSlideCount,
        playPauseAction: playPauseAction(),
    });

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

    hasPendingSelection = true;
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
    // A mode switch abandons any unplayed edit, so follow the server again
    hasPendingSelection = false;

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

// Play/pause button doubles as the start button when nothing is active, or
// when the selection has changed since the slideshow started
btnPlayPause.addEventListener('click', () => {
    const action = playPauseAction();
    if (action === 'start') {
        hasPendingSelection = false;
        if (mode === 'exploration') {
            socket.emit('show-environment', selectedEnvironment);
        } else {
            socket.emit('show-monsters', selectedMonsters);
        }
    } else if (action === 'pause') {
        socket.emit('toggle-pause');
    } else if (action === 'resume') {
        if (isStopped) socket.emit('reveal');
        if (isPaused) socket.emit('toggle-pause');
    }
});

// Stop blanks the TV without losing the selection or the place in the
// slideshow. The timer is paused too, so slides do not advance unseen.
btnStop.addEventListener('click', () => {
    if (isStopped) return;
    socket.emit('hide');
    if (!isPaused) socket.emit('toggle-pause');
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
    hasPendingSelection = false;
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
