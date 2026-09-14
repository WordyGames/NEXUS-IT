import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import { exec, execFile } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import isDev from 'electron-is-dev';

const execAsync = promisify(exec);
const execFileAsync = promisify(execFile);

let mainWindow: BrowserWindow | null = null;

const getRuntimeContext = () => {
  const portableExecutableDir = process.env.PORTABLE_EXECUTABLE_DIR;
  const portableExecutableFile = process.env.PORTABLE_EXECUTABLE_FILE;
  // macOS has no Electron "portable" target like Windows. A packaged .app
  // started from an external volume is the equivalent USB workflow.
  const isMacExternalApp = process.platform === 'darwin' && process.execPath.startsWith('/Volumes/');

  return {
    isPortableMode: Boolean(portableExecutableDir || portableExecutableFile || isMacExternalApp),
    portableExecutableDir: portableExecutableDir || undefined,
    portableExecutableFile: portableExecutableFile || undefined,
    platform: process.platform
  };
};

const detectMacSpecs = async () => {
  const specs: Record<string, string> = { manufacturer: 'Apple' };

  try {
    const { stdout } = await execFileAsync('system_profiler', [
      '-json', 'SPHardwareDataType', 'SPSoftwareDataType', 'SPDisplaysDataType'
    ]);
    const profile = JSON.parse(stdout) as Record<string, Array<Record<string, unknown>>>;
    const hardware = profile.SPHardwareDataType?.[0] || {};
    const software = profile.SPSoftwareDataType?.[0] || {};
    const display = profile.SPDisplaysDataType?.[0] || {};
    const graphics = (display.spdisplays_ndrvs as Array<Record<string, unknown>> | undefined)?.[0] || {};
    const read = (source: Record<string, unknown>, ...keys: string[]) => {
      const value = keys.map(key => source[key]).find(value => typeof value === 'string' && value.trim());
      return typeof value === 'string' ? value.trim() : '';
    };

    specs.model = read(hardware, 'machine_model', 'model_name', 'machine_name');
    specs.serialNumber = read(hardware, 'serial_number');
    specs.cpu = read(hardware, 'chip_type', 'processor_name', 'current_processor_speed');
    specs.ram = read(hardware, 'physical_memory');
    specs.os = read(software, 'os_version', 'system_version');
    specs.gpu = read(graphics, 'sppci_model', '_name', 'spdisplays_vendor');
  } catch (error) {
    console.error('Error leyendo system_profiler:', error);
  }

  try {
    const { stdout } = await execFileAsync('scutil', ['--get', 'ComputerName']);
    specs.hostname = stdout.trim();
  } catch (error) {
    console.error('Error detectando nombre de la Mac:', error);
  }

  try {
    const { stdout } = await execFileAsync('df', ['-k', '/']);
    const lines = stdout.trim().split(/\r?\n/);
    const values = lines[lines.length - 1]?.trim().split(/\s+/) || [];
    const kilobytes = Number(values[1]);
    if (Number.isFinite(kilobytes) && kilobytes > 0) {
      specs.storage = `${Math.round(kilobytes / (1024 * 1024))} GB`;
    }
  } catch (error) {
    console.error('Error detectando almacenamiento de la Mac:', error);
  }

  return specs;
};

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

ipcMain.handle('get-runtime-context', async () => {
  return getRuntimeContext();
});

// System info detection
ipcMain.handle('detect-system-specs', async () => {
  try {
    if (process.platform === 'darwin') return detectMacSpecs();
    if (process.platform !== 'win32') {
      throw new Error(`Sistema operativo no compatible para el escáner: ${process.platform}`);
    }

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
