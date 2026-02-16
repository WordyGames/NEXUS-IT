import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import isDev from 'electron-is-dev';

const execAsync = promisify(exec);

let mainWindow: BrowserWindow | null = null;

// Auto-updater configuration
autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = true;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1200,
    minHeight: 700,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'NEXUS IT',
    show: false
  });

  // Load app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    
    // Check for updates
    if (!isDev) {
      setTimeout(() => {
        checkForUpdates();
      }, 3000);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Auto-updater events
function checkForUpdates() {
  autoUpdater.checkForUpdates();
}

autoUpdater.on('update-available', (info) => {
  mainWindow?.webContents.send('update-available', info);
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available:', info);
});

autoUpdater.on('download-progress', (progressObj) => {
  mainWindow?.webContents.send('download-progress', progressObj);
});

autoUpdater.on('update-downloaded', (info) => {
  mainWindow?.webContents.send('update-downloaded', info);
});

autoUpdater.on('error', (err) => {
  mainWindow?.webContents.send('update-error', err);
});

// IPC handlers
ipcMain.on('download-update', () => {
  autoUpdater.downloadUpdate();
});

ipcMain.on('install-update', () => {
  autoUpdater.quitAndInstall(false, true);
});

ipcMain.on('check-for-updates', () => {
  checkForUpdates();
});

// System info detection
ipcMain.handle('detect-system-specs', async () => {
  try {
    const specs: any = {};

    // CPU
    try {
      const { stdout: cpu } = await execAsync(
        'powershell "Get-CimInstance -ClassName Win32_Processor | Select-Object -ExpandProperty Name"'
      );
      specs.cpu = cpu.trim();
    } catch (error) {
      console.error('Error detectando CPU:', error);
    }

    // GPU
    try {
      const { stdout: gpu } = await execAsync(
        'powershell "Get-CimInstance -ClassName Win32_VideoController | Select-Object -First 1 -ExpandProperty Name"'
      );
      specs.gpu = gpu.trim();
    } catch (error) {
      console.error('Error detectando GPU:', error);
    }

    // RAM
    try {
      const { stdout: ram } = await execAsync(
        'powershell "(Get-CimInstance -ClassName Win32_ComputerSystem).TotalPhysicalMemory / 1GB"'
      );
      const ramGB = Math.round(parseFloat(ram.trim()));
      specs.ram = `${ramGB} GB`;
    } catch (error) {
      console.error('Error detectando RAM:', error);
    }

    // Storage
    try {
      const { stdout: storage } = await execAsync(
        'powershell "Get-CimInstance -ClassName Win32_LogicalDisk -Filter \'DriveType=3\' | Measure-Object -Property Size -Sum | Select-Object -ExpandProperty Sum"'
      );
      const storageGB = Math.round(parseFloat(storage.trim()) / (1024 ** 3));
      specs.storage = `${storageGB} GB`;
    } catch (error) {
      console.error('Error detectando Storage:', error);
    }

    // Sistema Operativo
    try {
      const { stdout: os } = await execAsync(
        'powershell "(Get-CimInstance -ClassName Win32_OperatingSystem).Caption"'
      );
      specs.os = os.trim();
    } catch (error) {
      console.error('Error detectando OS:', error);
    }

    // Hostname
    try {
      const { stdout: hostname } = await execAsync(
        'powershell "$env:COMPUTERNAME"'
      );
      specs.hostname = hostname.trim();
    } catch (error) {
      console.error('Error detectando Hostname:', error);
    }

    // Serial Number (BIOS)
    try {
      const { stdout: serial } = await execAsync(
        'powershell "Get-CimInstance -ClassName Win32_BIOS | Select-Object -ExpandProperty SerialNumber"'
      );
      specs.serialNumber = serial.trim();
    } catch (error) {
      console.error('Error detectando Serial Number:', error);
    }

    // Modelo del equipo
    try {
      const { stdout: model } = await execAsync(
        'powershell "Get-CimInstance -ClassName Win32_ComputerSystem | Select-Object -ExpandProperty Model"'
      );
      specs.model = model.trim();
    } catch (error) {
      console.error('Error detectando Modelo:', error);
    }

    // Fabricante del equipo
    try {
      const { stdout: manufacturer } = await execAsync(
        'powershell "Get-CimInstance -ClassName Win32_ComputerSystem | Select-Object -ExpandProperty Manufacturer"'
      );
      specs.manufacturer = manufacturer.trim();
    } catch (error) {
      console.error('Error detectando Fabricante:', error);
    }

    return specs;
  } catch (error: any) {
    console.error('Error general detectando specs:', error);
    throw new Error(error.message);
  }
});

// App events
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
