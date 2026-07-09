/**
 * Script para verificar autenticacion (hash bcrypt).
 *
 * SEGURIDAD: no contiene credenciales ni hashes hardcodeados.
 * Compara una contrasena candidata contra un hash bcrypt existente.
 *
 * Uso:
 *   TEST_PASSWORD='...' TEST_HASH='$2a$12$...' node test-auth.js
 *   node test-auth.js --password '...' --hash '$2a$12$...'
 *
 * Requiere: npm install bcryptjs
 */
const bcrypt = require('bcryptjs');

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) {
      const key = a.slice(2);
      const val = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : 'true';
      out[key] = val;
    }
  }
  return out;
}

const args = parseArgs(process.argv);
const password = process.env.TEST_PASSWORD || args.password;
const hash = process.env.TEST_HASH || args.hash;

if (!password || !hash) {
  console.error('ERROR: provee TEST_PASSWORD y TEST_HASH (o --password/--hash).');
  process.exit(1);
}

const ok = bcrypt.compareSync(password, hash);
console.log('=== TEST DE AUTENTICACION (bcrypt) ===');
console.log('Coincide la contrasena con el hash?:', ok);
process.exit(ok ? 0 : 2);
