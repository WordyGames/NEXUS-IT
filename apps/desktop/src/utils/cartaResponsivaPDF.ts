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
  const { employee, equipment, generatedBy } = data;
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

  const addSectionTitle = (title: string) => {
    doc.setFontSize(11);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    const titleX = margin + 3;
    doc.text(title, titleX, yPos);
    const titleWidth = doc.getTextWidth(title);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.3);
    doc.line(titleX, yPos + 0.8, titleX + titleWidth, yPos + 0.8);
    yPos += 14;
  };

  const addField = (label: string, value: string) => {
    doc.setFont('helvetica', 'bold');
    doc.text(label + ':', margin + 5, yPos);
    doc.setFont('helvetica', 'normal');
    doc.text(value, margin + 40, yPos);
    yPos += 6;
  };

  // ===== INFORMACIÓN DEL EMPLEADO =====
  addSectionTitle('INFORMACIÓN DEL EMPLEADO');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  addField('Nombre', employee.name || 'N/A');
  addField('Puesto', employee.position || employee.department || 'N/A');
  addField('Teléfono', employee.phone || 'N/A');
  addField('Empresa', equipment.company);

  yPos += 5;

  // ===== EQUIPO ASIGNADO =====
  addSectionTitle('EQUIPO ASIGNADO');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);

  addField('Nombre', equipment.name || 'N/A');
  addField('Tipo', equipment.type.toUpperCase());
  addField('Marca', equipment.specs.manufacturer || 'N/A');
  addField('Modelo', equipment.specs.model || 'N/A');
  addField('Serial', equipment.specs.serialNumber || 'N/A');
  addField('IMEI', equipment.specs.imei || 'N/A');
  addField('Teléfono', equipment.specs.phoneNumber || 'N/A');
  addField('CPU', equipment.specs.cpu || 'N/A');
  addField('RAM', equipment.specs.ram || 'N/A');
  addField('Storage', equipment.specs.storage || 'N/A');
  addField('Hostname', equipment.specs.hostname || 'N/A');

  yPos += 5;

  // ===== CONDICIONES Y RESPONSABILIDADES =====
  addSectionTitle('CONDICIONES Y RESPONSABILIDADES');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(9);

  const conditions = [
    'El empleado se compromete a cuidar y usar adecuadamente el equipo asignado.',
    'Cualquier daño, pérdida o robo deberá ser reportado inmediatamente al departamento de TI.',
    'El equipo debe ser devuelto en las mismas condiciones al término de la relación laboral.',
    'No se permite el uso del equipo para fines personales sin autorización expresa.',
    'El equipo es propiedad de la empresa y debe ser utilizado únicamente para actividades laborales.',
    'Cualquier software adicional deberá ser autorizado por el departamento de TI.',
    'Cualquier daño o pérdida del equipo será responsabilidad del empleado, por lo cual asumirá el costo del reemplazo o reparación.'
  ];

  conditions.forEach((condition, index) => {
    const lines = doc.splitTextToSize(`${index + 1}. ${condition}`, pageWidth - 2 * margin - 10);
    doc.text(lines, margin + 5, yPos);
    yPos += lines.length * 5;
  });

  yPos += 5;

  // ===== NOTAS ADICIONALES =====
  addSectionTitle('NOTAS ADICIONALES');
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(10);
  addField('Cuenta Google', equipment.specs.googleAccountEmail || '________________________');
  addField('Clave', '________________________');

  // ===== BLOQUE DE FIRMAS =====
  // Subimos la zona de firmas para que no quede tan abajo
  const firmasOffset = equipment.company === Company.ESPECIAS_NATURALES ? 120 : 105;
  yPos = Math.max(yPos + 8, pageHeight - firmasOffset);

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
