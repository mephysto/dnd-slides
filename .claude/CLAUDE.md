# DND Slides — Agent Instructions

Read `AGENTS.MD` in the project root before making changes. It defines acceptance criteria and expected behaviour.

## Styling — SCSS, not CSS

Styles are written in **SCSS** and compiled to CSS. **Never edit `public/styles/styles.css` directly** — it is a build artefact and will be overwritten.

| Source (edit these) | Compiled output (do not edit) |
|---|---|
| `src/styles/_base.scss` | `public/styles/styles.css` |
| `src/styles/_display.scss` | |
| `src/styles/_control.scss` | |
| `src/styles/styles.scss` (entry point, imports the partials) | |

### Variables (defined in `_base.scss`)

```scss
$font-family-ui: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
$font-family-display: 'Majesty Black', serif;
$color-text: #e0d5c1;
$color-accent: #8b4513;       // rust/brown — borders, highlights
$color-accent-gold: #d4a24e;  // selected state
$color-accent-blue: #5aaaff;  // active state, buttons
```

### Compiling

```bash
npm run build:css          # one-off compile
npm run dev                # watch mode (auto-recompiles on save)
```

After editing any `.scss` file, run `npm run build:css` (or confirm `npm run dev` is running) before testing in the browser.

## Project Structure

- `server.js` — single entrypoint: Express routes, Socket.IO, image serving
- `public/control.html` — DM control UI
- `public/display.html` — TV display UI
- `public/js/control.js` — control panel logic
- `public/js/control/render.js` — rendering helpers (extracted from control.js)
- `public/js/control/progress.js` — slide progress bar
- `public/js/display.js` — display logic
- `src/styles/` — SCSS source files
- `monsters/` — monster images (grouped by base filename)
- `environments/` — environment mood images
