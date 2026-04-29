const { app, BrowserWindow, Menu, ipcMain, screen } = require("electron");
const fs = require("fs");
const path = require("path");

const isDev = Boolean(process.env.ELECTRON_START_URL);
let mainWindow = null;
let windowedBounds = null;
let isBorderless = false;
let windowModeHandlersInstalled = false;
let devLevelHandlersInstalled = false;

function logWindowMode(message, details = {}) {
  console.log("[edgecase:window-mode]", message, details);
}

function logLevelStore(message, details = {}) {
  console.log("[edgecase:levels]", message, details);
}

function slugifyLevelName(name) {
  const slug = String(name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "level";
}

function readLevelsSource() {
  const levelsPath = path.join(__dirname, "..", "game", "data", "levels.js");
  const source = fs.readFileSync(levelsPath, "utf8");
  const match = source.match(/export const LEVELS = ([\s\S]*?);\s*$/);
  if (!match) {
    throw new Error("Could not find LEVELS export.");
  }

  // Dev-only local source parsing for the level authoring tool.
  const levels = Function(`"use strict"; return (${match[1]});`)();
  return { levelsPath, levels };
}

function formatLevelValue(value, indent = 0) {
  const pad = " ".repeat(indent);
  const next = " ".repeat(indent + 2);

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    const items = value.map((item) => `${next}${formatLevelValue(item, indent + 2)}`);
    return `[\n${items.join(",\n")}\n${pad}]`;
  }

  if (value && typeof value === "object") {
    const entries = Object.entries(value);
    if (entries.length === 0) return "{}";
    const fields = entries.map(([key, item]) => `${next}${key}: ${formatLevelValue(item, indent + 2)}`);
    return `{\n${fields.join(",\n")}\n${pad}}`;
  }

  return JSON.stringify(value);
}

function installDevLevelHandlers() {
  if (devLevelHandlersInstalled) {
    return;
  }
  devLevelHandlersInstalled = true;

  ipcMain.handle("edgecase:load-levels", async () => {
    const { levels } = readLevelsSource();
    logLevelStore("load-levels", { count: levels.length, isDev });
    return levels;
  });

  ipcMain.handle("edgecase:save-level", async (_event, level) => {
    if (!level || typeof level !== "object") {
      throw new Error("Invalid level payload.");
    }

    const name = String(level.name || "").trim();
    if (!name) {
      throw new Error("Level name is required.");
    }

    const { levelsPath, levels } = readLevelsSource();
    const baseId = slugifyLevelName(name);
    const isExistingLevel = level.id && level.id !== "new-level" && levels.some((item) => item.id === String(level.id));
    let id = isExistingLevel || (level.id && level.id !== "new-level") ? String(level.id) : baseId;
    logLevelStore("save-level requested", { incomingId: level.id, resolvedId: id, name, isExistingLevel });
    let suffix = 2;
    while (!isExistingLevel && levels.some((item) => item.id === id && item.name.toLowerCase() !== name.toLowerCase())) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }

    const duplicateName = levels.find((item) => item.name.trim().toLowerCase() === name.toLowerCase() && item.id !== id);
    if (duplicateName) {
      throw new Error("Level name must be unique.");
    }

    const savedLevel = { ...level, id, name };
    const existingIndex = levels.findIndex((item) => item.id === id);
    if (existingIndex >= 0) {
      levels[existingIndex] = savedLevel;
    } else {
      levels.push(savedLevel);
    }

    const file = `export const DEFAULT_LEVEL_ID = "level-1";\n\nexport const LEVELS = ${formatLevelValue(levels)};\n`;
    fs.writeFileSync(levelsPath, file, "utf8");
    logLevelStore("save-level completed", { id, name, count: levels.length });
    return { id, name };
  });

  ipcMain.handle("edgecase:delete-level", async (_event, id) => {
    const levelId = String(id || "").trim();
    if (!levelId) {
      throw new Error("Level id is required.");
    }
    if (levelId === "level-1") {
      throw new Error("The default level cannot be deleted.");
    }

    const { levelsPath, levels } = readLevelsSource();
    const existingIndex = levels.findIndex((item) => item.id === levelId);
    if (existingIndex < 0) {
      throw new Error("Level was not found.");
    }

    const [deleted] = levels.splice(existingIndex, 1);
    const file = `export const DEFAULT_LEVEL_ID = "level-1";\n\nexport const LEVELS = ${formatLevelValue(levels)};\n`;
    fs.writeFileSync(levelsPath, file, "utf8");
    logLevelStore("delete-level completed", { id: deleted.id, name: deleted.name, count: levels.length });
    return { id: deleted.id, name: deleted.name };
  });
}

