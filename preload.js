const { contextBridge, ipcRenderer } = require("electron");

const electronAPI = {
  platform: process.platform,

  invoke: (opts) => ipcRenderer.invoke("invoke", opts),
  send: (opts) => ipcRenderer.send("send", opts),
  on: (opts) => ipcRenderer.on("send", opts),
};

try {
  contextBridge.exposeInMainWorld("electronAPI", electronAPI);
  console.log("✅ electronAPI exposed successfully.");
} catch (error) {
  console.error("❌ Failed to expose electronAPI:", error);
}
