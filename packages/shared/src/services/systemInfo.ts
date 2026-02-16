import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SystemSpecs {
  cpu?: string;
  gpu?: string;
  ram?: string;
  storage?: string;
  os?: string;
  hostname?: string;
  serialNumber?: string;
}

/**
 * Detecta automáticamente las especificaciones del sistema usando PowerShell
 */
export const detectSystemSpecs = async (): Promise<SystemSpecs> => {
  try {
    // Solo funciona en entornos Electron/Node.js
    if (typeof window !== 'undefined' && !window.require) {
      throw new Error('Esta función solo está disponible en la aplicación desktop');
    }

    const specs: SystemSpecs = {};

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

    return specs;
  } catch (error) {
    console.error('Error general detectando specs:', error);
    throw error;
  }
};
