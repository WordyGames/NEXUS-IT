import * as XLSX from 'xlsx';
import { Equipment, Ticket, Maintenance, MaintenanceStatus } from '@nexus-it/shared';

type AssignedUserNamesById = Record<string, string>;

const toDateSafe = (value: any): Date | undefined => {
  if (!value) return undefined;
  if (value instanceof Date) return value;
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  if (typeof value === 'string') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
  }
  if (typeof value === 'object') {
    if (typeof value.toDate === 'function') {
      const date = value.toDate();
      return date instanceof Date && !Number.isNaN(date.getTime()) ? date : undefined;
    }
    if (typeof value.seconds === 'number') {
      const date = new Date(value.seconds * 1000);
      return Number.isNaN(date.getTime()) ? undefined : date;
    }
  }
  return undefined;
};

const formatDateMx = (value: any): string => {
  const date = toDateSafe(value);
  if (!date) return '-';
  return date.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  });
};

const getWarrantySnapshot = (warrantyExpiration: any): {
  expirationDate: string;
  daysLeft: number | '-';
  semaphore: string;
  status: string;
} => {
  const warrantyDate = toDateSafe(warrantyExpiration);
  if (!warrantyDate) {
    return {
      expirationDate: '-',
      daysLeft: '-',
      semaphore: '⚪',
      status: 'Sin datos'
    };
  }

  const now = new Date();
  const daysLeft = Math.ceil((warrantyDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return {
      expirationDate: formatDateMx(warrantyDate),
      daysLeft,
      semaphore: '🔴',
      status: 'Vencida'
    };
  }

  if (daysLeft < 30) {
    return {
      expirationDate: formatDateMx(warrantyDate),
      daysLeft,
      semaphore: '🔴',
      status: 'Crítica (<30 días)'
    };
  }

  if (daysLeft <= 90) {
    return {
      expirationDate: formatDateMx(warrantyDate),
      daysLeft,
      semaphore: '🟡',
      status: 'Próxima (30-90 días)'
    };
  }

  return {
    expirationDate: formatDateMx(warrantyDate),
    daysLeft,
    semaphore: '🟢',
    status: 'Vigente (>90 días)'
  };
};

const applySheetTableOptions = (ws: XLSX.WorkSheet, rowCount: number, columnCount: number) => {
  if (rowCount > 0 && columnCount > 0) {
    ws['!autofilter'] = {
      ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: rowCount, c: columnCount - 1 }
      })
    };
  }

  (ws as any)['!freeze'] = { xSplit: 0, ySplit: 1 };
};

/**
 * Exporta equipos a Excel
 */
