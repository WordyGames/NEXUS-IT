const sanitizeEnv = (value) => (typeof value === 'string' ? value.trim() : '');

const getSmtpConfig = () => {
  const host = sanitizeEnv(process.env.SMTP_HOST) || 'smtp.office365.com';
  const port = Number(process.env.SMTP_PORT || 587);
  const secure = (sanitizeEnv(process.env.SMTP_SECURE) || 'false').toLowerCase() === 'true';
  const user = sanitizeEnv(process.env.SMTP_USER);
  const pass = sanitizeEnv(process.env.SMTP_PASS);
  const from = sanitizeEnv(process.env.SMTP_FROM) || user;

  const missing = [];
  if (!user) missing.push('SMTP_USER');
  if (!pass) missing.push('SMTP_PASS');

  if (missing.length > 0) {
    const error = new Error(`Faltan variables SMTP requeridas: ${missing.join(', ')}`);
    error.code = 'SMTP_ENV_MISSING';
    throw error;
  }

  return { host, port, secure, user, pass, from };
};

module.exports = {
  getSmtpConfig,
};
