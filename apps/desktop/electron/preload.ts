import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electron', {
  // System info detection
  detectSystemSpecs: () => ipcRenderer.invoke('detect-system-specs'),
  
  // Auto-updater
  onUpdateAvailable: (callback: (info: any) => void) => {
    ipcRenderer.on('update-available', (_event, info) => callback(info));
  },
  onDownloadProgress: (callback: (progress: any) => void) => {
    ipcRenderer.on('download-progress', (_event, progress) => callback(progress));
  },
  onUpdateDownloaded: (callback: (info: any) => void) => {
    ipcRenderer.on('update-downloaded', (_event, info) => callback(info));
  },
  onUpdateError: (callback: (err: any) => void) => {
    ipcRenderer.on('update-error', (_event, err) => callback(err));
  },
  downloadUpdate: () => {
    ipcRenderer.send('download-update');
  },
  installUpdate: () => {
    ipcRenderer.send('install-update');
  },
  checkForUpdates: () => {
    ipcRenderer.send('check-for-updates');
  }
});
