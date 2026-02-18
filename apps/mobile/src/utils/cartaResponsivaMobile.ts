import * as FileSystem from 'expo-file-system';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Asset } from 'expo-asset';
import { Company, Equipment, User } from '@nexus-it/shared';

interface CartaResponsivaData {
  employee: User;
  equipment: Equipment;
  generatedBy: string;
  notes?: string;
}

interface GenerateCartaResponsivaMobileOptions {
  includeEmployeeSignature?: boolean;
  employeeSignatureSvg?: string | null;
  printDirectly?: boolean;
  sharePdf?: boolean;
}

const COMPANY_COLORS: Record<Company, { primary: string; secondary: string }> = {
  [Company.ESPECIAS_NATURALES]: { primary: '#2E7D32', secondary: '#66BB6A' },
  [Company.GRUPO_AMEX]: { primary: '#1565C0', secondary: '#42A5F5' },
  [Company.EQUIPOS_OSENAL]: { primary: '#C62828', secondary: '#EF5350' }
};

const COMPANY_BACKGROUNDS: Record<Company, number> = {
  [Company.GRUPO_AMEX]: require('../../assets/carta-backgrounds/amex.png'),
  [Company.ESPECIAS_NATURALES]: require('../../assets/carta-backgrounds/aromata.png'),
  [Company.EQUIPOS_OSENAL]: require('../../assets/carta-backgrounds/liumaq.png')
};

const backgroundCache = new Map<Company, string>();

const CONDITIONS = [
  'El empleado se compromete a cuidar y usar adecuadamente el equipo asignado.',
  'Cualquier daño, pérdida o robo deberá ser reportado inmediatamente al departamento de TI.',
  'El equipo debe ser devuelto en las mismas condiciones al término de la relación laboral.',
  'No se permite el uso del equipo para fines personales sin autorización expresa.',
  'El equipo es propiedad de la empresa y debe ser utilizado únicamente para actividades laborales.',
  'Cualquier software adicional deberá ser autorizado por el departamento de TI.',
  'Cualquier daño o pérdida del equipo será responsabilidad del empleado, por lo cual asumirá el costo del reemplazo o reparación.'
];

const escapeHtml = (value: string): string => (
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
);

const field = (label: string, value: string): string => `
  <tr>
    <td class="label">${escapeHtml(label)}:</td>
    <td class="value">${escapeHtml(value || 'N/A')}</td>
  </tr>
`;

