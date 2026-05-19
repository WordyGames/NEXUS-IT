import React, { useEffect, useState } from 'react';
import { Computer, Smartphone, Printer, Network, HardDrive, MonitorIcon, RefreshCw } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Equipment, getEquipment } from '@nexus-it/shared';
import { toDate } from '../utils/dateUtils';
import { Spinner, Card, EmptyState, Badge } from '../components/ui';

const getEquipmentIcon = (type: string) => {
  const cls = 'flex-shrink-0';
  switch (type.toLowerCase()) {
    case 'laptop':  return <Computer     size={36} className={`${cls} text-blue-500`} />;
    case 'desktop': return <MonitorIcon  size={36} className={`${cls} text-purple-500`} />;
    case 'phone':   return <Smartphone   size={36} className={`${cls} text-green-500`} />;
    case 'tablet':  return <Smartphone   size={36} className={`${cls} text-teal-500`} />;
    case 'printer': return <Printer      size={36} className={`${cls} text-orange-500`} />;
    case 'network': return <Network      size={36} className={`${cls} text-cyan-500`} />;
    default:        return <HardDrive    size={36} className={`${cls} text-slate-400`} />;
  }
};

const statusBadge = (status: string) => {
  if (status === 'active')      return <Badge color="green"  dot>Activo</Badge>;
  if (status === 'maintenance') return <Badge color="yellow" dot>Mantenimiento</Badge>;
  return                               <Badge color="gray"   dot>Inactivo</Badge>;
};

const MyEquipment = () => {
  const { userData } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => { loadEquipment(); }, [userData?.id]);

  const loadEquipment = async () => {
    if (!userData?.id) { setEquipment([]); setLoading(false); return; }
    try {
      setLoading(true);
      setLoadError(null);
      setEquipment(await getEquipment({ assignedTo: userData.id }));
    } catch {
      setLoadError('No se pudieron cargar tus equipos. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const getSerial = (eq: Equipment): string => {
    const s = eq.specs as Equipment['specs'] & { seria?: string };
    return s?.serialNumber || s?.seria || '';
  };

  if (loading) return <Spinner size="xl" label="Cargando equipos..." className="h-64 justify-center" />;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">Mis Equipos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {equipment.length} equipo{equipment.length !== 1 ? 's' : ''} asignado{equipment.length !== 1 ? 's' : ''} a {userData?.name}
          </p>
        </div>
      </div>

      {loadError && (
        <Card className="border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-red-700 dark:text-red-300">{loadError}</p>
            <button
              type="button"
              onClick={loadEquipment}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
            >
              <RefreshCw size={12} />
              Reintentar
            </button>
          </div>
        </Card>
      )}

      {equipment.length === 0 ? (
        <EmptyState
          icon={<HardDrive size={28} />}
          title="Sin equipos asignados"
          description="Contacta al administrador para solicitar la asignación de equipos."
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {equipment.map((eq) => (
            <Card key={eq.id} hover>
              <div className="flex items-start justify-between mb-4">
                {getEquipmentIcon(eq.type)}
                {statusBadge(eq.status)}
              </div>

              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100 mb-3">{eq.name}</h3>

              <div className="space-y-1.5 text-sm">
                <Row label="Tipo"      value={eq.type} capitalize />
                {getSerial(eq) && <Row label="Serie"   value={getSerial(eq)} />}
                <Row label="Ubicación" value={eq.location} />

                {(eq.specs?.cpu || eq.specs?.ram || eq.specs?.storage) && (
                  <div className="pt-2 mt-2 border-t border-slate-100 dark:border-slate-700 space-y-1.5">
                    {eq.specs?.cpu     && <Row label="CPU"           value={eq.specs.cpu} />}
                    {eq.specs?.ram     && <Row label="RAM"           value={eq.specs.ram} />}
                    {eq.specs?.storage && <Row label="Almacenamiento" value={eq.specs.storage} />}
                  </div>
                )}
              </div>

              {eq.warrantyExpiration && (
                <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-400 dark:text-slate-500">
                    Garantía vence: {toDate(eq.warrantyExpiration).toLocaleDateString('es-MX')}
                  </p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

const Row = ({ label, value, capitalize }: { label: string; value: string; capitalize?: boolean }) => (
  <div className="flex justify-between items-baseline gap-2">
    <span className="text-slate-500 dark:text-slate-400 shrink-0">{label}:</span>
    <span className={`font-medium text-slate-800 dark:text-slate-200 text-right truncate ${capitalize ? 'capitalize' : ''}`}>{value}</span>
  </div>
);

export default MyEquipment;
