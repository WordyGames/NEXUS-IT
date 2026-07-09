/**
 * Script para crear/actualizar usuario administrador.
 *
 * SEGURIDAD:
 *  - NO contiene credenciales hardcodeadas.
 *  - La contrasena se hashea con bcrypt (bcryptjs) antes de guardar.
 *  - El usuario/contrasena se pasan por variables de entorno o argumentos CLI.
 *
 * Uso (variables de entorno, recomendado):
 *   ADMIN_USERNAME=lsolis ADMIN_PASSWORD='...' ADMIN_NAME='Luis Solis' \
 *   ADMIN_COMPANY=ESPECIAS_NATURALES_DEL_NORTE node setup-admin.js
 *
 * Uso (argumentos CLI):
 *   node setup-admin.js --username lsolis --password '...' \
 *     --name 'Luis Solis' --company ESPECIAS_NATURALES_DEL_NORTE
 *
 * Requiere: npm install firebase-admin bcryptjs
 */
const admin = require('firebase-admin');
const bcrypt = require('bcryptjs');

const SALT_ROUNDS = 12;

// --- Parseo de argumentos CLI (--clave valor) ---
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

const username = process.env.ADMIN_USERNAME || args.username;
const password = process.env.ADMIN_PASSWORD || args.password;
const name = process.env.ADMIN_NAME || args.name || username;
const company = process.env.ADMIN_COMPANY || args.company;

if (!username || !password || !company) {
  console.error('ERROR: faltan datos obligatorios.');
  console.error('Provee ADMIN_USERNAME, ADMIN_PASSWORD y ADMIN_COMPANY');
  console.error('(por variables de entorno o --username/--password/--company).');
  process.exit(1);
}

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}

const db = admin.firestore();

async function setupAdmin() {
  try {
    console.log('Configurando usuario administrador...');

    // Hash bcrypt (NO reversible, con salt). Nunca guardar texto plano ni base64.
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    console.log('Datos del usuario:');
    console.log('  Username:', username);
    console.log('  Nombre:  ', name);
    console.log('  Empresa: ', company);
    console.log('  Rol:      admin');
    // No se imprime el hash ni la contrasena.

    const querySnapshot = await db
      .collection('users')
      .where('username', '==', username)
      .get();

    let userId;

    if (querySnapshot.empty) {
      console.log('Creando nuevo usuario...');
      const docRef = await db.collection('users').add({
        username,
        password: passwordHash,
        name,
        role: 'admin',
        company,
        department: 'IT',
        phone: '',
        isActive: true,
        createdAt: admin.firestore.Timestamp.now(),
        updatedAt: admin.firestore.Timestamp.now()
      });
      userId = docRef.id;
      console.log('Usuario creado con ID:', userId);
    } else {
      userId = querySnapshot.docs[0].id;
      console.log('Usuario existente encontrado. Actualizando...');
      await db.collection('users').doc(userId).update({
        password: passwordHash,
        name,
        role: 'admin',
        company,
        department: 'IT',
        phone: '',
        isActive: true,
        updatedAt: admin.firestore.Timestamp.now()
      });
      console.log('Usuario actualizado con ID:', userId);
    }

    console.log('Setup completado. Inicia sesion con el usuario configurado.');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

setupAdmin();
