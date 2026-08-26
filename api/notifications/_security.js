// Utilidades compartidas de seguridad para los endpoints de correo de /api/notifications.
// No dependen de Supabase para mantener estos endpoints ligeros (funciones serverless).

const ESCAPE_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

// Escapa valores antes de interpolarlos en HTML de correo (evita inyección de
// markup/HTML arbitrario a partir de datos del body de la petición).
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ESCAPE_MAP[c]);

// Exige un header x-nexus-api-key que coincida con MAINTENANCE_EMAIL_API_KEY.
// Si la variable de entorno todavía no está configurada en Vercel, se deja
// pasar la petición (para no romper el envío de correos antes de que se
// configure) pero se registra una advertencia — hay que setear esa variable
// en Vercel (Production) para que la protección quede activa de verdad.
const requireApiKey = (req, res) => {
  const expected = (process.env.MAINTENANCE_EMAIL_API_KEY || '').trim();
  if (!expected) {
    console.warn('[seguridad] MAINTENANCE_EMAIL_API_KEY no configurada: este endpoint queda sin protección de API key.');
    return true;
  }

  const provided = (req.headers['x-nexus-api-key'] || '').toString().trim();
  if (provided !== expected) {
    res.status(401).json({ error: 'No autorizado' });
    return false;
  }
  return true;
};

// Restringe CORS a los orígenes conocidos de la app (más peticiones sin
// header Origin, típicas de la app de escritorio Electron o de llamadas
// servidor-a-servidor). No sustituye a requireApiKey: CORS solo protege
// contra abuso disparado desde el navegador de otra persona.
const ALLOWED_ORIGINS = new Set(
  (process.env.MAINTENANCE_EMAIL_ALLOWED_ORIGINS || 'https://nexus-it-wordygames-projects.vercel.app')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean)
);

const applyCors = (req, res) => {
  const origin = req.headers.origin;
  if (!origin || ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-nexus-api-key');
};

module.exports = { escapeHtml, requireApiKey, applyCors };
