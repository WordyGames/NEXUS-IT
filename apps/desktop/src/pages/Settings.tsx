import React, { useEffect, useState } from 'react';
import { RefreshCw, Bell, Volume2, Monitor, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUpdater } from '../contexts/UpdaterContext';
import { Card, Button } from '../components/ui';
import {
  isSoundEnabled, setSoundEnabled,
  isOsNotifEnabled, setOsNotifEnabled,
  requestOsPermission, osPermissionStatus,
  playNotificationSound,
} from '../utils/notificationPrefs';

const Row = ({ label, value }: { label: string; value?: string }) => (
  <div className="flex items-center gap-3 py-2.5 border-b border-slate-50 dark:border-slate-700/50 last:border-0">
    <span className="text-sm text-slate-500 dark:text-slate-400 w-28 shrink-0">{label}</span>
    <span className="text-sm font-medium text-slate-800 dark:text-slate-200">{value || '—'}</span>
  </div>
);

const Toggle: React.FC<{
  id: string;
  label: React.ReactNode;
  description?: React.ReactNode;
  checked: boolean;
  onChange: (val: boolean) => void;
  disabled?: boolean;
}> = ({ id, label, description, checked, onChange, disabled }) => (
  <label htmlFor={id} className={`flex items-center justify-between gap-4 py-3 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
    <div>
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{label}</p>
      {description && <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</p>}
    </div>
    <div className="relative shrink-0">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => !disabled && onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only"
      />
      <div className={`w-10 h-6 rounded-full transition-colors ${checked ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-600'}`}>
        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : 'translate-x-1'}`} />
      </div>
    </div>
  </label>
);

const Settings = () => {
  const { userData } = useAuth();
  const { checkForUpdates } = useUpdater();

  const [soundOn, setSoundOn]         = useState(isSoundEnabled);
  const [osNotifOn, setOsNotifOn]     = useState(isOsNotifEnabled);
  const [osPermission, setOsPermission] = useState<NotificationPermission>(osPermissionStatus);

  useEffect(() => {
    setOsPermission(osPermissionStatus());
  }, []);

  const handleSoundToggle = (val: boolean) => {
    setSoundEnabled(val);
    setSoundOn(val);
    if (val) playNotificationSound('default');
  };

  const handleOsToggle = async (val: boolean) => {
    if (val && osPermission !== 'granted') {
      const result = await requestOsPermission();
      setOsPermission(result);
      if (result !== 'granted') return;
    }
    setOsNotifEnabled(val);
    setOsNotifOn(val);
  };

  const handleRequestPermission = async () => {
    const result = await requestOsPermission();
    setOsPermission(result);
    if (result === 'granted') {
      setOsNotifEnabled(true);
      setOsNotifOn(true);
    }
  };

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">Configuración</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Panel de administrador</p>
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Información del Administrador</h2>
        <Row label="Nombre"  value={userData?.name} />
        <Row label="Usuario" value={userData?.username} />
        <Row label="Empresa" value={userData?.company} />
        <Row label="Rol"     value={userData?.role} />
      </Card>

      {/* Notification preferences */}
      <Card>
        <div className="flex items-center gap-2 mb-1">
          <Bell size={16} className="text-slate-500 dark:text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">Notificaciones</h2>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">
          Configuración de alertas al recibir nuevas notificaciones.
        </p>

        <div className="divide-y divide-slate-50 dark:divide-slate-700/50">
          <Toggle
            id="sound-toggle"
            label={<><Volume2 size={14} className="inline mr-1.5 text-slate-400" />Sonido al recibir notificaciones</>}
            description="Reproduce un tono cuando llegan notificaciones nuevas."
            checked={soundOn}
            onChange={handleSoundToggle}
          />

          <Toggle
            id="os-notif-toggle"
            label={<><Monitor size={14} className="inline mr-1.5 text-slate-400" />Notificaciones del sistema</>}
            description={
              osPermission === 'denied'
                ? 'Bloqueado por el navegador/sistema. Habilítalas manualmente en tu configuración.'
                : 'Muestra alertas del sistema operativo aunque la app esté minimizada.'
            }
            checked={osNotifOn}
            onChange={handleOsToggle}
            disabled={osPermission === 'denied'}
          />
        </div>

        {osPermission === 'default' && (
          <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-700/50">
            <Button
              variant="outline"
              size="sm"
              iconLeft={<Bell size={13} />}
              onClick={handleRequestPermission}
            >
              Solicitar permiso de notificaciones
            </Button>
          </div>
        )}

        {osPermission === 'granted' && osNotifOn && (
          <div className="mt-3 pt-3 border-t border-slate-50 dark:border-slate-700/50 flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
            <CheckCircle size={13} />
            Notificaciones del sistema habilitadas
          </div>
        )}
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-1">Actualizaciones</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Mantén la aplicación actualizada para obtener las últimas funciones y correcciones de seguridad.
        </p>
        <Button variant="primary" size="sm" onClick={checkForUpdates} iconLeft={<RefreshCw size={14} />}>
          Buscar Actualizaciones
        </Button>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">Información del Sistema</h2>
        <Row label="Versión"    value="1.0.0" />
        <Row label="Plataforma" value="Electron + React" />
      </Card>
    </div>
  );
};

export default Settings;
