const { contextBridge, ipcRenderer } = require("electron");

const isDev = Boolean(process.env.ELECTRON_START_URL);

contextBridge.exposeInMainWorld("edgecase", {
  platform: process.platform,
  isDev,
  saveLevel: isDev ? (level) => ipcRenderer.invoke("edgecase:save-level", level) : undefined
});
