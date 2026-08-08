const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

console.log('====================================================');
console.log('  ONYXSCREEN PRO STUDIO — AUTOMATED TEST SUITE');
console.log('====================================================\n');

let passedTests = 0;
let failedTests = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passedTests++;
  } else {
    console.error(`  ❌ FAIL: ${message}`);
    failedTests++;
  }
}

// 1. Check File Integrity
console.log('1. Testing File Integrity & Architecture...');
const requiredFiles = ['package.json', 'main.js', 'preload.js', 'index.html', 'styles.css', 'renderer.js', 'README.md'];
requiredFiles.forEach(file => {
  const fullPath = path.join(__dirname, file);
  assert(fs.existsSync(fullPath), `File [${file}] exists`);
});

// 2. Check Package.json Configuration
console.log('\n2. Testing Manifest & Package Configuration...');
try {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  assert(pkg.name === 'onyx-screen-pro', 'Package name is "onyx-screen-pro"');
  assert(pkg.main === 'main.js', 'Entry point is set to "main.js"');
  assert(pkg.devDependencies && pkg.devDependencies.electron, 'Electron dependency configured');
} catch (e) {
  assert(false, 'package.json is valid JSON');
}

// 3. Test Main Process IPC Handlers
console.log('\n3. Testing Main Process IPC Handlers...');
const mainCode = fs.readFileSync(path.join(__dirname, 'main.js'), 'utf8');
assert(mainCode.includes("ipcMain.handle('get-sources'"), 'IPC handler "get-sources" defined');
assert(mainCode.includes("ipcMain.handle('select-source-by-id'"), 'IPC handler "select-source-by-id" defined');
assert(mainCode.includes("ipcMain.handle('save-video'"), 'IPC handler "save-video" defined');
assert(mainCode.includes("ipcMain.handle('save-image'"), 'IPC handler "save-image" defined');
assert(mainCode.includes("ipcMain.handle('process-ffmpeg'"), 'IPC handler "process-ffmpeg" defined');
assert(mainCode.includes("setDisplayMediaRequestHandler"), 'DisplayMedia request handler registered');

// 4. Test Preload API Bridge
console.log('\n4. Testing Preload API Bridge...');
const preloadCode = fs.readFileSync(path.join(__dirname, 'preload.js'), 'utf8');
assert(preloadCode.includes("contextBridge.exposeInMainWorld('onyxApi'"), 'onyxApi exposed via contextBridge');
assert(preloadCode.includes("selectSourceById:"), 'selectSourceById exposed in onyxApi');

// 5. Test Renderer UI & DOM Elements
console.log('\n5. Testing Renderer Logic & HTML Elements...');
const htmlCode = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
assert(htmlCode.includes('id="btnSelectSource"'), 'Button "btnSelectSource" present in HTML');
assert(htmlCode.includes('id="btnRecord"'), 'Button "btnRecord" present in HTML');
assert(htmlCode.includes('id="btnSnapFull"'), 'Button "btnSnapFull" present in HTML');
assert(htmlCode.includes('id="btnSnapCrop"'), 'Button "btnSnapCrop" present in HTML');
assert(htmlCode.includes('id="studioFrame"'), 'Element "studioFrame" present in HTML');

const rendererCode = fs.readFileSync(path.join(__dirname, 'renderer.js'), 'utf8');
assert(rendererCode.includes('getDisplayMedia'), 'OpenScreen getDisplayMedia architecture implemented');
assert(rendererCode.includes('MediaRecorder'), 'MediaRecorder API implemented');
assert(rendererCode.includes('captureRectangleCrop'), 'Rectangle Crop Selection function implemented');

// 6. Test FFmpeg Binary Availability
console.log('\n6. Testing FFmpeg Engine...');
const ffmpegTest = spawnSync('ffmpeg', ['-version']);
assert(ffmpegTest.status === 0, 'FFmpeg system binary is available and executable');

console.log('\n====================================================');
console.log(`  TEST RESULTS: ${passedTests} Passed, ${failedTests} Failed`);
console.log('====================================================\n');

if (failedTests > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
