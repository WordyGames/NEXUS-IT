import React, { useRef } from 'react';
import { X, Calendar, AlertTriangle, CheckCircle2, User, FileText, DollarSign, Paperclip, Clock, Download } from 'lucide-react';
import { Maintenance, MaintenanceStatus } from '@nexus-it/shared';
import jsPDF from 'jspdf';

interface MaintenanceDetailProps {
  maintenance: Maintenance;
  onClose: () => void;
}

const MaintenanceDetail: React.FC<MaintenanceDetailProps> = ({
  maintenance,
  onClose,
}) => {
  const contentRef = useRef<HTMLDivElement>(null);

  const sanitizePdfText = (value: string) => {
    if (!value) return '';

    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // quita acentos combinados
      .replace(/[\u2018\u2019]/g, "'") // comillas curvas
      .replace(/[\u201C\u201D]/g, '"')
      .replace(/[\u2013\u2014]/g, '-') // guiones largos
      .replace(/[\u2026]/g, '...')
      .replace(/[^\x20-\x7E\xA0-\xFF\n\r\t]/g, ''); // elimina símbolos no soportados
  };

  const formatDate = (date: any) => {
    if (!date) return '-';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('es-MX', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDateOnly = (date: any) => {
    if (!date) return '-';
    const d = date.toDate ? date.toDate() : new Date(date);
    return d.toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getFrequencyLabel = (frequency?: string) => {
    if (!frequency) return '-';

    const map: Record<string, string> = {
      weekly: 'Semanal',
      monthly: 'Mensual',
      quarterly: 'Trimestral',
      semiannual: 'Semestral',
      annual: 'Anual'
    };

    return map[frequency] || frequency;
  };

  const handleDownloadPDF = async () => {
    try {
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      let yPosition = 15;

      const darkGray = [50, 50, 50];
      const primaryColor = [30, 120, 200];

      // Header
      pdf.setTextColor(...darkGray);
      pdf.setFontSize(18);
      pdf.setFont(undefined, 'bold');
      pdf.text('REPORTE DE MANTENIMIENTO', pageWidth / 2, yPosition, { align: 'center' });

      yPosition += 8;
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      pdf.text(`ID: ${maintenance.id}`, pageWidth / 2, yPosition, { align: 'center' });

      yPosition += 15;

      // Función auxiliar para secciones
      const addSection = (title: string) => {
        pdf.setFillColor(...primaryColor);
        pdf.rect(10, yPosition, pageWidth - 20, 8, 'F');
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(11);
        pdf.setFont(undefined, 'bold');
        pdf.text(sanitizePdfText(title), 15, yPosition + 6);
        yPosition += 12;
      };

      const addField = (label: string, value: string) => {
        pdf.setTextColor(...darkGray);
        pdf.setFontSize(9);
        pdf.setFont(undefined, 'bold');
        pdf.text(sanitizePdfText(label), 15, yPosition);
        pdf.setFont(undefined, 'normal');
        const valueWidth = pageWidth - 80;
        const wrappedValue = pdf.splitTextToSize(sanitizePdfText(value), valueWidth);
        pdf.text(wrappedValue, 50, yPosition);
        yPosition += Math.max(6, wrappedValue.length * 5);
      };

      // Sección: Información General
      addSection('INFORMACIÓN GENERAL');
      addField('Título:', maintenance.title);
      addField('Tipo:', maintenance.type.toUpperCase());
      addField('Estado:', maintenance.status);
      addField('Empresa:', maintenance.company);
      addField('Equipo:', maintenance.equipmentName);
      yPosition += 5;

      // Sección: Descripción
      addSection('DESCRIPCIÓN');
      pdf.setTextColor(...darkGray);
      pdf.setFontSize(8);
      pdf.setFont(undefined, 'normal');
      const descLines = pdf.splitTextToSize(maintenance.description || 'Sin descripción', pageWidth - 30);
      pdf.text(descLines, 15, yPosition);
      yPosition += descLines.length * 4 + 10;

      // Sección: Fechas
      addSection('FECHAS Y FRECUENCIA');
      addField('Fecha Programada:', formatDateOnly(maintenance.scheduledDate));
      if (maintenance.frequency) {
        addField('Frecuencia:', getFrequencyLabel(maintenance.frequency));
      }
      if (maintenance.nextMaintenanceDate) {
        addField('Próximo Mantenimiento:', formatDateOnly(maintenance.nextMaintenanceDate));
      }
      yPosition += 5;

      // Sección: Personal
      addSection('ASIGNACIÓN');
      addField('Asignado a:', maintenance.assignedToName || 'Sin asignar');
      addField('Creado por:', maintenance.createdByName);
      if (maintenance.notificationEmail) {
        addField('Email de Notificación:', maintenance.notificationEmail);
      }
      yPosition += 5;

      // Sección: Tareas
      if (maintenance.tasks && maintenance.tasks.length > 0) {
        addSection('TAREAS A REALIZAR');
        pdf.setTextColor(...darkGray);
        pdf.setFontSize(8);
        maintenance.tasks.forEach((task) => {
          const symbol = task.completed ? '[x]' : '[ ]';
          pdf.setFont(undefined, 'normal');
          const taskText = sanitizePdfText(`${symbol} ${task.description}`);
          const taskLines = pdf.splitTextToSize(taskText, pageWidth - 30);
          pdf.text(taskLines, 15, yPosition);
          yPosition += taskLines.length * 4;
          if (task.completed && task.completedBy) {
            pdf.setTextColor(120, 120, 120);
            pdf.setFont(undefined, 'italic');
            pdf.text(sanitizePdfText(`    Completada por ${task.completedBy}`), 15, yPosition);
            yPosition += 4;
            pdf.setTextColor(...darkGray);
          }
        });
        yPosition += 5;
      }

      // Sección: Notas
      if (maintenance.notes) {
        addSection('NOTAS ADICIONALES');
        pdf.setTextColor(...darkGray);
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'normal');
        const noteLines = pdf.splitTextToSize(sanitizePdfText(maintenance.notes), pageWidth - 30);
        pdf.text(noteLines, 15, yPosition);
        yPosition += noteLines.length * 4 + 5;
      }

      // Sección: Costo
      if (maintenance.cost !== undefined && maintenance.cost !== null && maintenance.cost > 0) {
        addSection('COSTO');
        pdf.setTextColor(...darkGray);
        pdf.setFontSize(11);
        pdf.setFont(undefined, 'bold');
        pdf.text(`$${maintenance.cost.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 15, yPosition);
        yPosition += 10;
      }

      // Footer
      pdf.setTextColor(150, 150, 150);
      pdf.setFontSize(7);
      pdf.setFont(undefined, 'normal');
      pdf.text(sanitizePdfText('Este documento fue generado automaticamente por NEXUS IT'), pageWidth / 2, pageHeight - 10, { align: 'center' });
      pdf.text(sanitizePdfText(`Generado: ${formatDate(new Date())}`), pageWidth / 2, pageHeight - 5, { align: 'center' });

      // Descargar
      const fileName = `mantenimiento-${maintenance.id}-${Date.now()}.pdf`;
      pdf.save(fileName);
    } catch (error) {
      console.error('Error generando PDF:', error);
      alert('Error al generar PDF');
    }
  };

  const getStatusColor = (status: MaintenanceStatus) => {
    const colors = {
      [MaintenanceStatus.PROGRAMADO]: 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 border border-blue-300 dark:border-blue-700',
      [MaintenanceStatus.EN_PROGRESO]: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-200 border border-yellow-300 dark:border-yellow-700',
      [MaintenanceStatus.COMPLETADO]: 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-200 border border-green-300 dark:border-green-700',
      [MaintenanceStatus.CANCELADO]: 'bg-gray-100 dark:bg-gray-900/30 text-gray-800 dark:text-gray-200 border border-gray-300 dark:border-gray-700',
      [MaintenanceStatus.ATRASADO]: 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 border border-red-300 dark:border-red-700',
    };
    return colors[status] || colors[MaintenanceStatus.PROGRAMADO];
  };

  const getTypeIcon = (type: string) => {
    const icons: Record<string, string> = {
      preventivo: '🛡️',
      correctivo: '🔧',
      actualizacion: '⬆️',
      inspeccion: '🔍',
    };
    return icons[type.toLowerCase()] || '🛠️';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-3xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20">
          <div className="flex items-center gap-3">
            <div className="text-3xl">{getTypeIcon(maintenance.type)}</div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">
                {maintenance.title}
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                ID: {maintenance.id}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div ref={contentRef} className="p-6 space-y-6">
          {/* Estado y Tipo */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Estado</label>
              <div className={`mt-2 px-3 py-2 rounded-lg font-medium text-sm flex items-center gap-2 w-fit ${getStatusColor(maintenance.status)}`}>
                {maintenance.status === MaintenanceStatus.COMPLETADO && <CheckCircle2 size={16} />}
                {maintenance.status === MaintenanceStatus.ATRASADO && <AlertTriangle size={16} />}
                {maintenance.status === MaintenanceStatus.EN_PROGRESO && <Clock size={16} />}
                <span className="capitalize">{maintenance.status}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Tipo</label>
              <p className="mt-2 text-sm text-gray-900 dark:text-white font-medium capitalize">{maintenance.type}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Empresa</label>
              <p className="mt-2 text-sm text-gray-900 dark:text-white font-medium">{maintenance.company}</p>
            </div>
          </div>

          {/* Equipo e Información Principal */}
          <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Equipo</label>
              <p className="text-gray-900 dark:text-white font-medium">{maintenance.equipmentName}</p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">Descripción</label>
              <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{maintenance.description || 'Sin descripción'}</p>
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <Calendar className="text-blue-600 mt-1 flex-shrink-0" size={20} />
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Fecha Programada</label>
                <p className="mt-1 text-gray-900 dark:text-white font-medium">{formatDate(maintenance.scheduledDate)}</p>
              </div>
            </div>
            {maintenance.completedDate && (
              <div className="flex items-start gap-3">
                <CheckCircle2 className="text-green-600 mt-1 flex-shrink-0" size={20} />
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Fecha Completada</label>
                  <p className="mt-1 text-gray-900 dark:text-white font-medium">{formatDate(maintenance.completedDate)}</p>
                </div>
              </div>
            )}
            {maintenance.frequency && (
              <div className="flex items-start gap-3">
                <Clock className="text-purple-600 mt-1 flex-shrink-0" size={20} />
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Frecuencia</label>
                  <p className="mt-1 text-gray-900 dark:text-white font-medium">{getFrequencyLabel(maintenance.frequency)}</p>
                </div>
              </div>
            )}
            {maintenance.nextMaintenanceDate && (
              <div className="flex items-start gap-3">
                <Calendar className="text-orange-600 mt-1 flex-shrink-0" size={20} />
                <div>
                  <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Próx. Mantenimiento</label>
                  <p className="mt-1 text-gray-900 dark:text-white font-medium">{formatDate(maintenance.nextMaintenanceDate)}</p>
                </div>
              </div>
            )}
          </div>

          {/* Personal */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <User className="text-blue-600 mt-1 flex-shrink-0" size={20} />
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Asignado a</label>
                <p className="mt-1 text-gray-900 dark:text-white font-medium">{maintenance.assignedToName || 'Sin asignar'}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <User className="text-green-600 mt-1 flex-shrink-0" size={20} />
              <div>
                <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase">Creado por</label>
                <p className="mt-1 text-gray-900 dark:text-white font-medium">{maintenance.createdByName}</p>
              </div>
            </div>
          </div>

          {/* Email de Notificación */}
          {maintenance.notificationEmail && (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <label className="block text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase mb-2">📧 Email de Notificación</label>
              <p className="text-blue-900 dark:text-blue-200">{maintenance.notificationEmail}</p>
            </div>
          )}

          {/* Tareas/Checklist */}
          {maintenance.tasks && maintenance.tasks.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3">✓ Tareas a Realizar</label>
              <div className="space-y-2">
                {maintenance.tasks.map((task) => (
                  <div key={task.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                    <input
                      type="checkbox"
                      checked={task.completed}
                      disabled
                      className="mt-1 flex-shrink-0 w-5 h-5 rounded cursor-default"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${task.completed ? 'line-through text-gray-500 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                        {task.description}
                      </p>
                      {task.completedBy && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          ✓ Completada por {task.completedBy} el {formatDate(task.completedAt)}
                        </p>
                      )}
                      {task.notes && (
                        <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 italic">Nota: {task.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notas */}
          {maintenance.notes && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2 flex items-center gap-2">
                <FileText size={16} />
                Notas Adicionales
              </label>
              <div className="bg-gray-50 dark:bg-gray-700/30 rounded-lg p-4">
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words">{maintenance.notes}</p>
              </div>
            </div>
          )}

          {/* Costo */}
          {maintenance.cost !== undefined && maintenance.cost !== null && (
            <div className="flex items-start gap-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
              <DollarSign className="text-amber-600 mt-1 flex-shrink-0" size={20} />
              <div>
                <label className="block text-xs font-semibold text-amber-600 dark:text-amber-400 uppercase">Costo</label>
                <p className="mt-1 text-amber-900 dark:text-amber-100 font-bold text-lg">
                  ${maintenance.cost.toLocaleString('es-MX', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )}

          {/* Adjuntos */}
          {maintenance.attachments && maintenance.attachments.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-3 flex items-center gap-2">
                <Paperclip size={16} />
                Adjuntos ({maintenance.attachments.length})
              </label>
              <div className="space-y-2">
                {maintenance.attachments.map((attachment) => (
                  <a
                    key={attachment.id}
                    href={attachment.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <Paperclip className="text-gray-600 dark:text-gray-400 flex-shrink-0" size={18} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{attachment.fileName}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {attachment.fileType} • {(attachment.fileSize / 1024).toFixed(2)} KB
                      </p>
                    </div>
                    <span className="text-blue-600 dark:text-blue-400 text-sm font-medium">Descargar</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Timestamps */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4 mt-4">
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <label className="font-semibold text-gray-500 dark:text-gray-400 uppercase">Creado</label>
                <p className="text-gray-700 dark:text-gray-300 mt-1">{formatDate(maintenance.createdAt)}</p>
              </div>
              <div>
                <label className="font-semibold text-gray-500 dark:text-gray-400 uppercase">Actualizado</label>
                <p className="text-gray-700 dark:text-gray-300 mt-1">{formatDate(maintenance.updatedAt)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/20">
          <button
            onClick={handleDownloadPDF}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 dark:bg-blue-700 dark:hover:bg-blue-600 text-white rounded-lg transition-colors font-medium"
          >
            <Download size={18} />
            Descargar PDF
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-300 hover:bg-gray-400 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white rounded-lg transition-colors font-medium"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceDetail;
