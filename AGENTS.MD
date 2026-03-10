# DND Slideshow Application (dnd-slides)

## Project Overview

This repository hosts a lightweight local web app for running a **Dungeons & Dragons visual slideshow**.

The app has two main modes:

- **Encounter mode**: show monster images selected by the DM. Each monster can have multiple slides (e.g., `orc-1.jpg`, `orc-2.jpg`). The display cycles through each monster in the encounter and then loops.
- **Exploration mode**: show environment/mood images (e.g., `cave`, `forest`) at a slower pace (default 30s per slide).

The UI is split between a **DM control panel** (`/dm`) and a **TV display** (`/`). State is synced via WebSockets.

## Key Features

- **Monster slideshow** (multi-image monsters, grouped by base name)
- **Encounter selection**: select multiple monsters and run them as an encounter
- **Exploration mode** with environment image slideshows
- **Mode toggle** (Encounter vs Exploration)
- **Slide controls**: next/prev, pause/resume
- **Configurable slide duration** via UI
- **Live refresh**: new images can be added to `monsters/` or `environments/` and loaded via refresh

## Acceptance Criteria

A new AI agent working in this repo should ensure the following are true:

1. **Encounters work correctly**
   - Selecting monsters adds/removes them from the encounter list.
   - The display cycles through each monster and their slides.
   - Slide order respects numbering in filenames (e.g., `goblin-1.jpg`, `goblin-2.jpg`).
   - The display loops cleanly after the last monster.

2. **Exploration mode works**
   - Environment images are sourced from `environments/`.
   - Selecting an environment starts a slideshow at the slow pace (30s per slide).
   - Switching between encounter/exploration retains correct UI state.

3. **UI/UX expectations**
   - Control panel lists current selection clearly.
   - “Clear” action empties selection and resets display.
   - Slide control buttons behave predictably.

4. **Stability and compatibility**
   - The app runs locally via `node server.js` and exposes `/` and `/dm`.
   - Adding new image files should not require code changes.

## Project Structure

- `server.js` — Node/Express server + Socket.IO state sync + APIs
- `public/control.html` — DM control UI (selection + mode + controls)
- `public/display.html` — TV display UI (renders slideshow)
- `monsters/` — monster images (grouped by base filename)
- `environments/` — environment mood images

## Running Locally

```bash
npm install
node server.js
```

Then open:
- Control: http://localhost:3000/dm
- Display: http://localhost:3000/

---

## Notes for Future Agents

When working in this repo, focus on:
- Keeping the separation between control panel state and display state.
- Maintaining the slideshow group logic (filename grouping + sorting).
- Avoid breaking backward compatibility for older clients (some state fields remain present for legacy reasons).

Agents should always review this file before making changes, since it defines the expected behavior and acceptance criteria.  

---

*Last updated: March 2026*