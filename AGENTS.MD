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
- **Slide controls**: next/prev, and a single play/pause button that also starts the slideshow
- **Configurable slide duration** via UI (seconds per slide)
- **Moving Slide** (Ken Burns) effect, exploration mode only
- **Live refresh**: new images can be added to `monsters/` or `environments/` and loaded via refresh

### DM control panel layout

- **Header**: a single row with the title and the connection status.
- **Body**: search box, "Now Showing" preview, the selection list, and the image grid. The selection header holds **⟳ Refresh** and a single **✕ Clear** button.
- **Bottom bar** (fixed to the bottom of the screen), left to right:
  - Encounter/Exploration **toggle switch**
  - **Previous**, **play/pause**, **stop**, **next** buttons
  - **Seconds-per-slide** input
  - **Moving Slide** checkbox (disabled outside exploration mode)

Tapping items in the grid only changes the local selection; nothing is sent to the display until the play/pause button is pressed.

## Acceptance Criteria

A new AI agent working in this repo should ensure the following are true:

1. **Encounters work correctly**
   - Selecting monsters adds/removes them from the encounter list.
   - The display cycles through each monster and their slides.
   - Slide order respects numbering in filenames (e.g., `goblin-1.jpg`, `goblin-2.jpg`).
   - The display loops cleanly after the last monster.

2. **Exploration mode works**
   - Environment images are sourced from `environments/`.
   - Selecting an environment and pressing play starts a slideshow at the slow pace (30s per slide).
   - Switching between encounter/exploration retains correct UI state.

3. **UI/UX expectations**
   - Control panel lists current selection clearly.
   - “Clear” action empties selection and resets display.
   - Slide control buttons behave predictably.
   - The play/pause button starts the slideshow whenever the selection differs from what is showing (including when nothing is showing, and when the selection is changed while a slideshow is running); otherwise it pauses/resumes the running slideshow.
   - The stop button blanks the display and pauses the timer without losing the selection or the current slide; play brings the display back and resumes.
   - Mode toggle, slide controls, duration and Moving Slide stay in the bottom bar; the header stays a single row.

4. **Stability and compatibility**
   - The app runs locally via `node server.js` and exposes `/` and `/dm`.
   - Adding new image files should not require code changes.
   - `npm test` passes.

## Project Structure

- `server.js` — Node/Express server + Socket.IO state sync + APIs (single entrypoint)
- `lib/`
  - `scanImages.js` — groups image files by base filename and sorts slides
  - `slideshowState.js` — server-side slideshow state and timer
- `public/control.html` — DM control UI (selection + mode + controls)
- `public/display.html` — TV display UI (renders slideshow)
- `public/js/`
  - `control.js` — control panel logic (UI state + socket events)
  - `control/render.js` — control panel rendering helpers
  - `control/progress.js` — slide progress bar
  - `display.js` — display DOM logic
  - `displayState.js` — normalises server state for the display
- `src/styles/` — SCSS sources (`styles.scss` entry point; `_base.scss`, `_display.scss`, `_control.scss`)
- `public/styles/styles.css` — compiled artefact; **never edit by hand**
- `electron/` — desktop app wrapper (boots the server, status window, folder settings)
- `__tests__/` — Jest tests
- `monsters/` — monster images (grouped by base filename)
- `environments/` — environment mood images

## Styling

Styles are written in SCSS and compiled to `public/styles/styles.css`. Edit the files in `src/styles/` only, then compile with `npm run build:css`, or leave `npm run dev` running (it runs the sass watcher alongside `node --watch server.js`).

## Running Locally

```bash
npm install
npm run dev        # sass watcher + auto-restarting server
# or
node server.js     # server only
```

Then open:
- Control: http://localhost:3001/dm
- Display: http://localhost:3001/

Run the tests with:

```bash
npm test
```

---

## Notes for Future Agents

When working in this repo, focus on:
- Keeping the separation between control panel state and display state.
- Maintaining the slideshow group logic (filename grouping + sorting).
- Avoid breaking backward compatibility for older clients (some state fields remain present for legacy reasons).

Agents should always review this file before making changes, since it defines the expected behavior and acceptance criteria.  

---

*Last updated: October 2026*
