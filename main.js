const { app, BrowserWindow, ipcMain, desktopCapturer, dialog, clipboard, nativeImage, session } = require('electron');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');

let mainWindow;
let selectedDesktopSource = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 900,
    minWidth: 960,
    minHeight: 680,
    backgroundColor: '#07080c',
    title: 'OnyxScreen Pro Studio — Screen & Demo Suite',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#07080c',
      symbolColor: '#f2f4f8',
      height: 38
    },
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true
    }
  });

  mainWindow.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();

  // Register displayMedia handler matching OpenScreen architecture
  if (session && session.defaultSession) {
    session.defaultSession.setDisplayMediaRequestHandler((request, callback) => {
      if (selectedDesktopSource) {
        callback({ video: selectedDesktopSource });
      } else {
        desktopCapturer.getSources({ types: ['window', 'screen'] }).then((sources) => {
          if (sources.length > 0) {
            callback({ video: sources[0] });
          } else {
            callback({ video: null });
          }
        }).catch(() => callback({ video: null }));
      }
    });
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

/* IPC Handlers */
ipcMain.handle('select-source-by-id', async (event, sourceId) => {
  try {
    const sources = await desktopCapturer.getSources({ types: ['window', 'screen'] });
    const found = sources.find(s => s.id === sourceId);
    if (found) {
      selectedDesktopSource = found;
      return { success: true, name: found.name };
    }
    return { success: false, error: 'Source not found' };
  } catch (err) {
    console.error('Error selecting source by id:', err);
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-sources', async () => {
  try {
    const sources = await desktopCapturer.getSources({
      types: ['window', 'screen'],
      thumbnailSize: { width: 480, height: 270 },
      fetchWindowIcons: true
    });

    return sources.map(source => {
      let thumbData = '';
      try {
        if (source.thumbnail && !source.thumbnail.isEmpty()) {
          thumbData = source.thumbnail.toDataURL();
        }
      } catch (e) {}

      let iconData = null;
      try {
        if (source.appIcon && !source.appIcon.isEmpty()) {
          iconData = source.appIcon.toDataURL();
        }
      } catch (e) {}

      return {
        id: source.id,
        name: source.name || 'Unnamed Source',
        thumbnail: thumbData,
        appIcon: iconData
      };
    });
  } catch (err) {
    console.error('Error in get-sources IPC:', err);
    return [];
  }
});

ipcMain.handle('save-video', async (event, { buffer, defaultName, format }) => {
  const ext = format === 'mp4' ? 'mp4' : 'webm';
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Recorded Video',
    defaultPath: defaultName || `OnyxStudio_${Date.now()}.${ext}`,
    filters: [
      { name: format === 'mp4' ? 'MP4 Video (*.mp4)' : 'WebM Video (*.webm)', extensions: [ext] }
    ]
  });

  if (filePath) {
    fs.writeFileSync(filePath, Buffer.from(buffer));
    return { success: true, filePath };
  }
  return { success: false };
});

ipcMain.handle('save-image', async (event, { dataUrl, defaultName }) => {
  const { filePath } = await dialog.showSaveDialog(mainWindow, {
    title: 'Save Screenshot',
    defaultPath: defaultName || `OnyxSnap_${Date.now()}.png`,
    filters: [
      { name: 'PNG Image (*.png)', extensions: ['png'] },
      { name: 'JPEG Image (*.jpg)', extensions: ['jpg'] }
    ]
  });

  if (filePath) {
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
    return { success: true, filePath };
  }
  return { success: false };
});

ipcMain.handle('copy-image-to-clipboard', (event, dataUrl) => {
  try {
    const image = nativeImage.createFromDataURL(dataUrl);
    clipboard.writeImage(image);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

/* FFmpeg Processing Handler */
ipcMain.handle('process-ffmpeg', async (event, { inputBuffer, startTime, endTime, speed, outputFormat }) => {
  return new Promise((resolve) => {
    const tempDir = app.getPath('temp');
    const tempInput = path.join(tempDir, `onyx_input_${Date.now()}.webm`);
    const tempOutput = path.join(tempDir, `onyx_export_${Date.now()}.${outputFormat || 'mp4'}`);

    fs.writeFileSync(tempInput, Buffer.from(inputBuffer));

    const args = ['-y', '-i', tempInput];

    if (startTime !== undefined && startTime !== null && startTime > 0) {
      args.push('-ss', startTime.toString());
    }
    if (endTime !== undefined && endTime !== null && endTime > 0) {
      args.push('-to', endTime.toString());
    }

    if (speed && speed !== 1) {
      const pts = (1 / speed).toFixed(2);
      const atempo = speed > 2 ? 2.0 : (speed < 0.5 ? 0.5 : speed);
      args.push('-filter:v', `setpts=${pts}*PTS`, '-filter:a', `atempo=${atempo}`);
    }

    if (outputFormat === 'mp4') {
      args.push('-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-c:a', 'aac');
    }

    args.push(tempOutput);

    const ffmpegProcess = spawn('ffmpeg', args);

    ffmpegProcess.on('close', (code) => {
      if (code === 0 && fs.existsSync(tempOutput)) {
        const outputBuffer = fs.readFileSync(tempOutput);
        try { fs.unlinkSync(tempInput); fs.unlinkSync(tempOutput); } catch {}
        resolve({ success: true, buffer: outputBuffer });
      } else {
        try { fs.unlinkSync(tempInput); } catch {}
        resolve({ success: false, error: `FFmpeg exited with code ${code}` });
      }
    });

    ffmpegProcess.on('error', (err) => {
      try { fs.unlinkSync(tempInput); } catch {}
      resolve({ success: false, error: err.message });
    });
  });
});
