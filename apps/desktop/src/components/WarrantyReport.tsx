import React, { useState, useEffect } from 'react';
import { AlertTriangle, Calendar, Download, CheckCircle } from 'lucide-react';
import { getEquipment } from '@nexus-it/shared';
import { Equipment } from '@nexus-it/shared';
import * as XLSX from 'xlsx';

interface WarrantyStatus {
  expired: Equipment[];
  expiringSoon: Equipment[];
  active: Equipment[];
}

export const WarrantyReport: React.FC = () => {
  const [warranties, setWarranties] = useState<WarrantyStatus>({
    expired: [],
    expiringSoon: [],
    active: [],
  });
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState<'expired' | 'expiringSoon' | 'active'>('expiringSoon');

  // Helper para convertir fecha de Firebase
  const toDate = (date: any): Date => {
    if (!date) return new Date();
    if (date.toDate) return date.toDate(); // Firestore Timestamp
    if (date instanceof Date) return date;
    return new Date(date); // String o número
  };

  useEffect(() => {
    loadWarranties();
  }, []);

  const loadWarranties = async () => {
    try {
      const allEquipment = await getEquipment({});
      
      const today = new Date();
      const thirtyDaysLater = new Date();
      thirtyDaysLater.setDate(today.getDate() + 30);

      const expired: Equipment[] = [];
      const expiringSoon: Equipment[] = [];
      const active: Equipment[] = [];

      allEquipment.forEach((equipment) => {
        if (!equipment.warrantyExpiration) {
          return; // Skip equipment without warranty info
        }

        const warrantyDate = toDate(equipment.warrantyExpiration);

        if (warrantyDate < today) {
          expired.push(equipment);
        } else if (warrantyDate <= thirtyDaysLater) {
          expiringSoon.push(equipment);
        } else {
          active.push(equipment);
        }
      });

      setWarranties({ expired, expiringSoon, active });
    } catch (error) {
      console.error('Error loading warranties:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    const data = [
      ...warranties.expired.map(eq => ({ ...eq, status: 'Vencida' })),
      ...warranties.expiringSoon.map(eq => ({ ...eq, status: 'Por Vencer' })),
      ...warranties.active.map(eq => ({ ...eq, status: 'Activa' })),
    ].map(eq => ({
      'Nombre': eq.name,
      'Tipo': eq.type,
      'Empresa': eq.company,
      'Estado': eq.status,
      'Garantía Vence': eq.warrantyExpiration ? toDate(eq.warrantyExpiration).toLocaleDateString() : 'N/A',
      'Días Restantes': eq.warrantyExpiration 
        ? Math.ceil((toDate(eq.warrantyExpiration).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : 0,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Garantías');
    XLSX.writeFile(wb, `reporte_garantias_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const getDaysRemaining = (warrantyDate: any) => {
    const diff = toDate(warrantyDate).getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const renderEquipmentList = (equipmentList: Equipment[], statusBadge: string, badgeColor: string) => {
    if (equipmentList.length === 0) {
      return (
        <div className="text-center py-8 text-gray-500">
          No hay equipos en esta categoría
        </div>
      );
    }

    return (
      <div className="space-y-2">
        {equipmentList.map((eq) => (
          <div key={eq.id} className="bg-white p-4 rounded-lg border hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">{eq.name}</h3>
                <div className="text-sm text-gray-500 space-y-1 mt-1">
                  <p>Empresa: {eq.company}</p>
                  <p>Tipo: {eq.type}</p>
                </div>
              </div>
              <div className="text-right space-y-2">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${badgeColor}`}>
                  {statusBadge}
                </span>
                {eq.warrantyExpiration && (
                  <div className="text-sm">
                    <p className="text-gray-500">Vence:</p>
                    <p className="font-medium">{toDate(eq.warrantyExpiration).toLocaleDateString()}</p>
                    {selectedTab !== 'expired' && (
                      <p className="text-gray-600 text-xs mt-1">
                        {getDaysRemaining(eq.warrantyExpiration)} días
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando garantías...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Reporte de Garantías</h1>
        <button
          onClick={exportToExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar a Excel
        </button>
      </div>

      {/* Estadísticas resumidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-8 h-8 text-red-600" />
            <div>
              <p className="text-sm text-red-600 font-medium">Garantías Vencidas</p>
              <p className="text-2xl font-bold text-red-700">{warranties.expired.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Calendar className="w-8 h-8 text-orange-600" />
            <div>
              <p className="text-sm text-orange-600 font-medium">Por Vencer (30 días)</p>
              <p className="text-2xl font-bold text-orange-700">{warranties.expiringSoon.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-8 h-8 text-green-600" />
            <div>
              <p className="text-sm text-green-600 font-medium">Garantías Activas</p>
              <p className="text-2xl font-bold text-green-700">{warranties.active.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b mb-4">
        <div className="flex gap-4">
          <button
            onClick={() => setSelectedTab('expiringSoon')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              selectedTab === 'expiringSoon'
                ? 'border-orange-600 text-orange-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Por Vencer ({warranties.expiringSoon.length})
          </button>
          <button
            onClick={() => setSelectedTab('expired')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              selectedTab === 'expired'
                ? 'border-red-600 text-red-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Vencidas ({warranties.expired.length})
          </button>
          <button
            onClick={() => setSelectedTab('active')}
            className={`px-4 py-2 border-b-2 font-medium transition-colors ${
              selectedTab === 'active'
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Activas ({warranties.active.length})
          </button>
        </div>
      </div>

      {/* Contenido de tabs */}
      <div>
        {selectedTab === 'expired' && renderEquipmentList(
          warranties.expired,
          'Vencida',
          'bg-red-100 text-red-800'
        )}
        {selectedTab === 'expiringSoon' && renderEquipmentList(
          warranties.expiringSoon,
          'Por Vencer',
          'bg-orange-100 text-orange-800'
        )}
        {selectedTab === 'active' && renderEquipmentList(
          warranties.active,
          'Activa',
          'bg-green-100 text-green-800'
        )}
      </div>
    </div>
  );
};
