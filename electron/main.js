const { app, BrowserWindow, shell, Tray, Menu, nativeImage } = require("electron");
const path = require("path");
const os = require("os");
const zlib = require("zlib");

const PORT = 3001;

let statusWindow = null;
let tray = null;

// Generate a solid-colour PNG so we don't need an external icon file.
function createSolidPng(width, height, r, g, b) {
  function crc32(buf) {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function chunk(type, data) {
    const typeBytes = Buffer.from(type, "ascii");
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crcVal = Buffer.alloc(4);
    crcVal.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])));
    return Buffer.concat([len, typeBytes, data, crcVal]);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // RGB colour type

  const rowSize = 1 + width * 3;
  const raw = Buffer.alloc(height * rowSize);
  for (let y = 0; y < height; y++) {
    raw[y * rowSize] = 0; // filter: None
    for (let x = 0; x < width; x++) {
      const p = y * rowSize + 1 + x * 3;
      raw[p] = r; raw[p + 1] = g; raw[p + 2] = b;
    }
  }

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), // PNG signature
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw)),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

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
  const iconBuffer = createSolidPng(16, 16, 139, 0, 0); // dark red
  const icon = nativeImage.createFromBuffer(iconBuffer);
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
