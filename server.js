const qrcode = require("qrcode-terminal");
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = 3001;
// Allow Electron (or any other host) to redirect data dirs to a writable location.
// These are `let` so Electron can call updateDirs() after the user picks a folder.
let MONSTERS_DIR = process.env.MONSTERS_DIR || path.join(__dirname, "monsters");
let ENV_DIR = process.env.ENVIRONMENTS_DIR || path.join(__dirname, "environments");

function ensureDirs() {
  for (const dir of [MONSTERS_DIR, ENV_DIR]) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }
}

ensureDirs();

// Serve static files
app.use(express.static(path.join(__dirname, "public")));
app.use("/nprogress", express.static(path.join(__dirname, "node_modules/nprogress")));
// Wrap in a function so the middleware always reads the current dir value,
// allowing Electron to swap the folder at runtime without restarting.
app.use("/monsters", (req, res, next) => express.static(MONSTERS_DIR)(req, res, next));
app.use("/environments", (req, res, next) => express.static(ENV_DIR)(req, res, next));

// TV display page
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "display.html"));
});

// DM control panel
app.get("/dm", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "control.html"));
});

const { scanImageGroups } = require("./lib/scanImages");
const { createSlideshowState } = require("./lib/slideshowState");

// API: list available monster images (grouped by base name for slideshows)
app.get("/api/monsters", (req, res) => {
  const monsters = scanImageGroups(MONSTERS_DIR, "/monsters");
  res.json(monsters);
});

// API: list available environment images (grouped by base name for slideshows)
app.get("/api/environments", (req, res) => {
  const envs = scanImageGroups(ENV_DIR, "/environments");
  res.json(envs);
});

// Slideshow state manager (keeps timer & state transitions)
const slideshowState = createSlideshowState({
  onStateChange: (state) => {
    io.emit("state", state);
  },
});

// WebSocket connections
io.on("connection", (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Send current state to newly connected client
  socket.emit("state", slideshowState.getState());

  // DM selects a single monster (backwards-compatible)
  socket.on("show-monster", (monster) => {
    slideshowState.setEncounter([monster]);
  });

  // DM selects one or more monsters for an encounter
  socket.on("show-monsters", (monsters) => {
    slideshowState.setEncounter(Array.isArray(monsters) ? monsters : []);
    console.log(`Showing encounter: ${slideshowState.getState().monsters.map((m) => m.name).join(", ")}`);
  });

  // DM selects an environment for exploration mode
  socket.on("show-environment", (environment) => {
    slideshowState.setEnvironment(environment || null);
    console.log(`Showing environment: ${environment?.name}`);
  });

  // DM switches mode explicitly
  socket.on("set-mode", (mode) => {
    slideshowState.setMode(mode);
    console.log(`Mode set to: ${mode}`);
  });

  // DM toggles Ken Burns effect
  socket.on("set-kenburns", (enabled) => {
    slideshowState.setKenBurns(Boolean(enabled));
    console.log(`Ken Burns ${enabled ? "enabled" : "disabled"}`);
  });

  // DM steps slideshow (within current monster/environment)
  socket.on("next-slide", () => {
    slideshowState.advance();
    slideshowState.notify();
    slideshowState.startTimer();
  });

  socket.on("prev-slide", () => {
    slideshowState.previous();
    slideshowState.notify();
    slideshowState.startTimer();
  });

  // DM steps through monsters (next/prev monster)
  socket.on("next-monster", () => {
    slideshowState.nextMonster();
    slideshowState.notify();
    slideshowState.startTimer();
  });

  socket.on("prev-monster", () => {
    slideshowState.prevMonster();
    slideshowState.notify();
    slideshowState.startTimer();
  });

  socket.on("set-slide-duration", (duration) => {
    slideshowState.setSlideDuration(duration);
    console.log(`Slide duration set to ${duration}ms`);
  });

  socket.on("toggle-pause", () => {
    slideshowState.togglePause();
  });

  // DM hides the display
  socket.on("hide", () => {
    slideshowState.setVisible(false);
    console.log("Display hidden");
  });

  // DM reveals the display
  socket.on("reveal", () => {
    slideshowState.setVisible(true);
    console.log("Display revealed");
  });

  // DM clears the display
  socket.on("clear", () => {
    slideshowState.clear();
    console.log("Display cleared");
  });

  socket.on("disconnect", () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// Called by Electron when the user picks a new folder in the status window
function updateDirs({ monstersDir, environmentsDir }) {
  if (monstersDir) MONSTERS_DIR = monstersDir;
  if (environmentsDir) ENV_DIR = environmentsDir;
  ensureDirs();
}

module.exports = { updateDirs };

server.listen(PORT, () => {
  const os = require("os");
  const localIp = Object.values(os.networkInterfaces())
    .flat()
    .find((iface) => iface.family === "IPv4" && !iface.internal)?.address ?? "localhost";

  console.log(`\n🐉 D&D Monster Display running!`);
  console.log(`   Local:`);
  console.log(`     TV Display:  http://localhost:${PORT}`);
  console.log(`     DM Control:  http://localhost:${PORT}/dm`);
  console.log(`   Network (other devices):`);
  console.log(`     TV Display:  http://${localIp}:${PORT}`);
  console.log(`     DM Control:  http://${localIp}:${PORT}/dm\n`);
  qrcode.generate(`http://${localIp}:${PORT}/dm`, { small: true });
});
