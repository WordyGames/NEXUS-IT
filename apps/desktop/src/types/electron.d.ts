export interface SystemSpecs {
  cpu?: string;
  gpu?: string;
  ram?: string;
  storage?: string;
  os?: string;
  hostname?: string;
  serialNumber?: string;
  model?: string;
  manufacturer?: string;
}

export interface RuntimeContext {
  isPortableMode: boolean;
  portableExecutableDir?: string;
  portableExecutableFile?: string;
  platform: string;
}

declare global {
  interface Window {
    electron?: {
      detectSystemSpecs: () => Promise<SystemSpecs>;
      getRuntimeContext: () => Promise<RuntimeContext>;
      onUpdateAvailable: (callback: (info: any) => void) => void;
      onDownloadProgress: (callback: (progress: any) => void) => void;
      onUpdateDownloaded: (callback: (info: any) => void) => void;
      onUpdateError: (callback: (error: any) => void) => void;
      downloadUpdate: () => void;
      installUpdate: () => void;
      checkForUpdates: () => void;
    };
  }
}

export {};
