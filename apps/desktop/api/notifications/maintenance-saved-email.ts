import * as nodemailer from 'nodemailer';

interface MaintenanceEmailRequestBody {
  recipientEmail?: string;
  recipientName?: string;
  maintenanceId?: string;
  equipmentName?: string;
  company?: string;
  title?: string;
  scheduledDate?: string;
  assignedToName?: string;
  createdByName?: string;
}

type VercelRequest = {
  method?: string;
  body?: MaintenanceEmailRequestBody;
};

type VercelResponse = {
  status: (code: number) => VercelResponse;
  json: (payload: unknown) => void;
  setHeader: (name: string, value: string | string[]) => void;
};

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.office365.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
const SMTP_USER = process.env.SMTP_USER || 'soporte@grupoamex.com.mx';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

const toReadableDate = (value?: string): string => {
  if (!value) return 'No especificada';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const sanitize = (value?: string): string => (value || '').trim();

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).json({ ok: true });
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!SMTP_PASS) {
    res.status(500).json({
      error: 'SMTP_PASS no está configurado en variables de entorno'
    });
    return;
  }

  try {
    const body = req.body || {};
    const recipientEmail = sanitize(body.recipientEmail);
    const recipientName = sanitize(body.recipientName);
    const maintenanceId = sanitize(body.maintenanceId);
    const equipmentName = sanitize(body.equipmentName);
    const company = sanitize(body.company);
    const title = sanitize(body.title);
    const scheduledDate = sanitize(body.scheduledDate);
    const assignedToName = sanitize(body.assignedToName);
    const createdByName = sanitize(body.createdByName);

    if (!recipientEmail) {
      res.status(400).json({ error: 'recipientEmail es obligatorio' });
      return;
    }

    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT,
      secure: SMTP_SECURE,
      requireTLS: true,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });

    const subject = `Mantenimiento programado: ${title || equipmentName || 'Equipo'}`;
    const readableDate = toReadableDate(scheduledDate);

    const html = `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5;">
        <h2 style="margin: 0 0 12px; color: #0f3d5e;">Mantenimiento programado</h2>
        <p>Hola${recipientName ? ` <strong>${recipientName}</strong>` : ''},</p>
        <p>
          Se programó un mantenimiento para tu equipo.
        </p>
        <ul>
          <li><strong>Equipo:</strong> ${equipmentName || 'N/A'}</li>
          <li><strong>Empresa:</strong> ${company || 'N/A'}</li>
          <li><strong>Tipo/Título:</strong> ${title || 'N/A'}</li>
          <li><strong>Fecha programada:</strong> ${readableDate}</li>
          ${assignedToName ? `<li><strong>Asignado a:</strong> ${assignedToName}</li>` : ''}
          ${maintenanceId ? `<li><strong>ID de mantenimiento:</strong> ${maintenanceId}</li>` : ''}
        </ul>
        <p>
          Por favor, confírmanos a qué hora tienes disponible tu equipo para poder realizar el mantenimiento sin afectar tus actividades.
        </p>
        <p style="margin-top: 20px;">
          Gracias,<br />
          ${createdByName || 'Soporte TI'}
        </p>
      </div>
    `;

    const text = [
      'Mantenimiento programado',
      '',
      `Hola ${recipientName || ''}`.trim(),
      'Se programó un mantenimiento para tu equipo.',
      `Equipo: ${equipmentName || 'N/A'}`,
      `Empresa: ${company || 'N/A'}`,
      `Tipo/Título: ${title || 'N/A'}`,
      `Fecha programada: ${readableDate}`,
      assignedToName ? `Asignado a: ${assignedToName}` : '',
      maintenanceId ? `ID de mantenimiento: ${maintenanceId}` : '',
      '',
      'Por favor, confírmanos a qué hora tienes disponible tu equipo para poder realizar el mantenimiento sin afectar tus actividades.',
      '',
      `Gracias, ${createdByName || 'Soporte TI'}`
    ]
      .filter(Boolean)
      .join('\n');

    await transporter.sendMail({
      from: SMTP_FROM,
      to: recipientEmail,
      subject,
      html,
      text
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Error sending maintenance email:', error);
    res.status(500).json({ error: 'No se pudo enviar el correo' });
  }
}
