/* ============================================================
   ONYXSCREEN PRO — RENDERER & APPLICATION CONTROLLER
   ============================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const statusDot = document.getElementById('statusDot');
  const statusText = document.getElementById('statusText');
  
  const btnSelectSource = document.getElementById('btnSelectSource');
  const sourceModal = document.getElementById('sourceModal');
  const btnCloseModal = document.getElementById('btnCloseModal');
  const sourcesGrid = document.getElementById('sourcesGrid');
  const sourceName = document.getElementById('sourceName');

  const btnRecord = document.getElementById('btnRecord');
  const recIcon = document.getElementById('recIcon');
  const recText = document.getElementById('recText');
  const btnSnapFull = document.getElementById('btnSnapFull');
  const btnSnapCrop = document.getElementById('btnSnapCrop');
  const chkAudio = document.getElementById('chkAudio');
  const recTimer = document.getElementById('recTimer');

  const emptyState = document.getElementById('emptyState');
  const previewWrapper = document.getElementById('previewWrapper');
  const videoPreview = document.getElementById('videoPreview');
  const imagePreviewCanvas = document.getElementById('imagePreviewCanvas');
  const cropOverlay = document.getElementById('cropOverlay');
  const cropRect = document.getElementById('cropRect');

  const editorPanel = document.getElementById('editorPanel');
  const btnPlayPause = document.getElementById('btnPlayPause');
  const btnSpeed05 = document.getElementById('btnSpeed05');
  const btnSpeed1 = document.getElementById('btnSpeed1');
  const btnSpeed15 = document.getElementById('btnSpeed15');
  const btnSpeed2 = document.getElementById('btnSpeed2');
  const txtWatermark = document.getElementById('txtWatermark');
  const btnCopyClipboard = document.getElementById('btnCopyClipboard');
  const btnExport = document.getElementById('btnExport');
  const videoScrubber = document.getElementById('videoScrubber');
  const trimStartRange = document.getElementById('trimStartRange');
  const trimEndRange = document.getElementById('trimEndRange');
  const lblTrimStart = document.getElementById('lblTrimStart');
  const lblTrimEnd = document.getElementById('lblTrimEnd');

  // Application State
  let currentStream = null;
  let selectedSource = null;
  let mediaRecorder = null;
  let recordedChunks = [];
  let recordedBlob = null;
  let isRecording = false;
  let timerInterval = null;
  let recordingSeconds = 0;
  let currentMode = 'idle'; // 'idle', 'live', 'video_edit', 'image_edit'

  let cropStartX = 0, cropStartY = 0, cropEndX = 0, cropEndY = 0;
  let isCropping = false;

  /* ------------------------------------------------------------
     1. WINDOW / SCREEN SOURCE SELECTOR
     ------------------------------------------------------------ */
  btnSelectSource.addEventListener('click', async () => {
    try {
      const sources = await window.onyxApi.getSources();
      if (!sources || sources.length === 0) {
        alert('Tidak ada window atau screen yang terdeteksi.');
        return;
      }
      renderSourceCards(sources);
      sourceModal.classList.add('active');
    } catch (err) {
      alert('Gagal mengambil daftar window: ' + err.message);
    }
  });

  btnCloseModal.addEventListener('click', () => {
    sourceModal.classList.remove('active');
  });

  function renderSourceCards(sources) {
    sourcesGrid.innerHTML = '';
    sources.forEach(src => {
      const card = document.createElement('div');
      card.className = 'source-card';
      const thumbHtml = src.thumbnail 
        ? `<img class="source-thumb" src="${src.thumbnail}" alt="${src.name}" />`
        : `<div class="source-thumb" style="display:grid;place-items:center;background:#1a1d2d;color:var(--neon-cyan);font-size:24px;">🪟</div>`;

      card.innerHTML = `
        ${thumbHtml}
        <div class="source-name" title="${src.name}">${src.name}</div>
      `;
      card.addEventListener('click', () => selectSource(src));
      sourcesGrid.appendChild(card);
    });
  }

  async function selectSource(source) {
    selectedSource = source;
    sourceName.textContent = source.name;
    sourceModal.classList.remove('active');

    try {
      // Notify main process of selected source ID
      if (window.onyxApi.setSelectedSource) {
        await window.onyxApi.setSelectedSource(source.id);
      }

      // Stop existing stream
      if (currentStream) {
        currentStream.getTracks().forEach(t => t.stop());
      }

      let stream = null;
      try {
        const constraints = {
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: 'desktop',
              chromeMediaSourceId: source.id
            }
          }
        };
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch (errGUM) {
        console.warn('getUserMedia failed, trying getDisplayMedia fallback:', errGUM);
        stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      }

      currentStream = stream;

      // Add Mic audio if requested
      if (chkAudio.checked) {
        try {
          const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
          micStream.getAudioTracks().forEach(track => currentStream.addTrack(track));
        } catch (e) {
          console.warn('Mic audio access denied or unavailable:', e);
        }
      }

      videoPreview.srcObject = currentStream;
      videoPreview.style.display = 'block';
      imagePreviewCanvas.style.display = 'none';
      emptyState.style.display = 'none';
      editorPanel.style.display = 'none';

      currentMode = 'live';
      updateStatus('Ready (Live Stream)', false);
    } catch (err) {
      alert('Gagal membuka stream window: ' + err.message);
    }
  }

  /* ------------------------------------------------------------
     2. SCREEN & WINDOW RECORDING CONTROLLER
     ------------------------------------------------------------ */
  btnRecord.addEventListener('click', () => {
    if (!currentStream) {
      alert('Silahkan pilih Window atau Screen terlebih dahulu!');
      return;
    }

    if (!isRecording) {
      startRecording();
    } else {
      stopRecording();
    }
  });

  function startRecording() {
    recordedChunks = [];
    const options = { mimeType: 'video/webm;codecs=vp9' };

    try {
      mediaRecorder = new MediaRecorder(currentStream, options);
    } catch (e) {
      mediaRecorder = new MediaRecorder(currentStream);
    }

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
      recordedBlob = new Blob(recordedChunks, { type: 'video/webm' });
      const videoUrl = URL.createObjectURL(recordedBlob);
      setupVideoEditor(videoUrl);
    };

    mediaRecorder.start(500); // chunk every 500ms
    isRecording = true;

    btnRecord.classList.add('recording');
    recIcon.textContent = '⏹';
    recText.textContent = 'Stop Recording';

    recordingSeconds = 0;
    updateTimerDisplay();
    timerInterval = setInterval(() => {
      recordingSeconds++;
      updateTimerDisplay();
    }, 1000);

    updateStatus('Recording...', true);
  }

  function stopRecording() {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      isRecording = false;

      btnRecord.classList.remove('recording');
      recIcon.textContent = '🔴';
      recText.textContent = 'Start Record';

      clearInterval(timerInterval);
      updateStatus('Recording Stopped · Editing Mode', false);
    }
  }

  function updateTimerDisplay() {
    const hrs = String(Math.floor(recordingSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((recordingSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(recordingSeconds % 60).padStart(2, '0');
    recTimer.textContent = `${hrs}:${mins}:${secs}`;
  }

  function updateStatus(text, recording) {
    statusText.textContent = text;
    if (recording) {
      statusDot.classList.add('recording');
    } else {
      statusDot.classList.remove('recording');
    }
  }

  /* ------------------------------------------------------------
     3. SCREENSHOT (FULL WINDOW & CUSTOM RECTANGLE CROP)
     ------------------------------------------------------------ */
  // Full Window Screenshot
  btnSnapFull.addEventListener('click', () => {
    if (!videoPreview.srcObject) {
      alert('Silahkan pilih Window terlebih dahulu!');
      return;
    }

    const canvas = imagePreviewCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = videoPreview.videoWidth || 1280;
    canvas.height = videoPreview.videoHeight || 720;

    ctx.drawImage(videoPreview, 0, 0, canvas.width, canvas.height);
    applyWatermarkText(ctx, canvas.width, canvas.height);

    videoPreview.style.display = 'none';
    canvas.style.display = 'block';
    emptyState.style.display = 'none';
    editorPanel.style.display = 'flex';

    document.getElementById('videoTimelineContainer').style.display = 'none';
    currentMode = 'image_edit';
    updateStatus('Screenshot Captured (Full Window)', false);
  });

  // Custom Rectangle Crop Screenshot
  btnSnapCrop.addEventListener('click', () => {
    if (!videoPreview.srcObject) {
      alert('Silahkan pilih Window terlebih dahulu!');
      return;
    }
    cropOverlay.classList.add('active');
    updateStatus('Drag untuk memilih area Rectangle Screenshot...', false);
  });

  cropOverlay.addEventListener('mousedown', (e) => {
    isCropping = true;
    const rect = cropOverlay.getBoundingClientRect();
    cropStartX = e.clientX - rect.left;
    cropStartY = e.clientY - rect.top;
    cropRect.style.left = `${cropStartX}px`;
    cropRect.style.top = `${cropStartY}px`;
    cropRect.style.width = '0px';
    cropRect.style.height = '0px';
    cropRect.style.display = 'block';
  });

  cropOverlay.addEventListener('mousemove', (e) => {
    if (!isCropping) return;
    const rect = cropOverlay.getBoundingClientRect();
    cropEndX = e.clientX - rect.left;
    cropEndY = e.clientY - rect.top;

    const x = Math.min(cropStartX, cropEndX);
    const y = Math.min(cropStartY, cropEndY);
    const w = Math.abs(cropEndX - cropStartX);
    const h = Math.abs(cropEndY - cropStartY);

    cropRect.style.left = `${x}px`;
    cropRect.style.top = `${y}px`;
    cropRect.style.width = `${w}px`;
    cropRect.style.height = `${h}px`;
  });

  cropOverlay.addEventListener('mouseup', () => {
    if (!isCropping) return;
    isCropping = false;
    cropOverlay.classList.remove('active');
    cropRect.style.display = 'none';

    captureRectangleCrop();
  });

  function captureRectangleCrop() {
    const videoRect = videoPreview.getBoundingClientRect();
    const overlayRect = cropOverlay.getBoundingClientRect();

    const scaleX = videoPreview.videoWidth / videoRect.width;
    const scaleY = videoPreview.videoHeight / videoRect.height;

    const x = Math.min(cropStartX, cropEndX) * scaleX;
    const y = Math.min(cropStartY, cropEndY) * scaleY;
    const w = Math.abs(cropEndX - cropStartX) * scaleX;
    const h = Math.abs(cropEndY - cropStartY) * scaleY;

    if (w < 10 || h < 10) return;

    const canvas = imagePreviewCanvas;
    const ctx = canvas.getContext('2d');
    canvas.width = w;
    canvas.height = h;

    ctx.drawImage(videoPreview, x, y, w, h, 0, 0, w, h);
    applyWatermarkText(ctx, w, h);

    videoPreview.style.display = 'none';
    canvas.style.display = 'block';
    emptyState.style.display = 'none';
    editorPanel.style.display = 'flex';

    document.getElementById('videoTimelineContainer').style.display = 'none';
    currentMode = 'image_edit';
    updateStatus('Screenshot Captured (Rectangle Crop)', false);
  }

  function applyWatermarkText(ctx, width, height) {
    const text = txtWatermark.value.trim();
    if (!text) return;

    ctx.font = 'bold 24px Inter, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
    ctx.shadowBlur = 6;
    ctx.fillText(text, 20, height - 20);
  }

  /* ------------------------------------------------------------
     4. RESULT EDITOR & EXPORT CONTROLLER
     ------------------------------------------------------------ */
  function setupVideoEditor(videoUrl) {
    videoPreview.srcObject = null;
    videoPreview.src = videoUrl;
    videoPreview.controls = false;
    videoPreview.style.display = 'block';
    imagePreviewCanvas.style.display = 'none';
    editorPanel.style.display = 'flex';
    document.getElementById('videoTimelineContainer').style.display = 'flex';

    currentMode = 'video_edit';

    videoPreview.onloadedmetadata = () => {
      const dur = Math.floor(videoPreview.duration);
      trimStartRange.max = dur;
      trimEndRange.max = dur;
      trimEndRange.value = dur;
      lblTrimStart.textContent = '0s';
      lblTrimEnd.textContent = `${dur}s`;
    };
  }

  btnPlayPause.addEventListener('click', () => {
    if (videoPreview.paused) {
      videoPreview.play();
      btnPlayPause.textContent = '⏸ Pause';
    } else {
      videoPreview.pause();
      btnPlayPause.textContent = '▶ Play';
    }
  });

  /* Speed Buttons */
  [btnSpeed05, btnSpeed1, btnSpeed15, btnSpeed2].forEach(btn => {
    btn.addEventListener('click', (e) => {
      const speed = parseFloat(e.target.textContent);
      videoPreview.playbackRate = speed;
      [btnSpeed05, btnSpeed1, btnSpeed15, btnSpeed2].forEach(b => b.style.borderColor = 'var(--border-color)');
      e.target.style.borderColor = 'var(--neon-cyan)';
    });
  });

  /* Copy to Clipboard */
  btnCopyClipboard.addEventListener('click', async () => {
    if (currentMode === 'image_edit') {
      const dataUrl = imagePreviewCanvas.toDataURL('image/png');
      const res = await window.onyxApi.copyImageToClipboard(dataUrl);
      if (res.success) alert('Screenshot berhasil disalin ke clipboard!');
      else alert('Gagal menyalin: ' + res.error);
    } else {
      alert('Hanya screenshot gambar yang dapat disalin ke clipboard.');
    }
  });

  /* Save & Export */
  btnExport.addEventListener('click', async () => {
    if (currentMode === 'image_edit') {
      const dataUrl = imagePreviewCanvas.toDataURL('image/png');
      const res = await window.onyxApi.saveImage({ dataUrl });
      if (res.success) alert('Screenshot berhasil disimpan di:\n' + res.filePath);
    } else if (currentMode === 'video_edit' && recordedBlob) {
      const arrayBuffer = await recordedBlob.arrayBuffer();
      const startTime = parseFloat(trimStartRange.value);
      const endTime = parseFloat(trimEndRange.value);
      const speed = videoPreview.playbackRate;

      updateStatus('Processing Video via FFmpeg...', false);

      const ffmpegRes = await window.onyxApi.processFFmpeg({
        inputBuffer: arrayBuffer,
        startTime: startTime > 0 ? startTime : 0,
        endTime: endTime < videoPreview.duration ? endTime : 0,
        speed,
        outputFormat: 'mp4'
      });

      if (ffmpegRes.success) {
        const res = await window.onyxApi.saveVideo({ buffer: ffmpegRes.buffer, format: 'mp4' });
        if (res.success) alert('Video MP4 berhasil di-export & disimpan di:\n' + res.filePath);
      } else {
        // Fallback: save raw webm blob if FFmpeg fails or not present
        const res = await window.onyxApi.saveVideo({ buffer: arrayBuffer, format: 'webm' });
        if (res.success) alert('Video WebM berhasil disimpan di:\n' + res.filePath);
      }
      updateStatus('Ready', false);
    }
  });

  /* Trim sliders updates */
  trimStartRange.addEventListener('input', () => {
    lblTrimStart.textContent = `${trimStartRange.value}s`;
    videoPreview.currentTime = parseFloat(trimStartRange.value);
  });
  trimEndRange.addEventListener('input', () => {
    lblTrimEnd.textContent = `${trimEndRange.value}s`;
  });
});
