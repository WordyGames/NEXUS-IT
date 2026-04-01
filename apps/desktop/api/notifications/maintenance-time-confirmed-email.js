const nodemailer = require('nodemailer');

const SMTP_HOST = process.env.SMTP_HOST || 'smtp.office365.com';
const SMTP_PORT = Number(process.env.SMTP_PORT || 587);
const SMTP_SECURE = (process.env.SMTP_SECURE || 'false').toLowerCase() === 'true';
const SMTP_USER = process.env.SMTP_USER || 'soporte@grupoamex.com.mx';
const SMTP_PASS = process.env.SMTP_PASS || '';
const SMTP_FROM = process.env.SMTP_FROM || SMTP_USER;

const toReadableDate = (value) => {
  if (!value) return 'No especificada';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleDateString('es-MX', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

const sanitize = (value) => (value || '').trim();

module.exports = async function handler(req, res) {
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
    res.status(500).json({ error: 'SMTP_PASS no está configurado en variables de entorno' });
    return;
  }

  try {
    const body = req.body || {};
    const adminEmail = sanitize(body.adminEmail);
    const adminName = sanitize(body.adminName);
    const maintenanceId = sanitize(body.maintenanceId);
    const equipmentName = sanitize(body.equipmentName);
    const company = sanitize(body.company);
    const title = sanitize(body.title);
    const scheduledDate = sanitize(body.scheduledDate);
    const scheduledTime = sanitize(body.scheduledTime);
    const confirmedByName = sanitize(body.confirmedByName);

    if (!adminEmail) {
      res.status(400).json({ error: 'adminEmail es obligatorio' });
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

    const subject = `✅ Hora confirmada: ${title || equipmentName || 'Mantenimiento'}`;
    const readableDate = toReadableDate(scheduledDate);

    const html = `
      <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.5; max-width: 600px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 20px; border-radius: 8px 8px 0 0; color: white;">
          <h2 style="margin: 0; font-size: 24px; font-weight: bold;">✅ Hora Confirmada</h2>
        </div>
        
        <div style="background: #f3f4f6; padding: 20px; border-radius: 0 0 8px 8px;">
          <p style="margin: 0 0 16px;">
            Hola${adminName ? ` <strong>${adminName}</strong>` : ''},
          </p>

          <p style="margin: 0 0 20px;">
            Se confirmó la hora para el siguiente mantenimiento:
          </p>

          <div style="background: white; border-left: 4px solid #10b981; padding: 16px; margin: 0 0 16px; border-radius: 4px;">
            <table style="width: 100%; border-collapse: collapse;">
              <tbody>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-weight: bold; width: 120px;">Equipo:</td>
                  <td style="padding: 6px 0; color: #1f2937;">${equipmentName}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-weight: bold;">Empresa:</td>
                  <td style="padding: 6px 0; color: #1f2937;">${company}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-weight: bold;">Tipo:</td>
                  <td style="padding: 6px 0; color: #1f2937;">${title}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-weight: bold;">Fecha:</td>
                  <td style="padding: 6px 0; color: #1f2937;">${readableDate}</td>
                </tr>
                <tr style="background: #f0fdf4;">
                  <td style="padding: 8px 0; color: #059669; font-weight: bold;">⏰ Hora:</td>
                  <td style="padding: 8px 0; color: #059669; font-weight: bold; font-size: 18px;">${scheduledTime}</td>
                </tr>
                <tr>
                  <td style="padding: 6px 0; color: #6b7280; font-weight: bold;">Confirmado por:</td>
                  <td style="padding: 6px 0; color: #1f2937;">${confirmedByName}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <p style="margin: 0; color: #6b7280; font-size: 14px;">
            Ya puedes agregar este mantenimiento a tu agenda. 
            ${scheduledTime && readableDate ? `<br/>Está programado para el <strong>${readableDate} a las ${scheduledTime}</strong>.` : ''}
          </p>
        </div>
      </div>
    `;

    await transporter.sendMail({
      from: SMTP_FROM,
      to: adminEmail,
      subject,
      html
    });

    res.status(200).json({ 
      ok: true, 
      message: 'Email enviado exitosamente',
      recipient: adminEmail
    });
  } catch (error) {
    console.error('Error sending confirmation email:', error);
    res.status(500).json({ 
      error: error.message || 'Error al enviar el email de confirmación',
      details: error.toString()
    });
  }
};
