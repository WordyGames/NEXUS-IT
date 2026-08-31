import React, { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

/**
 * Aviso fijo cuando no hay conexión a internet. NEXUS-IT ahora sigue
 * mostrando la última copia guardada de equipos, tickets y mantenimientos
 * sin conexión (ver packages/shared/src/utils/offlineCache.ts), pero crear
 * o editar sigue requiriendo internet — este banner deja claro en qué modo
 * está la app para que no se sorprenda si algo reciente no aparece todavía.
 */
const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(
    typeof navigator !== 'undefined' ? !navigator.onLine : false
  );

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);
    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div className="flex items-center justify-center gap-2 bg-amber-500 text-amber-950 text-sm font-medium px-4 py-2">
      <WifiOff size={16} />
      <span>Sin conexión — mostrando la última información guardada. Crear o editar requiere internet.</span>
    </div>
  );
};

export default OfflineBanner;
