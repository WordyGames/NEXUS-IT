import jsPDF from 'jspdf';
import { Company, Equipment, User } from '@nexus-it/shared';

// Importar imágenes de fondo - Vite las procesará automáticamente
import amexBg from '../assets/carta-backgrounds/amex.png';
import aromataBg from '../assets/carta-backgrounds/aromata.png';
import liumaqBg from '../assets/carta-backgrounds/liumaq.png';

interface CartaResponsivaData {
  employee: User;
  equipment: Equipment;
  generatedBy: string;
  notes?: string;
}

const COMPANY_COLORS = {
  [Company.ESPECIAS_NATURALES]: { primary: '#2E7D32', secondary: '#66BB6A' },
  [Company.GRUPO_AMEX]: { primary: '#1565C0', secondary: '#42A5F5' },
  [Company.EQUIPOS_OSENAL]: { primary: '#C62828', secondary: '#EF5350' }
};

const COMPANY_BACKGROUNDS = {
  [Company.GRUPO_AMEX]: amexBg,
  [Company.ESPECIAS_NATURALES]: aromataBg,
  [Company.EQUIPOS_OSENAL]: liumaqBg
};

export const generateCartaResponsivaPDF = async (data: CartaResponsivaData): Promise<void> => {
  const { employee, equipment, generatedBy, notes } = data;
  const colors = COMPANY_COLORS[equipment.company];

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'letter'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Ajustar márgenes según la empresa para mejor alineación
  const margin = equipment.company === Company.ESPECIAS_NATURALES ? 30 : 20;
  let yPos = margin;

  // ===== AGREGAR IMAGEN DE FONDO =====
  const backgroundImage = COMPANY_BACKGROUNDS[equipment.company];
  if (backgroundImage) {
    try {
      // Agregar imagen de fondo (cubre toda la página)
      doc.addImage(backgroundImage, 'PNG', 0, 0, pageWidth, pageHeight);
    } catch (error) {
      console.error('[Carta PDF] Error al agregar imagen de fondo:', error);
    }
  }

  // ===== ENCABEZADO =====
  doc.setFontSize(18);
  doc.setTextColor(colors.primary);
  doc.text('CARTA RESPONSIVA', pageWidth / 2, 12, { align: 'center' });

  doc.setFontSize(10);
  doc.text('EQUIPO DE CÓMPUTO', pageWidth / 2, 20, { align: 'center' });

  yPos = 35;

  // ===== INFORMACIÓN DEL EMPLEADO =====
  doc.setFontSize(11);
  doc.setTextColor(colors.secondary);
  doc.setFont('helvetica', 'bold');
  doc.text('INFORMACIÓN DEL EMPLEADO', margin + 3, yPos);
  yPos += 2;

  yPos += 12;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  const addField = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label + ':', margin + 5, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 40, yPos);
    yPos += 6;
  };

  addField('Nombre', employee.name || 'N/A');
  addField('Puesto', employee.position || 'N/A');
  addField('Departamento', employee.department || 'N/A');
  addField('Empresa', equipment.company);

  yPos += 5;

  // ===== EQUIPO ASIGNADO =====
  doc.setFontSize(11);
  doc.setTextColor(colors.secondary);
  doc.setFont('helvetica', 'bold');
  doc.text('EQUIPO ASIGNADO', margin + 3, yPos);
  yPos += 2;

  yPos += 12;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  addField('Nombre', equipment.name || 'N/A');
  addField('Tipo', equipment.type.toUpperCase());
  addField('Marca', equipment.specs.manufacturer || 'N/A');
  addField('Modelo', equipment.specs.model || 'N/A');
  addField('Serial', equipment.specs.serialNumber || 'N/A');
  addField('CPU', equipment.specs.cpu || 'N/A');
  addField('RAM', equipment.specs.ram || 'N/A');
  addField('Storage', equipment.specs.storage || 'N/A');
  addField('Hostname', equipment.specs.hostname || 'N/A');

  yPos += 5;

  // ===== CONDICIONES Y RESPONSABILIDADES =====
  doc.setFontSize(11);
  doc.setTextColor(colors.secondary);
  doc.setFont('helvetica', 'bold');
  doc.text('CONDICIONES Y RESPONSABILIDADES', margin + 3, yPos);
  yPos += 2;

  yPos += 12;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);

  const conditions = [
    'El empleado se compromete a cuidar y usar adecuadamente el equipo asignado.',
    'Cualquier daño, pérdida o robo deberá ser reportado inmediatamente al departamento de TI.',
    'El equipo debe ser devuelto en las mismas condiciones al término de la relación laboral.',
    'No se permite el uso del equipo para fines personales sin autorización expresa.',
    'El equipo es propiedad de la empresa y debe ser utilizado únicamente para actividades laborales.',
    'Cualquier software adicional deberá ser autorizado por el departamento de TI.'
  ];

  conditions.forEach((condition, index) => {
    const lines = doc.splitTextToSize(`${index + 1}. ${condition}`, pageWidth - 2 * margin - 10);
    doc.text(lines, margin + 5, yPos);
    yPos += lines.length * 5;
  });

  yPos += 5;

  // ===== NOTAS ADICIONALES =====
  if (notes && notes.trim()) {
    doc.setFontSize(11);
    doc.setTextColor(colors.secondary);
    doc.setFont('helvetica', 'bold');
    doc.text('NOTAS ADICIONALES', margin + 3, yPos);
    yPos += 2;

    yPos += 12;
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);

    const notesLines = doc.splitTextToSize(notes, pageWidth - 2 * margin - 10);
    doc.text(notesLines, margin + 5, yPos);
    yPos += notesLines.length * 5 + 5;
  }

  // ===== FIRMAS =====
  // Ajustar posición de firmas según empresa
  const firmasOffset = equipment.company === Company.ESPECIAS_NATURALES ? 95 : 75;
  yPos = Math.max(yPos + 10, pageHeight - firmasOffset);

  doc.setFontSize(11);
  doc.setTextColor(colors.secondary);
  doc.setFont('helvetica', 'bold');
  doc.text('FIRMAS', margin + 3, yPos);
  yPos += 2;

  yPos += 15;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  const signatureWidth = (pageWidth - 2 * margin - 20) / 2;
  
  // Firma Empleado
  doc.line(margin + 10, yPos + 15, margin + 10 + signatureWidth, yPos + 15);
  doc.setFont('helvetica', 'bold');
  doc.text('Firma del Empleado', margin + 10 + signatureWidth / 2, yPos + 20, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(employee.name || '', margin + 10 + signatureWidth / 2, yPos + 25, { align: 'center' });

  // Firma RH/Sistemas
  const xPosRH = margin + 20 + signatureWidth;
  doc.line(xPosRH, yPos + 15, xPosRH + signatureWidth, yPos + 15);
  doc.setFont('helvetica', 'bold');
  doc.text('RH/SISTEMAS', xPosRH + signatureWidth / 2, yPos + 20, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  doc.text(generatedBy, xPosRH + signatureWidth / 2, yPos + 25, { align: 'center' });

  // ===== PIE DE PÁGINA =====
  doc.setFontSize(8);
  doc.setTextColor(128, 128, 128);
  const now = new Date();
  const dateStr = now.toLocaleDateString('es-MX', { 
    year: 'numeric', 
    month: '2-digit', 
    day: '2-digit' 
  });
  doc.text(`Generado: ${dateStr}`, pageWidth / 2, pageHeight - 10, { align: 'center' });

  // Guardar PDF
  const fileName = `Carta_Responsiva_${employee.name?.replace(/\s+/g, '_')}_${dateStr.replace(/\//g, '-')}.pdf`;
  doc.save(fileName);
};
