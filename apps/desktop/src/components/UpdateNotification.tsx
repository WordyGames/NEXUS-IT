import React from 'react';
import { useUpdater } from '../contexts/UpdaterContext';
import styles from './UpdateNotification.module.css';

const UpdateNotification: React.FC = () => {
  const {
    updateAvailable,
    updateInfo,
    downloadProgress,
    updateDownloaded,
    downloadUpdate,
    installUpdate
  } = useUpdater();

  if (!updateAvailable && !updateDownloaded) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 max-w-md border border-gray-200 dark:border-gray-700">
      {updateDownloaded ? (
        <>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
            Actualización Lista
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            La actualización {updateInfo?.version} ha sido descargada.
          </p>
          <button
            onClick={installUpdate}
            className="w-full px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
          >
            Instalar y Reiniciar
          </button>
        </>
      ) : downloadProgress ? (
        <>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
            Descargando Actualización
          </h3>
          <progress
            aria-label={`Descarga en progreso: ${Math.round(downloadProgress.percent)}%`}
            title="Barra de progreso de descarga"
            className={styles.progressElement}
            value={Math.max(0, Math.min(100, downloadProgress.percent))}
            max={100}
          />
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {Math.round(downloadProgress.percent)}% completado
          </p>
        </>
      ) : (
        <>
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
            Nueva Actualización Disponible
          </h3>
          <p className="text-gray-600 dark:text-gray-300 mb-4">
            Versión {updateInfo?.version} está disponible.
          </p>
          <button
            onClick={downloadUpdate}
            className="w-full px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Descargar Ahora
          </button>
        </>
      )}
    </div>
  );
};

export default UpdateNotification;
