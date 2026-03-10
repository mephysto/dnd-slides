// This script drives the TV display. It expects `displayState.getCurrentState` to be available.
// It is intentionally kept DOM-focused and minimal since the logic is in `displayState.js`.

const socket = io();
const container = document.getElementById('display-container');
const idleScreen = document.getElementById('idle-screen');
const itemDisplay = document.getElementById('item-display');
const itemImage = document.getElementById('item-image');
const itemName = document.getElementById('item-name');
const connectionStatus = document.getElementById('connection-status');
let lastKenBurns = null;

socket.on('connect', () => {
    connectionStatus.className = 'connected';
});

socket.on('disconnect', () => {
    connectionStatus.className = 'disconnected';
});

const setItemImage = (url, name) => {
    if (!url) return;
    if (itemImage.src === url) return;

    itemImage.src = url;
    itemImage.alt = name || '';

    // Trigger fade-in without overriding other animations (e.g., Ken Burns)
    itemImage.classList.remove('fade');
    void itemImage.offsetWidth;
    itemImage.classList.add('fade');
};

socket.on('state', (state) => {
    // Handle visibility
    if (state.visible) {
        container.classList.remove('hidden');
    } else {
        container.classList.add('hidden');
    }

    const { mode, item, urls, index, slideIndex, itemCount } = displayState.getCurrentState(state);

    if (lastKenBurns !== state.kenBurns) {
        console.log('Ken Burns state:', state.kenBurns);
        lastKenBurns = state.kenBurns;
    }

    // Exploration mode should cover the screen; encounter mode should fit within the display.
    itemImage.classList.toggle('cover', mode === 'exploration');
    itemImage.classList.toggle('kenburns', mode === 'exploration' && Boolean(state.kenBurns));

    if (item) {
        idleScreen.style.display = 'none';
        itemDisplay.classList.add('active');

        const url = urls[slideIndex] || urls[0] || '';
        setItemImage(url, item.name);

        const itemProgress = mode === 'encounter' && itemCount > 1 ? ` [${index + 1}/${itemCount}]` : '';
        const slideProgress = urls.length > 1 ? ` (${slideIndex + 1}/${urls.length})` : '';
        const progressText = itemProgress + slideProgress;
        itemName.innerHTML = progressText
            ? `${item.name}<span class="progress-indicator">${progressText}</span>`
            : item.name;
    } else {
        idleScreen.style.display = 'flex';
        itemDisplay.classList.remove('active');
        itemImage.src = '';
        itemName.textContent = '';
    }
});
