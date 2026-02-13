import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Equipment, getEquipment } from '@nexus-it/shared';
import { Computer, Smartphone, Printer, Network, HardDrive, MonitorIcon } from 'lucide-react';

const MyEquipment = () => {
  const { userData } = useAuth();
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadEquipment();
  }, [userData?.id]);

  const loadEquipment = async () => {
    if (!userData?.id) return;
    
    try {
      setLoading(true);
      const data = await getEquipment({ assignedTo: userData.id });
      setEquipment(data);
    } catch (error) {
      console.error('Error loading equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEquipmentIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'laptop': return <Computer className="text-blue-500" size={40} />;
      case 'desktop': return <MonitorIcon className="text-purple-500" size={40} />;
      case 'phone': return <Smartphone className="text-green-500" size={40} />;
      case 'printer': return <Printer className="text-orange-500" size={40} />;
      case 'network': return <Network className="text-cyan-500" size={40} />;
      default: return <HardDrive className="text-gray-500" size={40} />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-600 dark:text-gray-400">Cargando equipos...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
          Mis Equipos
        </h1>
        <p className="text-gray-600 dark:text-gray-400">
          Equipos asignados a {userData?.name}
        </p>
      </div>

      {equipment.length === 0 ? (
        <div className="bg-blue-50 dark:bg-blue-900 border border-blue-200 dark:border-blue-700 rounded-lg p-8 text-center">
          <HardDrive className="mx-auto mb-4 text-blue-500" size={48} />
          <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-100 mb-2">
            No tienes equipos asignados
          </h3>
          <p className="text-blue-600 dark:text-blue-200">
            Contacta al administrador para solicitar equipos
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {equipment.map((eq) => (
            <div
              key={eq.id}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                {getEquipmentIcon(eq.type)}
                <span
                  className={`text-xs px-3 py-1 rounded-full font-medium ${
                    eq.status === 'active'
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                      : eq.status === 'maintenance'
                      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-100'
                  }`}
                >
                  {eq.status === 'active' ? 'Activo' : eq.status === 'maintenance' ? 'Mantenimiento' : 'Inactivo'}
                </span>
              </div>

              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">
                {eq.name}
              </h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Tipo:</span>
                  <span className="font-medium text-gray-800 dark:text-white capitalize">
                    {eq.type}
                  </span>
                </div>

                {eq.serialNumber && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Serie:</span>
                    <span className="font-medium text-gray-800 dark:text-white">
                      {eq.serialNumber}
                    </span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">Ubicación:</span>
                  <span className="font-medium text-gray-800 dark:text-white">
                    {eq.location}
                  </span>
                </div>

                {eq.specs?.cpu && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-gray-600 dark:text-gray-400">CPU:</p>
                    <p className="font-medium text-gray-800 dark:text-white">{eq.specs.cpu}</p>
                  </div>
                )}

                {eq.specs?.ram && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">RAM:</span>
                    <span className="font-medium text-gray-800 dark:text-white">{eq.specs.ram}</span>
                  </div>
                )}

                {eq.specs?.storage && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Almacenamiento:</span>
                    <span className="font-medium text-gray-800 dark:text-white">{eq.specs.storage}</span>
                  </div>
                )}
              </div>

              {eq.warrantyExpiration && (
                <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Garantía vence: {new Date(eq.warrantyExpiration.seconds * 1000).toLocaleDateString()}
                  </p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyEquipment;
