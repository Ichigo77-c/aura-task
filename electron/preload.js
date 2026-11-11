const { contextBridge, ipcRenderer } = require("electron");

/**
 * Electron Preload Script
 * Exposes safe IPC methods to renderer process
 * Maintains security context isolation
 */

contextBridge.exposeInMainWorld("electronAPI", {
  // App information
  getVersion: () => ipcRenderer.invoke("app:get-version"),
  getName: () => ipcRenderer.invoke("app:get-name"),
  getPath: (name) => ipcRenderer.invoke("app:get-path", name),
});
