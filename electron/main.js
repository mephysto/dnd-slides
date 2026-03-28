const { app, BrowserWindow, shell, Tray, Menu, nativeImage } = require("electron");
const path = require("path");
const os = require("os");

const PORT = 3001;

let statusWindow = null;
let tray = null;

function getLocalIp() {
  return (
    Object.values(os.networkInterfaces())
      .flat()
      .find((iface) => iface?.family === "IPv4" && !iface.internal)?.address ??
    "localhost"
  );
}

function createStatusWindow() {
  statusWindow = new BrowserWindow({
    width: 460,
    height: 380,
    resizable: false,
    title: "D&D Slides",
    webPreferences: {
      contextIsolation: true,
    },
  });

  const localIp = getLocalIp();
  const userData = app.getPath("userData");

  statusWindow.loadFile(path.join(__dirname, "status.html"), {
    query: {
      ip: localIp,
      port: String(PORT),
      dataDir: path.join(userData, "monsters"),
    },
  });

  // Open any clicked link in the system default browser, not inside Electron
  statusWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  statusWindow.on("closed", () => {
    statusWindow = null;
  });
}

function createTray() {
  const icon = nativeImage.createFromPath(path.join(__dirname, "icon.png"));
  tray = new Tray(icon);
  tray.setToolTip("D&D Slides");

  const menu = Menu.buildFromTemplate([
    {
      label: "Open D&D Slides",
      click: () => {
        if (statusWindow === null) createStatusWindow();
        else statusWindow.focus();
      },
    },
    { type: "separator" },
    { label: "Quit", click: () => app.quit() },
  ]);

  tray.setContextMenu(menu);

  // Single-click also opens the window (Windows convention)
  tray.on("click", () => {
    if (statusWindow === null) createStatusWindow();
    else statusWindow.focus();
  });
}

app.whenReady().then(() => {
  // Point the server at the user's writable data folder so monster images
  // survive app updates and can be managed from Finder.
  const userData = app.getPath("userData");
  process.env.MONSTERS_DIR = path.join(userData, "monsters");
  process.env.ENVIRONMENTS_DIR = path.join(userData, "environments");

  // Boot the Express + Socket.IO server
  require("../server");

  createStatusWindow();
  createTray();

  // Give the server a moment to bind before opening the browser
  setTimeout(() => {
    shell.openExternal(`http://localhost:${PORT}/dm`);
  }, 800);
});

// Clicking the dock icon while no windows are open re-opens the status window
app.on("activate", () => {
  if (statusWindow === null) {
    createStatusWindow();
  } else {
    statusWindow.focus();
  }
});

// Don't quit when the status window is closed — the server should keep running
app.on("window-all-closed", () => {
  // intentionally empty — use Cmd+Q or the menu to quit
});
