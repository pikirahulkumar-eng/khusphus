const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
  sendNotification: (title, body) => ipcRenderer.send('notify', { title, body }),
  isElectron: true,
});
