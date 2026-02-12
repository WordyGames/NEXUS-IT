import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Equipment as EquipmentType,
  Company,
  getEquipment,
  createEquipment,
  updateEquipment,
  deleteEquipment,
  EquipmentFilters,
  getUsers,
  User
} from '@nexus-it/shared';
import EquipmentCard from '../components/EquipmentCard';
import EquipmentForm from '../components/EquipmentForm';
import EquipmentQRCode from '../components/EquipmentQRCode';
import { Download } from 'lucide-react';
import { exportEquipmentToExcel } from '../utils/exportToExcel';
import { generateCartaResponsivaPDF } from '../utils/cartaResponsivaPDF';

const Equipment = () => {
  const { userData, isAdmin } = useAuth();
  const [equipment, setEquipment] = useState<EquipmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentType | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedEquipmentForQR, setSelectedEquipmentForQR] = useState<EquipmentType | null>(null);
  const [filters, setFilters] = useState<EquipmentFilters>({});

  useEffect(() => {
    loadEquipment();
  }, [filters]);

  const loadEquipment = async () => {
    try {
      setLoading(true);
      const data = await getEquipment(filters);
      setEquipment(data);
    } catch (error) {
      console.error('Error loading equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingEquipment(null);
    setShowForm(true);
  };

  const handleEdit = (eq: EquipmentType) => {
    setEditingEquipment(eq);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este equipo?')) return;

    try {
      await deleteEquipment(id);
      await loadEquipment();
    } catch (error) {
      console.error('Error deleting equipment:', error);
      alert('Error al eliminar el equipo');
    }
  };

  const handleShowQR = (eq: EquipmentType) => {
    setSelectedEquipmentForQR(eq);
    setShowQRModal(true);
  };

  const handleGenerateCarta = async (eq: EquipmentType) => {
    try {
      if (!eq.assignedTo) {
        alert('Este equipo no tiene un usuario asignado. Asigna un usuario primero.');
        return;
      }

      // Cargar información del usuario asignado
      const users = await getUsers();
      const assignedUser = users.find(u => u.id === eq.assignedTo);

      if (!assignedUser) {
        alert('No se encontró información del usuario asignado.');
        return;
      }

      // Generar PDF
      await generateCartaResponsivaPDF({
        employee: assignedUser,
        equipment: eq,
        generatedBy: userData?.name || 'Sistema',
        notes: eq.notes
      });

    } catch (error) {
      console.error('Error generating carta responsiva:', error);
      alert('Error al generar la carta responsiva');
    }
  };

  const handleSubmit = async (data: any) => {
    try {
      if (editingEquipment) {
        await updateEquipment(editingEquipment.id, data);
      } else {
        await createEquipment({
          ...data,
          createdBy: userData?.id || ''
        });
      }
      setShowForm(false);
      setEditingEquipment(null);
      await loadEquipment();
    } catch (error) {
      console.error('Error saving equipment:', error);
      alert('Error al guardar el equipo');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-gray-600 dark:text-gray-400">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            Equipos
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Gestión de equipos informáticos
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => exportEquipmentToExcel(equipment, 'inventario-equipos')}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center gap-2"
            disabled={equipment.length === 0}
          >
            <Download size={18} />
            Exportar Excel
          </button>
          {isAdmin && (
            <button
              onClick={handleCreate}
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              + Nuevo Equipo
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white dark:bg-gray-800 rounded-lg p-4 shadow">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Empresa
            </label>
            <select
              aria-label="Filtrar por empresa"
              value={filters.company || ''}
              onChange={(e) => setFilters({ ...filters, company: e.target.value as Company })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="">Todas</option>
              {Object.values(Company).map((company) => (
                <option key={company} value={company}>
                  {company}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Estado
            </label>
            <select              aria-label="Filtrar por estado"              value={filters.status || ''}
              onChange={(e) => setFilters({ ...filters, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="">Todos</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="retired">Retirado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Tipo
            </label>
            <select              aria-label="Filtrar por tipo"              value={filters.type || ''}
              onChange={(e) => setFilters({ ...filters, type: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="">Todos</option>
              <option value="desktop">Desktop</option>
              <option value="laptop">Laptop</option>
              <option value="server">Servidor</option>
              <option value="printer">Impresora</option>
              <option value="router">Router</option>
              <option value="switch">Switch</option>
              <option value="other">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Buscar
            </label>
            <input
              type="text"
              value={filters.search || ''}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              placeholder="Nombre, hostname, serial..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Lista de Equipos */}
      {equipment.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow text-center">
          <p className="text-gray-600 dark:text-gray-400">
            No se encontraron equipos
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {equipment.map((eq) => (
            <EquipmentCard
              key={eq.id}
              equipment={eq}
              onEdit={() => handleEdit(eq)}
              onDelete={() => handleDelete(eq.id)}
              onShowQR={() => handleShowQR(eq)}
              onGenerateCarta={() => handleGenerateCarta(eq)}
              canEdit={isAdmin}
            />
          ))}
        </div>
      )}

      {/* Formulario Modal */}
      {showForm && (
        <EquipmentForm
          equipment={editingEquipment}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingEquipment(null);
          }}
        />
      )}

      {/* Modal de QR */}
      {showQRModal && selectedEquipmentForQR && (
        <EquipmentQRCode
          equipment={selectedEquipmentForQR}
          onClose={() => {
            setShowQRModal(false);
            setSelectedEquipmentForQR(null);
          }}
        />
      )}
    </div>
  );
};

export default Equipment;
