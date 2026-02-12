import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface UpdateInfo {
  version: string;
  releaseDate: string;
}

interface DownloadProgress {
  bytesPerSecond: number;
  percent: number;
  transferred: number;
  total: number;
}

interface UpdaterContextType {
  updateAvailable: boolean;
  updateInfo: UpdateInfo | null;
  downloadProgress: DownloadProgress | null;
  updateDownloaded: boolean;
  downloadUpdate: () => void;
  installUpdate: () => void;
  checkForUpdates: () => void;
}

const UpdaterContext = createContext<UpdaterContextType | undefined>(undefined);

export const useUpdater = () => {
  const context = useContext(UpdaterContext);
  if (!context) {
    throw new Error('useUpdater must be used within UpdaterProvider');
  }
  return context;
};

export const UpdaterProvider = ({ children }: { children: ReactNode }) => {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<UpdateInfo | null>(null);
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress | null>(null);
  const [updateDownloaded, setUpdateDownloaded] = useState(false);

  useEffect(() => {
    // Only in Electron environment
    if (typeof window !== 'undefined' && (window as any).electron) {
      const electron = (window as any).electron;

      electron.onUpdateAvailable((info: UpdateInfo) => {
        setUpdateAvailable(true);
        setUpdateInfo(info);
      });

      electron.onDownloadProgress((progress: DownloadProgress) => {
        setDownloadProgress(progress);
      });

      electron.onUpdateDownloaded((info: UpdateInfo) => {
        setUpdateDownloaded(true);
        setUpdateInfo(info);
      });

      electron.onUpdateError((err: Error) => {
        console.error('Update error:', err);
      });
    }
  }, []);

  const downloadUpdate = () => {
    if ((window as any).electron) {
      (window as any).electron.downloadUpdate();
    }
  };

  const installUpdate = () => {
    if ((window as any).electron) {
      (window as any).electron.installUpdate();
    }
  };

  const checkForUpdates = () => {
    if ((window as any).electron) {
      (window as any).electron.checkForUpdates();
    }
  };

  const value: UpdaterContextType = {
    updateAvailable,
    updateInfo,
    downloadProgress,
    updateDownloaded,
    downloadUpdate,
    installUpdate,
    checkForUpdates
  };

  return (
    <UpdaterContext.Provider value={value}>
      {children}
    </UpdaterContext.Provider>
  );
};
