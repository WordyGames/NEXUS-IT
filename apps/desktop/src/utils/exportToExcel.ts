import * as XLSX from 'xlsx';
import { Equipment, Ticket, Maintenance, MaintenanceStatus } from '@nexus-it/shared';

type AssignedUserNamesById = Record<string, string>;

/**
 * Exporta equipos a Excel
 */
export const exportEquipmentToExcel = (
  equipment: Equipment[],
  filename = 'equipos',
  assignedUserNamesById: AssignedUserNamesById = {}
) => {
  try {
    // Preparar datos para Excel
    const data = equipment.map(eq => ({
      'ID': eq.id,
      'Nombre': eq.name,
      'Compañía': eq.company,
      'Tipo': eq.type,
      'Estado': eq.status,
      'CPU': eq.specs?.cpu || '-',
      'RAM': eq.specs?.ram || '-',
      'Almacenamiento': eq.specs?.storage || '-',
      'GPU': eq.specs?.gpu || '-',
      'Sistema Operativo': eq.specs?.os || '-',
      'Hostname': eq.specs?.hostname || '-',
      'Serial': eq.specs?.serialNumber || '-',
      'Ubicación': eq.location,
      'Asignado a': eq.assignedTo
        ? assignedUserNamesById[eq.assignedTo] || 'Usuario no disponible'
        : 'Sin asignar',
      'Notas': eq.notes || '-',
      'Fecha de Creación': eq.createdAt ? new Date(eq.createdAt as any).toLocaleDateString('es-MX') : '-',
    }));

    // Crear workbook y worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);

    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 25 }, // ID
      { wch: 30 }, // Nombre
      { wch: 35 }, // Compañía
      { wch: 15 }, // Tipo
      { wch: 12 }, // Estado
      { wch: 35 }, // CPU
      { wch: 15 }, // RAM
      { wch: 20 }, // Almacenamiento
      { wch: 25 }, // GPU
      { wch: 25 }, // SO
      { wch: 20 }, // Hostname
      { wch: 25 }, // Serial
      { wch: 25 }, // Ubicación
      { wch: 20 }, // Asignado a
      { wch: 40 }, // Notas
      { wch: 18 }, // Fecha
    ];
    ws['!cols'] = colWidths;

    // Agregar worksheet al workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Equipos');

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
