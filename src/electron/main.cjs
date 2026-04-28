const { app, BrowserWindow, Menu, ipcMain } = require("electron");
const fs = require("fs");
const path = require("path");

const isDev = Boolean(process.env.ELECTRON_START_URL);

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
  if (!isDev) return;

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
    let id = level.id && level.id !== "new-level" ? String(level.id) : baseId;
    let suffix = 2;
    while (levels.some((item) => item.id === id && item.name.toLowerCase() !== name.toLowerCase())) {
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
    return { id, name };
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 960,
    minHeight: 540,
    backgroundColor: "#07100f",
    title: "Edgecase",
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  Menu.setApplicationMenu(null);

  if (isDev) {
    win.loadURL(process.env.ELECTRON_START_URL);
    win.webContents.openDevTools({ mode: "detach" });
    return;
  }

  win.loadFile(path.join(app.getAppPath(), "dist", "index.html"));
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
