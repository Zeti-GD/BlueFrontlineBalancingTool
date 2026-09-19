const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getAppVersion: () => ipcRenderer.invoke('app:version'),
  openFileDialog: () => ipcRenderer.invoke('dialog:openFile'),
  openDirectoryDialog: () => ipcRenderer.invoke('dialog:openDirectory'),
  scanUnrealProject: (folderPath) => ipcRenderer.invoke('unreal:scanProject', folderPath),
  readLocalFolderFiles: (folderPath) => ipcRenderer.invoke('fs:readLocalFolder', folderPath)
});
