const { jsPDF } = require('jspdf');
const fs = require('fs');

const doc = new jsPDF({
  orientation: 'portrait',
  unit: 'mm',
  format: 'a4',
});

const pageWidth = doc.internal.pageSize.getWidth();
const pageHeight = doc.internal.pageSize.getHeight();
let yPosition = 15;

// Colores
const primaryColor = [30, 120, 200];
const darkGray = [50, 50, 50];
const lightGray = [240, 240, 240];

// Función auxiliar para agregar secciones
const addSection = (title, content, startY) => {
  doc.setFillColor(30, 120, 200);
  doc.rect(10, startY, pageWidth - 20, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(11);
  doc.setFont(undefined, 'bold');
  doc.text(title, 15, startY + 6);
  return startY + 12;
};

// Header con título
doc.setTextColor(...darkGray);
doc.setFontSize(18);
doc.setFont(undefined, 'bold');
doc.text('REPORTE DE MANTENIMIENTO', pageWidth / 2, yPosition, { align: 'center' });

yPosition += 8;
doc.setFontSize(10);
doc.setFont(undefined, 'normal');
doc.text('ID: 4565f682-2b14-4eeb-802f-5c7cc588c2e3', pageWidth / 2, yPosition, { align: 'center' });

yPosition += 15;

// Sección: Información General
yPosition = addSection('INFORMACIÓN GENERAL', '', yPosition);
doc.setTextColor(...darkGray);
doc.setFontSize(9);

const generalInfo = [
  { label: 'Título:', value: 'Mantenimiento Preventivo Semestral - Limpieza y Optimización Física' },
  { label: 'Tipo:', value: 'Preventivo (🛡️)' },
  { label: 'Estado:', value: 'Programado' },
  { label: 'Empresa:', value: 'ESPECIAS NATURALES DEL NORTE' },
  { label: 'Equipo:', value: 'Aspire A514-53' },
];

generalInfo.forEach((info) => {
  doc.setFont(undefined, 'bold');
  doc.text(info.label, 15, yPosition);
  doc.setFont(undefined, 'normal');
  doc.text(info.value, 50, yPosition);
  yPosition += 6;
});

yPosition += 8;

// Sección: Descripción
yPosition = addSection('DESCRIPCIÓN', '', yPosition);
doc.setTextColor(...darkGray);
doc.setFontSize(8);
doc.setFont(undefined, 'normal');

const description = 'Se ha programado su mantenimiento preventivo semestral con el objetivo de realizar una limpieza física profunda de los componentes, optimizar el flujo de aire y prevenir fallas de hardware a largo plazo.\n\nIMPORTANTE: Para no afectar sus actividades laborales, este sistema le ha enviado una notificación automática. Por favor, responda a ese correo (o contacte a Soporte Sistemas) confirmando la hora exacta en la que su equipo estará disponible el día programado.';

const descLines = doc.splitTextToSize(description, pageWidth - 30);
doc.text(descLines, 15, yPosition);
yPosition += descLines.length * 4 + 8;

// Sección: Fechas
yPosition = addSection('FECHAS Y FRECUENCIA', '', yPosition);
doc.setTextColor(...darkGray);
doc.setFontSize(9);

const dateInfo = [
  { label: 'Fecha Programada:', value: '7 de abril de 2026' },
  { label: 'Frecuencia:', value: 'Semestral' },
  { label: 'Próximo Mantenimiento:', value: '7 de octubre de 2026' },
];

dateInfo.forEach((info) => {
  doc.setFont(undefined, 'bold');
  doc.text(info.label, 15, yPosition);
  doc.setFont(undefined, 'normal');
  doc.text(info.value, 80, yPosition);
  yPosition += 6;
});

yPosition += 8;

// Sección: Personal
yPosition = addSection('ASIGNACIÓN', '', yPosition);
doc.setTextColor(...darkGray);
doc.setFontSize(9);

const staffInfo = [
  { label: 'Asignado a:', value: 'Luis Solis' },
  { label: 'Creado por:', value: 'Luis Solis' },
  { label: 'Email de Notificación:', value: 'direccion@aromata.mx' },
];

staffInfo.forEach((info) => {
  doc.setFont(undefined, 'bold');
  doc.text(info.label, 15, yPosition);
  doc.setFont(undefined, 'normal');
  doc.text(info.value, 80, yPosition);
  yPosition += 6;
});

yPosition += 8;

// Sección: Tareas
yPosition = addSection('TAREAS A REALIZAR', '', yPosition);
doc.setTextColor(...darkGray);
doc.setFontSize(8);
doc.setFont(undefined, 'normal');

const tasks = [
  '☐ Esperar confirmación de horario por parte del usuario.',
  '☐ Apagado seguro y desconexión de periféricos.',
  '☐ Limpieza física interna (remoción de polvo) y externa.',
  '☐ Inspección visual de componentes y encendido de prueba.',
  '☐ Envío de correo de finalización y entrega del equipo.',
];

tasks.forEach((task) => {
  doc.text(task, 15, yPosition);
  yPosition += 5;
});

yPosition += 8;

// Sección: Notas
yPosition = addSection('NOTAS ADICIONALES', '', yPosition);
doc.setTextColor(...darkGray);
doc.setFontSize(8);

const notes = 'Mantenimiento rutinario para Especias Naturales. El ticket permanecerá en estado de espera hasta que el usuario confirme su disponibilidad de horario. Se requiere que cierre sus sesiones antes de la intervención.';

const noteLines = doc.splitTextToSize(notes, pageWidth - 30);
doc.text(noteLines, 15, yPosition);
yPosition += noteLines.length * 4 + 8;

// Footer
doc.setTextColor(150, 150, 150);
doc.setFontSize(7);
doc.setFont(undefined, 'normal');
doc.text('Este documento fue generado automáticamente por NEXUS IT', pageWidth / 2, pageHeight - 10, { align: 'center' });
doc.text('Creado: 1 de abril de 2026 | Actualizado: 1 de abril de 2026', pageWidth / 2, pageHeight - 5, { align: 'center' });

// Guardar
doc.save('mantenimiento-ejemplo.pdf');
console.log('✅ PDF generado: mantenimiento-ejemplo.pdf');
