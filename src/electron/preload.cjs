const { contextBridge, ipcRenderer } = require("electron");

const isDev = Boolean(process.env.ELECTRON_START_URL);

contextBridge.exposeInMainWorld("edgecase", {
  platform: process.platform,
  isDev,
  loadLevels: isDev ? () => ipcRenderer.invoke("edgecase:load-levels") : undefined,
  saveLevel: isDev ? (level) => ipcRenderer.invoke("edgecase:save-level", level) : undefined
});
