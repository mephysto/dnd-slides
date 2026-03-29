const { app, BrowserWindow, shell, Tray, Menu, nativeImage, ipcMain, dialog } = require("electron");
const path = require("path");
const os = require("os");
const config = require("./config");

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
    height: 430,
    resizable: false,
    title: "D&D Slides",
    webPreferences: {
      contextIsolation: true,
      preload: path.join(__dirname, "preload.js"),
    },
  });

  const localIp = getLocalIp();

  statusWindow.loadFile(path.join(__dirname, "status.html"), {
    query: {
      ip: localIp,
      port: String(PORT),
      monstersDir: config.getMonstersDir(""),
      environmentsDir: config.getEnvironmentsDir(""),
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

ipcMain.handle("open-folder", (_event, folderPath) => {
  shell.openPath(folderPath);
});

async function chooseFolder(type) {
  const { canceled, filePaths } = await dialog.showOpenDialog(statusWindow, {
    properties: ["openDirectory"],
    title: type === "monsters" ? "Choose Monsters Folder" : "Choose Environments Folder",
  });

  if (canceled || filePaths.length === 0) return null;

  const chosen = filePaths[0];
  const server = require("../server");

  if (type === "monsters") {
    config.setMonstersDir(chosen);
    server.updateDirs({ monstersDir: chosen });
  } else {
    config.setEnvironmentsDir(chosen);
    server.updateDirs({ environmentsDir: chosen });
  }

  return chosen;
}

ipcMain.handle("choose-folder", (_event, type) => chooseFolder(type));

app.whenReady().then(() => {
  const userData = app.getPath("userData");

  // Load persisted folder prefs, falling back to the userData defaults
  config.init(userData);
  process.env.MONSTERS_DIR = config.getMonstersDir(path.join(userData, "monsters"));
  process.env.ENVIRONMENTS_DIR = config.getEnvironmentsDir(path.join(userData, "environments"));

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
