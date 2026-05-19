import React from 'react';
import { RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useUpdater } from '../contexts/UpdaterContext';
import { Card, Button } from '../components/ui';

const Row = ({ label, value }: { label: string; value?: string }) => (
  <div className="flex items-center gap-3 py-2.5 border-b border-slate-50 last:border-0">
    <span className="text-sm text-slate-500 w-28 shrink-0">{label}</span>
    <span className="text-sm font-medium text-slate-800">{value || '—'}</span>
  </div>
);

const Settings = () => {
  const { userData } = useAuth();
  const { checkForUpdates } = useUpdater();

  return (
    <div className="space-y-5 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 mb-1">Configuración</h1>
        <p className="text-sm text-slate-500">Panel de administrador</p>
      </div>

      <Card>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Información del Administrador</h2>
        <Row label="Nombre"  value={userData?.name} />
        <Row label="Usuario" value={userData?.username} />
        <Row label="Empresa" value={userData?.company} />
        <Row label="Rol"     value={userData?.role} />
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-slate-700 mb-1">Actualizaciones</h2>
        <p className="text-xs text-slate-500 mb-4">
          Mantén la aplicación actualizada para obtener las últimas funciones y correcciones de seguridad.
        </p>
        <Button variant="primary" size="sm" onClick={checkForUpdates} iconLeft={<RefreshCw size={14} />}>
          Buscar Actualizaciones
        </Button>
      </Card>

      <Card>
        <h2 className="text-sm font-semibold text-slate-700 mb-3">Información del Sistema</h2>
        <Row label="Versión"    value="1.0.0" />
        <Row label="Plataforma" value="Electron + React" />
      </Card>
    </div>
  );
};

export default Settings;
