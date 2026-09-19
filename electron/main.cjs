const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');

// GPU 오류 및 충돌 방지 최적화 플래그
app.commandLine.appendSwitch('disable-gpu-process-crash-limit');
app.commandLine.appendSwitch('no-sandbox');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('disable-software-rasterizer');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 420,
    minHeight: 520,
    backgroundColor: '#0a0c14',
    title: 'Blue Frontline Balancing Tool',
    icon: path.join(__dirname, '../img/icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: false
    }
  });

  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';

  if (!app.isPackaged && process.env.NODE_ENV !== 'production') {
    mainWindow.loadURL(devServerUrl).catch(() => {
      mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // 창 닫을 때 프로세스 즉각 정리 (GPU 에러 방지)
  mainWindow.on('close', () => {
    mainWindow = null;
    app.exit(0);
  });
}

// 네이티브 파일 열기 다이얼로그
ipcMain.handle('dialog:openFile', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: '기획 데이터 파일', extensions: ['xlsx', 'xls', 'csv', 'md'] },
      { name: '모든 파일', extensions: ['*'] }
    ]
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  const fileContents = [];
  for (const fp of result.filePaths) {
    const ext = path.extname(fp).toLowerCase();
    const name = path.basename(fp);
    if (ext === '.md' || ext === '.csv') {
      const text = fs.readFileSync(fp, 'utf-8');
      fileContents.push({ name, type: 'text', data: text });
    } else {
      const buf = fs.readFileSync(fp);
      fileContents.push({ name, type: 'buffer', data: buf.toString('base64') });
    }
  }

  return fileContents;
});

const { scanUnrealProject } = require('./unrealAssetScanner.cjs');

// 네이티브 폴더 선택 다이얼로그 (언리얼 프로젝트 폴더 지정용)
ipcMain.handle('dialog:openDirectory', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
    title: 'MolluFPS 언리얼 프로젝트 또는 Content 폴더 선택',
    defaultPath: 'D:\\Project_MF\\MolluFPS'
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }
  return result.filePaths[0];
});

// 언리얼 프로젝트 에셋 스캔 및 캐릭터 스탯 자동 추출
ipcMain.handle('unreal:scanProject', async (event, folderPath) => {
  try {
    const targetPath = folderPath || 'D:\\Project_MF\\MolluFPS\\MolluFPS\\Content';
    const characters = scanUnrealProject(targetPath);
    return { success: true, characters, path: targetPath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('app:version', () => app.getVersion());

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  app.exit(0);
});
