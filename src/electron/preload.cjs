const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("edgecase", {
  platform: process.platform
});
