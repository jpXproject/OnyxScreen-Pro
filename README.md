<div align="center">

# 🎥 OnyxScreen Pro
### Sleek Dark-Mode Screen & Window Recorder + Capture & Editor Suite

[![Electron](https://img.shields.io/badge/Electron-v33.2.1-47ABE6?style=for-the-badge&logo=electron&logoColor=white)](https://www.electronjs.org/)
[![JavaScript](https://img.shields.io/badge/JavaScript-ES6+-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)](https://developer.mozilla.org/en-US/docs/Web/JavaScript)
[![FFmpeg](https://img.shields.io/badge/FFmpeg-v8.1.2-0078D7?style=for-the-badge&logo=ffmpeg&logoColor=white)](https://ffmpeg.org/)
[![License](https://img.shields.io/badge/License-MIT-00e676?style=for-the-badge)](#license)

<br />

**Aplikasi Desktop Kelas Atas untuk Perekaman Window Tertentu, Screenshot Presisi (Full & Custom Rectangle Crop), serta Editor Video & Gambar bawaan.**

</div>

---

## 🌟 Fitur Utama (Key Features)

1. **🪟 Specific Window / Screen Selector**:
   - Memilih aplikasi atau window mana yang ingin direkam secara khusus (VS Code, Browser, Game, Terminal, dll) lengkap dengan pratinjau thumbnail live.

2. **🔴 High-Quality Screen Recording**:
   - Merekam dengan frame rate hingga 60fps, dukungan audio mikrofon, indikator timer aktif, dan visualisasi status rekaman.

3. **📸 Screenshot Dual-Mode**:
   - **Full Window**: Mengambil tangkapan layar instan dari window yang dipilih.
   - **Rectangle / Area Selection Crop**: Mode pemotongan area tertentu secara interaktif dengan klik & drag mouse.

4. **🎬 Result Editor & FFmpeg Engine Bawaan**:
   - **Pemotong Video (Trim)**: Slider waktu awal dan akhir untuk memotong bagian video yang diinginkan.
   - **Pengatur Kecepatan (Speed Controller)**: Pilihan kecepatan playback `0.5x`, `1.0x`, `1.5x`, `2.0x`.
   - **Watermark & Annotations**: Menambahkan teks watermark langsung pada screenshot maupun video.
   - **Ekspor MP4 / WebM / PNG**: Konversi otomatis format MP4 dengan FFmpeg atau salin gambar langsung ke *Clipboard*.

---

## 🚀 Cara Menjalankan Aplikasi

### 1. Masuk ke Direktori Proyek
```bash
cd C:\Users\XCODE\OnyxScreen-Pro
```

### 2. Jalankan Mode Developer
```bash
npm start
```

---

## 🛠️ Struktur Proyek

```
OnyxScreen-Pro/
├── main.js         # Entry point Electron main process & integrasi IPC / FFmpeg
├── preload.js      # Secure IPC Bridge (contextBridge)
├── index.html      # UI Glassmorphism & layout aplikasi
├── styles.css      # Design System Dark Mode Onyx (HSL Tailored)
├── renderer.js     # Logika perekaman stream, crop rectangle, & editor video
└── package.json    # Manifest & dependensi Electron
```

---

<div align="center">

Dibuat dengan ❤️ untuk **jpXproject**

</div>
