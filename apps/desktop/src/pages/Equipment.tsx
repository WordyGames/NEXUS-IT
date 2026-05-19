import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Equipment as EquipmentType,
  Company,
  UserPermission,
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
import { Download, Plus, Monitor, ChevronLeft, ChevronRight } from 'lucide-react';
import { exportEquipmentToExcel } from '../utils/exportToExcel';
import { generateCartaResponsivaPDF } from '../utils/cartaResponsivaPDF';
import { useUiFeedback } from '../contexts/UiFeedbackContext';
import { Spinner, Card, Button, EmptyState } from '../components/ui';

const PAGE_SIZE = 24;

const Equipment = () => {
  const { userData, hasPermission } = useAuth();
  const { showToast, confirm } = useUiFeedback();
  const canManageEquipment = hasPermission(UserPermission.EQUIPMENT_MANAGE);
  const [equipment, setEquipment] = useState<EquipmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentType | null>(null);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedEquipmentForQR, setSelectedEquipmentForQR] = useState<EquipmentType | null>(null);
  const [filters, setFilters] = useState<EquipmentFilters>({});
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const isFirstLoadRef = useRef(true);

  // Debounce search input → filters.search (300 ms)
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => ({ ...f, search: searchInput }));
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  const usersById = useMemo(() => {
    return users.reduce<Record<string, User>>((acc, user) => {
      acc[user.id] = user;
      return acc;
    }, {});
  }, [users]);

  const assignedUserNamesById = useMemo(() => {
    return users.reduce<Record<string, string>>((acc, user) => {
      acc[user.id] = user.name;
      return acc;
    }, {});
  }, [users]);

  const filteredEquipment = useMemo(() => {
    const searchValue = (filters.search || '').trim().toLowerCase();
    if (!searchValue) return equipment;

    return equipment.filter((eq) => {
      const assignedUser = eq.assignedTo ? usersById[eq.assignedTo] : undefined;
      const searchableValues = [
        eq.name,
        eq.location,
        eq.type,
        eq.company,
        eq.specs?.hostname,
        eq.specs?.serialNumber,
        eq.specs?.model,
        eq.specs?.manufacturer,
        assignedUser?.name,
        assignedUser?.username,
        assignedUser?.department,
        assignedUser?.position
      ];

      return searchableValues.some((value) =>
        (value || '').toString().toLowerCase().includes(searchValue)
      );
    });
  }, [equipment, filters.search, usersById]);

  const totalPages = Math.max(1, Math.ceil(filteredEquipment.length / PAGE_SIZE));
  const paginatedEquipment = filteredEquipment.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const getAssignedUserLabel = (eq: EquipmentType): string => {
    if (!eq.assignedTo) return 'Sin asignar';
    return usersById[eq.assignedTo]?.name || 'Usuario no disponible';
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  useEffect(() => {
    void loadEquipment(isFirstLoadRef.current);
  }, [filters.company, filters.type, filters.status, filters.assignedTo]);

  const loadUsers = async () => {
    try {
      const data = await getUsers();
      setUsers(data);
    } catch (error) {
      console.error('Error loading users for equipment search:', error);
    }
  };

  const loadEquipment = async (blocking = false) => {
    try {
      if (blocking) {
        setLoading(true);
      } else {
        setIsRefreshing(true);
      }

      const { search: _search, ...dbFilters } = filters;
      const data = await getEquipment(dbFilters);
      setEquipment(data);
    } catch (error) {
      console.error('Error loading equipment:', error);
    } finally {
      if (blocking) {
        setLoading(false);
      } else {
        setIsRefreshing(false);
      }
      isFirstLoadRef.current = false;
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
    const accepted = await confirm({
      title: 'Eliminar equipo',
      message: '¿Estas seguro de eliminar este equipo? Esta accion no se puede deshacer.',
      confirmText: 'Eliminar',
      cancelText: 'Cancelar',
      intent: 'danger'
    });
    if (!accepted) return;

    try {
      await deleteEquipment(id);
      await loadEquipment();
      showToast({
        type: 'success',
        title: 'Equipo eliminado',
        message: 'El equipo se elimino correctamente'
      });
    } catch (error) {
      console.error('Error deleting equipment:', error);
      showToast({
        type: 'error',
        title: 'Error al eliminar',
        message: 'No se pudo eliminar el equipo'
      });
    }
  };

  const handleShowQR = (eq: EquipmentType) => {
    setSelectedEquipmentForQR(eq);
    setShowQRModal(true);
  };

  const handleGenerateCarta = async (eq: EquipmentType) => {
    try {
      if (!eq.assignedTo) {
        showToast({
          type: 'warning',
          title: 'Equipo sin asignar',
          message: 'Asigna un usuario al equipo antes de generar la carta responsiva'
        });
        return;
      }

      // Cargar información del usuario asignado
      const assignedUser = users.find(u => u.id === eq.assignedTo);

      if (!assignedUser) {
        showToast({
          type: 'error',
          title: 'Usuario no encontrado',
          message: 'No se encontro informacion del usuario asignado'
        });
        return;
      }

      // Generar PDF
      await generateCartaResponsivaPDF({
        employee: assignedUser,
        equipment: eq,
        generatedBy: userData?.name || 'Sistema',
        notes: eq.notes
      });
      showToast({
        type: 'success',
        title: 'Carta responsiva generada',
        message: 'El PDF se genero correctamente'
      });

    } catch (error) {
      console.error('Error generating carta responsiva:', error);
      showToast({
        type: 'error',
        title: 'Error al generar carta',
        message: 'No se pudo generar la carta responsiva'
      });
    }
  };

  const handleSubmit = async (data: any): Promise<string> => {
    try {
      if (editingEquipment) {
        const { id: _ignoredId, ...updateData } = data;
        await updateEquipment(editingEquipment.id, updateData);
        
        setShowForm(false);
        setEditingEquipment(null);
        await loadEquipment(false);
        showToast({
          type: 'success',
          title: 'Equipo actualizado',
          message: 'Los cambios se guardaron correctamente'
        });
        return editingEquipment.id;
      } else {
        const createdId = await createEquipment({
          ...data,
          createdBy: userData?.id || ''
        });

        setShowForm(false);
        setEditingEquipment(null);
        await loadEquipment(false);
        showToast({
          type: 'success',
          title: 'Equipo creado',
          message: 'El equipo se guardo correctamente'
        });
        return createdId;
      }
    } catch (error) {
      console.error('Error saving equipment:', error);
      showToast({
        type: 'error',
        title: 'Error al guardar equipo',
        message: 'No se pudo guardar el equipo'
      });
      throw error;
    }
  };

  if (loading) return <Spinner size="xl" label="Cargando equipos..." className="h-64 justify-center" />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-1">Equipos</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {filteredEquipment.length} equipo{filteredEquipment.length !== 1 ? 's' : ''}
            {isRefreshing && <span className="ml-2 text-blue-500 dark:text-blue-400">· Actualizando...</span>}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => exportEquipmentToExcel(filteredEquipment, 'inventario-equipos', assignedUserNamesById)}
            disabled={filteredEquipment.length === 0}
            iconLeft={<Download size={15} />}
          >
            Exportar
          </Button>
          {canManageEquipment && (
            <Button variant="primary" size="sm" onClick={handleCreate} iconLeft={<Plus size={15} />}>
              Nuevo Equipo
            </Button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <Card padding="sm">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Empresa</label>
            <select
              aria-label="Filtrar por empresa"
              value={filters.company || ''}
              onChange={(e) => { setFilters({ ...filters, company: e.target.value as Company }); setPage(1); }}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <option value="">Todas</option>
              {Object.values(Company).map((company) => (
                <option key={company} value={company}>{company}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Estado</label>
            <select
              aria-label="Filtrar por estado"
              value={filters.status || ''}
              onChange={(e) => { setFilters({ ...filters, status: e.target.value as any }); setPage(1); }}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <option value="">Todos</option>
              <option value="active">Activo</option>
              <option value="inactive">Inactivo</option>
              <option value="maintenance">Mantenimiento</option>
              <option value="retired">Retirado</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Tipo</label>
            <select
              aria-label="Filtrar por tipo"
              value={filters.type || ''}
              onChange={(e) => { setFilters({ ...filters, type: e.target.value as any }); setPage(1); }}
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            >
              <option value="">Todos</option>
              <option value="desktop">Desktop</option>
              <option value="laptop">Laptop</option>
              <option value="phone">Teléfono</option>
              <option value="tablet">Tablet</option>
              <option value="server">Servidor</option>
              <option value="printer">Impresora</option>
              <option value="router">Router</option>
              <option value="switch">Switch</option>
              <option value="other">Otro</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">Buscar</label>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Nombre, hostname, serial..."
              className="w-full px-3 py-2 border border-slate-200 dark:border-slate-600 rounded-lg text-sm text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors"
            />
          </div>
        </div>
      </Card>

      {/* Lista de Equipos */}
      {filteredEquipment.length === 0 ? (
        <EmptyState
          icon={<Monitor size={28} />}
          title="Sin equipos"
          description="No se encontraron equipos con los filtros actuales."
          action={canManageEquipment ? { label: 'Nuevo Equipo', onClick: handleCreate } : undefined}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedEquipment.map((eq) => (
              <EquipmentCard
                key={eq.id}
                equipment={eq}
                assignedToLabel={getAssignedUserLabel(eq)}
                onEdit={() => handleEdit(eq)}
                onDelete={() => handleDelete(eq.id)}
                onShowQR={() => handleShowQR(eq)}
                onGenerateCarta={() => handleGenerateCarta(eq)}
                canEdit={canManageEquipment}
              />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredEquipment.length)} de {filteredEquipment.length} equipos
              </span>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Página anterior" onClick={() => setPage((p) => p - 1)} disabled={page === 1} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 transition-colors border border-slate-200 dark:border-slate-700">
                  <ChevronLeft size={15} />
                </button>
                <span className="text-sm text-slate-600 dark:text-slate-300 px-3">{page} / {totalPages}</span>
                <button type="button" aria-label="Página siguiente" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages} className="p-2 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 disabled:opacity-30 transition-colors border border-slate-200 dark:border-slate-700">
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </>
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
