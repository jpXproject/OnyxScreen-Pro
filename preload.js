const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('onyxApi', {
  getSources: () => ipcRenderer.invoke('get-sources'),
  setSelectedSource: (sourceId) => ipcRenderer.invoke('set-selected-source', sourceId),
  saveVideo: (params) => ipcRenderer.invoke('save-video', params),
  saveImage: (params) => ipcRenderer.invoke('save-image', params),
  copyImageToClipboard: (dataUrl) => ipcRenderer.invoke('copy-image-to-clipboard', dataUrl),
  processFFmpeg: (params) => ipcRenderer.invoke('process-ffmpeg', params)
});
