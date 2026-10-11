# D&D Slides

A local web app for running a Dungeons & Dragons visual slideshow during sessions. The Dungeon Master controls what's on screen from their phone; a TV or second screen shows the display.

## How it works

The app runs a small Node server on a computer connected to the same network as the DM's phone and the display device.

- **Display** (`/`) — open in a browser on the TV or second screen
- **DM Control Panel** (`/dm`) — open on your phone to control what's shown

State is synced in real time via WebSockets, so changes on the phone appear on the display instantly.

### Modes

| Mode | Description |
|------|-------------|
| **Encounter** | Show one or more monsters. Each monster can have multiple slides (`goblin-1.jpg`, `goblin-2.jpg`). The display cycles through the encounter and loops. |
| **Exploration** | Show environment/mood images at a slower pace (30s per slide). |

---

## Running locally (development)

Requires [Node.js](https://nodejs.org) 18+.

```bash
npm install
npm run dev        # start server + SCSS watcher (recommended)
# or
npm start          # start server only (no auto-restart or style watching)
```

Then open:

- TV Display: `http://localhost:3001`
- DM Control: `http://localhost:3001/dm`

The terminal also prints the local network URLs and a QR code for the DM panel — scan it on your phone.

### Adding images

Drop image files into the relevant folder, then hit **Refresh** in the control panel:

| Folder | Purpose |
|--------|---------|
| `monsters/` | Monster images. Group slides by base name: `orc-1.jpg`, `orc-2.jpg` |
| `environments/` | Environment/mood images for exploration mode |

---

## Building the desktop app (Electron)

The Electron build wraps the server in a double-click `.app` / `.exe` — no terminal required. When launched, it opens the DM control panel in your default browser automatically.

> **Note:** The built app is not code-signed. See the [first-run warnings](#first-run-warnings) section below.

### Prerequisites

Node.js 18+ and npm. No other tools needed.

```bash
npm install
```

### Run Electron locally (without building)

Useful for testing before distributing:

```bash
npm run electron
```

### Build via GitHub Actions (recommended)

electron-builder can only produce a platform's native installer when run **on that platform**. From WSL2 or Linux you can't build either — Wine is required to cross-compile Windows installers and is not worth the setup. Just use GitHub Actions instead; it has free Mac and Windows runners.

Push a version tag and GitHub builds both platforms automatically using free CI runners — no Mac or Windows machine needed locally.

```bash
git tag v1.0.0
git push origin v1.0.0
```

Download the installers from the **Releases** page of your GitHub repository once the workflow completes (the workflow attaches them to the release for that tag). You can also trigger a build manually from Actions → **Build** → **Run workflow**.

---

## First-run warnings

The app is not signed with a paid developer certificate, so both platforms show a one-time warning.

**macOS — "cannot be opened because the developer cannot be verified"**
Right-click the `.app` → **Open** → **Open** in the dialog. Only needed the first time.

**Windows — SmartScreen "Unknown publisher"**
Click **More info** → **Run anyway**. Only needed the first time.

---

## Image storage (Electron app)

When running as an Electron app, images are stored in the user data folder rather than inside the app bundle, so they survive app updates:

| Platform | Path |
|----------|------|
| macOS | `~/Library/Application Support/DnD Slides/` |
| Windows | `%APPDATA%\DnD Slides\` |

Create `monsters/` and `environments/` subfolders there and drop your images in. The status window that opens on launch shows the exact path.

When running via `node server.js` directly, the local `monsters/` and `environments/` folders in the project directory are used instead.

---

## Styles (SCSS)

> **Do not edit `public/styles/styles.css` directly.** It is a compiled build artefact and will be overwritten the next time SCSS is compiled.

Styles live in `src/styles/`:

| File | Contents |
|------|---------|
| `_base.scss` | Variables (colours, fonts), CSS reset |
| `_display.scss` | TV display styles |
| `_control.scss` | DM control panel styles |
| `styles.scss` | Entry point — imports the three partials |

`npm run dev` runs the SCSS watcher automatically. To compile once without starting the server:

```bash
npm run build:css
```

---

## Project structure

```
server.js          — Express server, Socket.IO state sync, image APIs
electron/
  main.js          — Electron main process (boots server, opens status window)
  status.html      — Status window UI (shows server URLs)
public/
  control.html     — DM control panel
  display.html     — TV display
  js/              — Client-side JS
  styles/
    styles.css     — Compiled CSS (do not edit — generated from src/styles/)
src/
  styles/
    _base.scss     — Variables and reset
    _display.scss  — Display page styles
    _control.scss  — Control panel styles
    styles.scss    — SCSS entry point
lib/
  scanImages.js    — Groups image files by base name for slideshows
  slideshowState.js — Server-side slideshow state machine
monsters/          — Monster images (created on first run if missing)
environments/      — Environment images (created on first run if missing)
.github/workflows/
  build.yml        — CI: builds macOS DMG + Windows installer on tag push
```