const toDateString = (date: Date): string => date.toLocaleDateString('es-MX', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

const getBackgroundDataUri = async (company: Company): Promise<string | null> => {
  if (backgroundCache.has(company)) {
    return backgroundCache.get(company) || null;
  }

  const moduleId = COMPANY_BACKGROUNDS[company];
  if (!moduleId) return null;

  const asset = Asset.fromModule(moduleId);
  if (!asset.localUri) {
    await asset.downloadAsync();
  }

  const sourceUri = asset.localUri || asset.uri;
  if (!sourceUri) return null;

  const base64 = await FileSystem.readAsStringAsync(sourceUri, {
    encoding: FileSystem.EncodingType.Base64
  });
  const dataUri = `data:image/png;base64,${base64}`;
  backgroundCache.set(company, dataUri);
  return dataUri;
};

const buildHtml = (
  data: CartaResponsivaData,
  options: {
    backgroundDataUri: string | null;
    dateString: string;
    includeEmployeeSignature: boolean;
    employeeSignatureDataUri: string | null;
  }
): string => {
  const { employee, equipment, generatedBy } = data;
  const {
    backgroundDataUri,
    dateString,
    includeEmployeeSignature,
    employeeSignatureDataUri
  } = options;
  const colors = COMPANY_COLORS[equipment.company];
  const margin = equipment.company === Company.ESPECIAS_NATURALES ? 30 : 20;

  const conditionsList = CONDITIONS.map((condition, index) => (
    `<li><span class="num">${index + 1}.</span> ${escapeHtml(condition)}</li>`
  )).join('');

  const googleAccountForNotes = equipment.specs.googleAccountEmail?.trim() || '________________________';
  const googlePasswordForNotes = equipment.specs.googleAccountPassword?.trim() || '________________________';
  const notesSection = `
    <div class="section">
      <h3 class="section-title">NOTAS ADICIONALES</h3>
      <table class="info">
        ${field('Cuenta Google', googleAccountForNotes)}
        ${field('Clave', googlePasswordForNotes)}
      </table>
    </div>
  `;

  const backgroundHtml = backgroundDataUri
    ? `<img class="background" src="${backgroundDataUri}" alt="Fondo carta responsiva" />`
    : '';

  const employeeSignatureContent = includeEmployeeSignature && employeeSignatureDataUri
    ? `
      <div class="signature-image-wrap">
        <img class="signature-image" src="${employeeSignatureDataUri}" alt="Firma del empleado" />
      </div>
    `
    : '<div class="signature-image-wrap"></div>';

  return `
  <html>
    <head>
      <meta charset="utf-8" />
      <style>
        @page {
          size: letter;
          margin: 0;
        }
        * { box-sizing: border-box; }
        body {
          margin: 0;
          padding: 0;
          width: 216mm;
          min-height: 279mm;
          font-family: Helvetica, Arial, sans-serif;
          color: #111827;
          background: #ffffff;
        }
        .page {
          position: relative;
          width: 216mm;
          min-height: 279mm;
          overflow: hidden;
        }
        .background {
          position: absolute;
          inset: 0;
          width: 216mm;
          height: 279mm;
          object-fit: cover;
          z-index: 0;
        }
        .header {
          position: absolute;
          top: 8mm;
          left: 0;
          right: 0;
          text-align: center;
          z-index: 2;
        }
        .header h1 {
          margin: 0;
          font-size: 20px;
          color: ${colors.primary};
          letter-spacing: 0.3px;
        }
        .header h2 {
          margin: 3px 0 0;
          font-size: 11px;
          font-weight: 600;
          color: #111827;
          letter-spacing: 0.3px;
        }
        .content {
          position: relative;
          z-index: 2;
          padding: 35mm ${margin}mm 18mm ${margin}mm;
          min-height: 279mm;
          display: flex;
          flex-direction: column;
        }
        .section {
          margin-bottom: 5mm;
        }
        .section-title {
          margin: 0 0 3mm;
          font-size: 11px;
          color: #000000;
          font-weight: 700;
          letter-spacing: 0.2px;
          text-decoration: underline;
          text-decoration-thickness: 0.22mm;
          text-underline-offset: 0.8mm;
        }
        table.info {
          width: 100%;
          border-collapse: collapse;
          font-size: 10px;
        }
        table.info td {
          padding: 1.2mm 1mm;
          vertical-align: top;
        }
        table.info td.label {
          width: 34%;
          font-weight: 700;
        }
        table.info td.value {
          width: 66%;
          font-weight: 400;
        }
        .conditions {
          margin: 0;
          padding: 0;
          list-style: none;
          font-size: 9px;
          line-height: 1.45;
        }
        .conditions li {
          margin-bottom: 2.2mm;
          display: flex;
          gap: 1.4mm;
        }
        .conditions .num {
          font-weight: 700;
          min-width: 4mm;
        }
        .signatures-block {
          margin-top: 2mm;
        }
        .signatures {
          display: flex;
          gap: 10mm;
        }
        .signature {
          flex: 1;
          text-align: center;
        }
        .signature-box {
          position: relative;
          height: 16mm;
          margin-bottom: 1.6mm;
        }
        .signature-line {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 0;
          border-top: 1px solid #111827;
          height: 0;
        }
        .signature-image-wrap {
          position: absolute;
          left: 0;
          right: 0;
          bottom: 2.2mm;
          height: 11mm;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .signature-image {
          max-height: 100%;
          max-width: 100%;
          object-fit: contain;
        }
        .signature-label {
          font-size: 10px;
          font-weight: 700;
          margin-bottom: 1mm;
        }
        .signature-name {
          font-size: 10px;
          font-weight: 400;
        }
        .footer {
          position: absolute;
          bottom: 9mm;
          left: 0;
          right: 0;
          text-align: center;
          font-size: 8px;
          color: #6b7280;
          z-index: 2;
        }
      </style>
    </head>
    <body>
      <div class="page">
        ${backgroundHtml}

        <div class="header">
          <h1>CARTA RESPONSIVA</h1>
          <h2>EQUIPO DE CÓMPUTO</h2>
        </div>

        <div class="content">
          <div class="section">
            <h3 class="section-title">INFORMACIÓN DEL EMPLEADO</h3>
            <table class="info">
              ${field('Nombre', employee.name || 'N/A')}
              ${field('Puesto', employee.position || employee.department || 'N/A')}
              ${field('Empresa', equipment.company || 'N/A')}
            </table>
          </div>

          <div class="section">
            <h3 class="section-title">EQUIPO ASIGNADO</h3>
            <table class="info">
              ${field('Nombre', equipment.name || 'N/A')}
              ${field('Tipo', equipment.type ? equipment.type.toUpperCase() : 'N/A')}
              ${field('Marca', equipment.specs.manufacturer || 'N/A')}
              ${field('Modelo', equipment.specs.model || 'N/A')}
              ${field('Serial', equipment.specs.serialNumber || 'N/A')}
              ${field('IMEI', equipment.specs.imei || 'N/A')}
              ${field('Teléfono', equipment.specs.phoneNumber || 'N/A')}
              ${field('CPU', equipment.specs.cpu || 'N/A')}
              ${field('RAM', equipment.specs.ram || 'N/A')}
              ${field('Storage', equipment.specs.storage || 'N/A')}
              ${field('Hostname', equipment.specs.hostname || 'N/A')}
            </table>
          </div>

          <div class="section">
            <h3 class="section-title">CONDICIONES Y RESPONSABILIDADES</h3>
            <ul class="conditions">${conditionsList}</ul>
          </div>

          ${notesSection}

          <div class="signatures-block">
            <div class="signatures">
              <div class="signature">
                <div class="signature-box">
                  ${employeeSignatureContent}
                  <div class="signature-line"></div>
                </div>
                <div class="signature-label">Firma del Empleado</div>
                <div class="signature-name">${escapeHtml(employee.name || '')}</div>
              </div>
              <div class="signature">
                <div class="signature-box">
                  <div class="signature-line"></div>
                </div>
                <div class="signature-label">RH/SISTEMAS</div>
                <div class="signature-name">${escapeHtml(generatedBy || '')}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="footer">Generado: ${escapeHtml(dateString)}</div>
      </div>
    </body>
  </html>
  `;
};

export const generateCartaResponsivaMobile = async (
  data: CartaResponsivaData,
  options: GenerateCartaResponsivaMobileOptions = {}
): Promise<void> => {
  const {
    includeEmployeeSignature = false,
    employeeSignatureSvg = null,
    printDirectly = false,
    sharePdf = true
  } = options;

  const dateString = toDateString(new Date());
  const backgroundDataUri = await getBackgroundDataUri(data.equipment.company);
  const employeeSignatureDataUri = includeEmployeeSignature && employeeSignatureSvg
    ? `data:image/svg+xml;utf8,${encodeURIComponent(employeeSignatureSvg)}`
    : null;
  const html = buildHtml(data, {
    backgroundDataUri,
    dateString,
    includeEmployeeSignature,
    employeeSignatureDataUri
  });

  if (printDirectly) {
    await Print.printAsync({
      html,
      width: 612,
      height: 792
    });
  }

  if (sharePdf) {
    const printResult = await Print.printToFileAsync({
      html,
      width: 612,
      height: 792
    });

    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(printResult.uri, {
        mimeType: 'application/pdf',
        dialogTitle: 'Carta responsiva'
      });
    }
  }
};
