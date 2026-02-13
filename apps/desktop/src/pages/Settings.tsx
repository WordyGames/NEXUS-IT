import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useUpdater } from '../contexts/UpdaterContext';

const Settings = () => {
  const { userData } = useAuth();
  const { checkForUpdates } = useUpdater();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
          Configuración
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Panel de administrador
        </p>
      </div>

      {/* Información del Usuario */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
          Información del Administrador
        </h2>
        <div className="space-y-3">
          <div className="flex items-center">
            <span className="text-gray-600 dark:text-gray-400 w-32">Nombre:</span>
            <span className="text-gray-800 dark:text-white font-medium">{userData?.name}</span>
          </div>
          <div className="flex items-center">
            <span className="text-gray-600 dark:text-gray-400 w-32">Usuario:</span>
            <span className="text-gray-800 dark:text-white font-medium">{userData?.username}</span>
          </div>
          <div className="flex items-center">
            <span className="text-gray-600 dark:text-gray-400 w-32">Empresa:</span>
            <span className="text-gray-800 dark:text-white font-medium">{userData?.company}</span>
          </div>
          <div className="flex items-center">
            <span className="text-gray-600 dark:text-gray-400 w-32">Rol:</span>
            <span className="text-gray-800 dark:text-white font-medium capitalize">{userData?.role}</span>
          </div>
        </div>
      </div>

      {/* Actualizaciones */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
          Actualizaciones
        </h2>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Mantén la aplicación actualizada para obtener las últimas funciones y correcciones de seguridad.
        </p>
        <button
          onClick={checkForUpdates}
          className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
        >
          Buscar Actualizaciones
        </button>
      </div>

      {/* Información del Sistema */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow">
        <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
          Información del Sistema
        </h2>
        <div className="space-y-3">
          <div className="flex items-center">
            <span className="text-gray-600 dark:text-gray-400 w-32">Versión:</span>
            <span className="text-gray-800 dark:text-white font-medium">1.0.0</span>
          </div>
          <div className="flex items-center">
            <span className="text-gray-600 dark:text-gray-400 w-32">Plataforma:</span>
            <span className="text-gray-800 dark:text-white font-medium">Electron + React</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
