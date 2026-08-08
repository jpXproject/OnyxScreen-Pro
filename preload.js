const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('onyxApi', {
  getSources: () => ipcRenderer.invoke('get-sources'),
  selectSourceById: (sourceId) => ipcRenderer.invoke('select-source-by-id', sourceId),
  saveVideo: (params) => ipcRenderer.invoke('save-video', params),
  saveImage: (params) => ipcRenderer.invoke('save-image', params),
  copyImageToClipboard: (dataUrl) => ipcRenderer.invoke('copy-image-to-clipboard', dataUrl),
  processFFmpeg: (params) => ipcRenderer.invoke('process-ffmpeg', params)
});