export const exportEquipmentToExcel = (
  equipment: Equipment[],
  filename = 'equipos',
  assignedUserNamesById: AssignedUserNamesById = {}
) => {
  try {
    const sortedEquipment = [...equipment].sort((a, b) => {
      const byCompany = a.company.localeCompare(b.company, 'es', { sensitivity: 'base' });
      if (byCompany !== 0) return byCompany;
      return a.name.localeCompare(b.name, 'es', { sensitivity: 'base' });
    });

    const getAssignedLabel = (eq: Equipment): string => {
      if (!eq.assignedTo) return 'Sin asignar';
      return assignedUserNamesById[eq.assignedTo] || 'Usuario no disponible';
    };

    const assignedCount = sortedEquipment.filter((eq) => Boolean(eq.assignedTo)).length;
    const unassignedCount = sortedEquipment.length - assignedCount;

    const byCompany = sortedEquipment.reduce<Record<string, number>>((acc, eq) => {
      acc[eq.company] = (acc[eq.company] || 0) + 1;
      return acc;
    }, {});

    const byStatus = sortedEquipment.reduce<Record<string, number>>((acc, eq) => {
      acc[eq.status] = (acc[eq.status] || 0) + 1;
      return acc;
    }, {});

    const warrantyStatusCount = sortedEquipment.reduce<Record<string, number>>((acc, eq) => {
      const status = getWarrantySnapshot(eq.warrantyExpiration).status;
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    const summaryData: Array<{ 'Sección': string; 'Métrica': string; 'Valor': string | number }> = [
      { 'Sección': 'General', 'Métrica': 'Total de equipos', 'Valor': sortedEquipment.length },
      { 'Sección': 'General', 'Métrica': 'Equipos asignados', 'Valor': assignedCount },
      {
        'Sección': 'General',
        'Métrica': '% de asignación',
        'Valor': sortedEquipment.length > 0
          ? `${((assignedCount / sortedEquipment.length) * 100).toFixed(1)}%`
          : '0.0%'
      },
      { 'Sección': 'General', 'Métrica': 'Equipos sin asignar', 'Valor': unassignedCount },
      { 'Sección': 'General', 'Métrica': 'Generado el', 'Valor': new Date().toLocaleString('es-MX') },
      { 'Sección': '', 'Métrica': '', 'Valor': '' }
    ];

    Object.entries(byCompany)
      .sort((a, b) => a[0].localeCompare(b[0], 'es', { sensitivity: 'base' }))
      .forEach(([company, count]) => {
        summaryData.push({ 'Sección': 'Por empresa', 'Métrica': company, 'Valor': count });
      });

    summaryData.push({ 'Sección': '', 'Métrica': '', 'Valor': '' });

    Object.entries(byStatus)
      .sort((a, b) => a[0].localeCompare(b[0], 'es', { sensitivity: 'base' }))
      .forEach(([status, count]) => {
        summaryData.push({ 'Sección': 'Por estado', 'Métrica': status, 'Valor': count });
      });

    summaryData.push({ 'Sección': '', 'Métrica': '', 'Valor': '' });

    Object.entries(warrantyStatusCount)
      .sort((a, b) => a[0].localeCompare(b[0], 'es', { sensitivity: 'base' }))
      .forEach(([warrantyStatus, count]) => {
        summaryData.push({ 'Sección': 'Garantías', 'Métrica': warrantyStatus, 'Valor': count });
      });

    // Hoja 1: Inventario (vista operativa)
    const inventoryData = sortedEquipment.map((eq) => {
      const warranty = getWarrantySnapshot(eq.warrantyExpiration);
      return {
        'Nombre': eq.name,
        'Compañía': eq.company,
        'Estado': eq.status,
        'Tipo': eq.type,
        'Asignado a': getAssignedLabel(eq),
        'Ubicación': eq.location || '-',
        'Hostname': eq.specs?.hostname || '-',
        'Serial': eq.specs?.serialNumber || '-',
        'Compra': formatDateMx(eq.purchaseDate),
        'Garantía (vence)': warranty.expirationDate,
        'Días garantía': warranty.daysLeft,
        'Semáforo garantía': warranty.semaphore,
        'Estatus garantía': warranty.status
      };
    });

    // Hoja 2: Detalle técnico (información completa)
    const technicalDetailData = sortedEquipment.map((eq) => {
      const warranty = getWarrantySnapshot(eq.warrantyExpiration);
      return {
        'ID': eq.id,
        'Nombre': eq.name,
        'Compañía': eq.company,
        'Estado': eq.status,
        'Tipo': eq.type,
        'Asignado a': getAssignedLabel(eq),
        'Ubicación': eq.location || '-',
        'CPU': eq.specs?.cpu || '-',
        'RAM': eq.specs?.ram || '-',
        'Almacenamiento': eq.specs?.storage || '-',
        'GPU': eq.specs?.gpu || '-',
        'Sistema Operativo': eq.specs?.os || '-',
        'Versión OS': eq.specs?.osVersion || '-',
        'Hostname': eq.specs?.hostname || '-',
        'Serial': eq.specs?.serialNumber || '-',
        'Modelo': eq.specs?.model || '-',
        'Fabricante': eq.specs?.manufacturer || '-',
        'IP': eq.specs?.ipAddress || '-',
        'MAC': eq.specs?.macAddress || '-',
        'Compra': formatDateMx(eq.purchaseDate),
        'Garantía (vence)': warranty.expirationDate,
        'Días garantía': warranty.daysLeft,
        'Semáforo garantía': warranty.semaphore,
        'Estatus garantía': warranty.status,
        'Fecha de creación': formatDateMx(eq.createdAt),
        'Notas': eq.notes || '-'
      };
    });

    // Crear workbook y worksheets
    const wb = XLSX.utils.book_new();
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    const wsInventory = XLSX.utils.json_to_sheet(inventoryData);
    const wsTechnicalDetail = XLSX.utils.json_to_sheet(technicalDetailData);

    wsSummary['!cols'] = [
      { wch: 18 }, // Sección
      { wch: 36 }, // Métrica
      { wch: 20 }  // Valor
    ];

    // Anchos de columnas para mejor lectura
    wsInventory['!cols'] = [
      { wch: 28 }, // Nombre
      { wch: 34 }, // Compañía
      { wch: 12 }, // Estado
      { wch: 14 }, // Tipo
      { wch: 26 }, // Asignado a
      { wch: 24 }, // Ubicación
      { wch: 22 }, // Hostname
      { wch: 24 }, // Serial
      { wch: 16 }, // Compra
      { wch: 18 }, // Garantía (vence)
      { wch: 14 }, // Días garantía
      { wch: 18 }, // Semáforo
      { wch: 24 }  // Estatus garantía
    ];

    wsTechnicalDetail['!cols'] = [
      { wch: 25 }, // ID
      { wch: 28 }, // Nombre
      { wch: 34 }, // Compañía
      { wch: 12 }, // Estado
      { wch: 14 }, // Tipo
      { wch: 26 }, // Asignado a
      { wch: 24 }, // Ubicación
      { wch: 36 }, // CPU
      { wch: 16 }, // RAM
      { wch: 20 }, // Almacenamiento
      { wch: 22 }, // GPU
      { wch: 28 }, // Sistema Operativo
      { wch: 20 }, // Versión OS
      { wch: 22 }, // Hostname
      { wch: 24 }, // Serial
      { wch: 24 }, // Modelo
      { wch: 22 }, // Fabricante
      { wch: 18 }, // IP
      { wch: 20 }, // MAC
      { wch: 16 }, // Compra
      { wch: 18 }, // Garantía (vence)
      { wch: 14 }, // Días garantía
      { wch: 18 }, // Semáforo
      { wch: 24 }, // Estatus garantía
      { wch: 18 }, // Fecha creación
      { wch: 44 }  // Notas
    ];

    applySheetTableOptions(wsSummary, summaryData.length, Object.keys(summaryData[0] || {}).length);
    applySheetTableOptions(wsInventory, inventoryData.length, Object.keys(inventoryData[0] || {}).length);
    applySheetTableOptions(wsTechnicalDetail, technicalDetailData.length, Object.keys(technicalDetailData[0] || {}).length);

    XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumen');
    XLSX.utils.book_append_sheet(wb, wsInventory, 'Inventario');
    XLSX.utils.book_append_sheet(wb, wsTechnicalDetail, 'Detalle técnico');

    // Descargar archivo
    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw error;
  }
};

/**
 * Exporta tickets a Excel
 */
export const exportTicketsToExcel = (tickets: Ticket[], filename = 'tickets') => {
  try {
    const data = tickets.map(ticket => ({
      'Número': ticket.ticketNumber,
      'Título': ticket.title,
      'Compañía': ticket.company,
      'Categoría': ticket.category,
      'Prioridad': ticket.priority,
      'Estado': ticket.status,
      'Creado por': ticket.createdByName,
      'Asignado a': ticket.assignedToName || 'Sin asignar',
      'Descripción': ticket.description,
      'Equipo': ticket.equipment || '-',
      'Comentarios': ticket.comments?.length || 0,
      'Fecha de Creación': ticket.createdAt ? new Date(ticket.createdAt as any).toLocaleDateString('es-MX') : '-',
      'Fecha de Actualización': ticket.updatedAt ? new Date(ticket.updatedAt as any).toLocaleDateString('es-MX') : '-',
      'Fecha de Resolución': ticket.resolvedAt ? new Date(ticket.resolvedAt as any).toLocaleDateString('es-MX') : '-',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    const colWidths = [
      { wch: 15 }, // Número
      { wch: 40 }, // Título
      { wch: 35 }, // Compañía
      { wch: 15 }, // Categoría
      { wch: 12 }, // Prioridad
      { wch: 15 }, // Estado
      { wch: 25 }, // Creado por
      { wch: 25 }, // Asignado a
      { wch: 50 }, // Descripción
      { wch: 20 }, // Equipo
      { wch: 12 }, // Comentarios
      { wch: 18 }, // Fecha creación
      { wch: 18 }, // Fecha actualización
      { wch: 18 }, // Fecha resolución
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Tickets');

    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw error;
  }
};

/**
 * Exporta mantenimientos a Excel
 */
export const exportMaintenancesToExcel = (maintenances: Maintenance[], filename = 'mantenimientos') => {
  try {
    const data = maintenances.map(m => ({
      'ID': m.id,
      'Equipo': m.equipmentName,
      'Compañía': m.company,
      'Tipo': m.type,
      'Estado': m.status,
      'Título': m.title,
      'Descripción': m.description,
      'Fecha Programada': m.scheduledDate ? new Date(m.scheduledDate as any).toLocaleDateString('es-MX') : '-',
      'Fecha Completada': m.completedDate ? new Date(m.completedDate as any).toLocaleDateString('es-MX') : '-',
      'Próximo Mantenimiento': m.nextMaintenanceDate ? new Date(m.nextMaintenanceDate as any).toLocaleDateString('es-MX') : '-',
      'Frecuencia': m.frequency || 'Una vez',
      'Asignado a': m.assignedToName || 'Sin asignar',
      'Tareas Totales': m.tasks.length,
      'Tareas Completadas': m.tasks.filter(t => t.completed).length,
      'Costo': m.cost ? `$${m.cost.toFixed(2)}` : '-',
      'Notas': m.notes || '-',
      'Creado por': m.createdByName,
      'Fecha de Creación': m.createdAt ? new Date(m.createdAt as any).toLocaleDateString('es-MX') : '-',
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    const colWidths = [
      { wch: 25 }, // ID
      { wch: 30 }, // Equipo
      { wch: 35 }, // Compañía
      { wch: 15 }, // Tipo
      { wch: 15 }, // Estado
      { wch: 40 }, // Título
      { wch: 50 }, // Descripción
      { wch: 18 }, // Programada
      { wch: 18 }, // Completada
      { wch: 18 }, // Próximo
      { wch: 15 }, // Frecuencia
      { wch: 25 }, // Asignado
      { wch: 12 }, // Total tareas
      { wch: 12 }, // Completadas
      { wch: 12 }, // Costo
      { wch: 40 }, // Notas
      { wch: 25 }, // Creado por
      { wch: 18 }, // Fecha
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Mantenimientos');

    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `${filename}_${timestamp}.xlsx`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw error;
  }
};

/**
 * Exporta reporte completo (equipos + tickets + mantenimientos)
 */
export const exportCompleteReport = (
  equipment: Equipment[], 
  tickets: Ticket[], 
  maintenances: Maintenance[]
) => {
  try {
    const wb = XLSX.utils.book_new();

    // Sheet de Resumen
    const summary = [
      { 'Categoría': 'Total Equipos', 'Cantidad': equipment.length },
      { 'Categoría': 'Equipos Activos', 'Cantidad': equipment.filter(e => e.status === 'active').length },
      { 'Categoría': 'Equipos en Mantenimiento', 'Cantidad': equipment.filter(e => e.status === 'maintenance').length },
      { 'Categoría': 'Total Tickets', 'Cantidad': tickets.length },
      { 'Categoría': 'Tickets Abiertos', 'Cantidad': tickets.filter(t => t.status === 'open').length },
      { 'Categoría': 'Tickets Resueltos', 'Cantidad': tickets.filter(t => t.status === 'resolved').length },
      { 'Categoría': 'Total Mantenimientos', 'Cantidad': maintenances.length },
      { 'Categoría': 'Mantenimientos Programados', 'Cantidad': maintenances.filter(m => m.status === MaintenanceStatus.PROGRAMADO).length },
      { 'Categoría': 'Mantenimientos Completados', 'Cantidad': maintenances.filter(m => m.status === MaintenanceStatus.COMPLETADO).length },
    ];
    const wsResumen = XLSX.utils.json_to_sheet(summary);
    wsResumen['!cols'] = [{ wch: 30 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, wsResumen, 'Resumen');

    // Sheet de Equipos
    const equipData = equipment.map(eq => ({
      'Nombre': eq.name,
      'Compañía': eq.company,
      'Tipo': eq.type,
      'Estado': eq.status,
      'CPU': eq.specs?.cpu || '-',
      'RAM': eq.specs?.ram || '-',
      'Ubicación': eq.location,
    }));
    const wsEquip = XLSX.utils.json_to_sheet(equipData);
    XLSX.utils.book_append_sheet(wb, wsEquip, 'Equipos');

    // Sheet de Tickets
    const ticketData = tickets.map(t => ({
      'Número': t.ticketNumber,
      'Título': t.title,
      'Estado': t.status,
      'Prioridad': t.priority,
      'Creado por': t.createdByName,
    }));
    const wsTickets = XLSX.utils.json_to_sheet(ticketData);
    XLSX.utils.book_append_sheet(wb, wsTickets, 'Tickets');

    // Sheet de Mantenimientos
    const maintData = maintenances.map(m => ({
      'Equipo': m.equipmentName,
      'Tipo': m.type,
      'Estado': m.status,
      'Fecha': m.scheduledDate ? new Date(m.scheduledDate as any).toLocaleDateString('es-MX') : '-',
    }));
    const wsMaint = XLSX.utils.json_to_sheet(maintData);
    XLSX.utils.book_append_sheet(wb, wsMaint, 'Mantenimientos');

    const timestamp = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `reporte_completo_${timestamp}.xlsx`);
  } catch (error) {
    console.error('Error exporting complete report:', error);
    throw error;
  }
};