function installWindowModeHandlers() {
  if (windowModeHandlersInstalled) {
    return;
  }
  windowModeHandlersInstalled = true;

  ipcMain.handle("edgecase:get-window-mode", async () => {
    logWindowMode("get-window-mode", {
      borderless: isBorderless,
      hasWindow: Boolean(mainWindow),
      bounds: mainWindow && !mainWindow.isDestroyed() ? mainWindow.getBounds() : null
    });
    return { borderless: isBorderless };
  });

  ipcMain.handle("edgecase:set-borderless", async (_event, enabled) => {
    const shouldEnable = Boolean(enabled);
    logWindowMode("set-borderless requested", {
      requested: shouldEnable,
      current: isBorderless,
      hasWindow: Boolean(mainWindow),
      bounds: mainWindow && !mainWindow.isDestroyed() ? mainWindow.getBounds() : null
    });

    if (shouldEnable === isBorderless && mainWindow) {
      logWindowMode("set-borderless skipped; already in requested mode", { borderless: isBorderless });
      return { borderless: isBorderless };
    }

    try {
      recreateWindow(shouldEnable);
    } catch (error) {
      logWindowMode("set-borderless failed", {
        message: error?.message,
        stack: error?.stack
      });
      throw error;
    }

    logWindowMode("set-borderless completed", {
      borderless: isBorderless,
      bounds: mainWindow && !mainWindow.isDestroyed() ? mainWindow.getBounds() : null
    });
    return { borderless: isBorderless };
  });
}

installWindowModeHandlers();

function createWindow(options = {}) {
  const borderless = Boolean(options.borderless);
  const bounds = options.bounds || {
    width: 1280,
    height: 720
  };
  const win = new BrowserWindow({
    ...bounds,
    minWidth: 960,
    minHeight: 540,
    backgroundColor: "#07100f",
    title: "Edgecase",
    autoHideMenuBar: true,
    frame: !borderless,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  mainWindow = win;
  isBorderless = borderless;
  logWindowMode("window created", {
    borderless,
    bounds: win.getBounds(),
    isDev
  });

  win.on("closed", () => {
    if (mainWindow === win) {
      mainWindow = null;
    }
  });

  Menu.setApplicationMenu(null);

  if (isDev) {
    win.loadURL(process.env.ELECTRON_START_URL);
    win.webContents.openDevTools({ mode: "detach" });
    return win;
  }

  win.loadFile(path.join(app.getAppPath(), "dist", "index.html"));
  return win;
}

function recreateWindow(borderless) {
  const previous = mainWindow;
  const previousBounds = previous && !previous.isDestroyed() ? previous.getBounds() : null;
  const wasMaximized = previous && !previous.isDestroyed() ? previous.isMaximized() : false;
  const wasBorderless = isBorderless;
  logWindowMode("recreate-window start", {
    nextBorderless: borderless,
    wasBorderless,
    previousBounds,
    windowedBounds,
    wasMaximized
  });

  if (borderless && previousBounds && !wasBorderless) {
    windowedBounds = previousBounds;
  }

  const bounds = borderless
    ? screen.getDisplayMatching(previousBounds || { x: 0, y: 0, width: 1280, height: 720 }).workArea
    : windowedBounds || previousBounds || { width: 1280, height: 720 };

  const next = createWindow({ borderless, bounds });
  if (!borderless && wasMaximized && next) {
    next.maximize();
  }

  if (previous && !previous.isDestroyed()) {
    logWindowMode("destroying previous window");
    previous.destroy();
  }

  if (isDev && next) {
    next.webContents.once("did-finish-load", () => {
      if (!next.isDestroyed()) {
        next.webContents.openDevTools({ mode: "detach" });
      }
    });
  }

  logWindowMode("recreate-window done", {
    borderless: isBorderless,
    bounds: next && !next.isDestroyed() ? next.getBounds() : null
  });
}

app.whenReady().then(() => {
  installDevLevelHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});
