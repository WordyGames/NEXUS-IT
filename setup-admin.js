/**
 * Script para crear/actualizar usuario administrador
 * Ejecutar: node setup-admin.js
 */
const admin = require('firebase-admin');

// ⚠️ IMPORTANTE: Debes tener firebase-admin instalado
// npm install firebase-admin

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBWOjYAajcHeWZ44fkNNngLoRP-Up8EhJg",
  authDomain: "nexus-it-e8568.firebaseapp.com",
  projectId: "nexus-it-e8568",
  storageBucket: "nexus-it-e8568.firebasestorage.app",
  messagingSenderId: "915769148490",
  appId: "1:915769148490:web:e72918686ca03c9256d2b3",
  measurementId: "G-JTWE0302CT"
};

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
    ...firebaseConfig
  });
}

const db = admin.firestore();

async function setupAdmin() {
  try {
    console.log('🔧 Configurando usuario administrador...\n');

    const username = 'lsolis';
    const password = 'Ares1209';
    const passwordHash = Buffer.from(password).toString('base64');
    const name = 'Luis Solis';
    const company = 'ESPECIAS_NATURALES_DEL_NORTE';

    console.log('📝 Datos del usuario:');
    console.log(`  Username: ${username}`);
    console.log(`  Nombre: ${name}`);
    console.log(`  Empresa: ${company}`);
    console.log(`  Rol: admin`);
    console.log(`  Password hash: ${passwordHash}\n`);

    // Buscar usuario existente
    const querySnapshot = await db
      .collection('users')
      .where('username', '==', username)
      .get();

    let userId;

    if (querySnapshot.empty) {
      // Crear nuevo usuario
      console.log('✨ Creando nuevo usuario...');
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
      console.log(`✅ Usuario creado con ID: ${userId}\n`);
    } else {
      // Actualizar usuario existente
      userId = querySnapshot.docs[0].id;
      console.log(`📦 Usuario existente encontrado. Actualizando...\n`);
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
      console.log(`✅ Usuario actualizado con ID: ${userId}\n`);
    }

    // Verificar que quedó bien
    const userDoc = await db.collection('users').doc(userId).get();
    const userData = userDoc.data();

    console.log('📊 Datos finales en Firestore:');
    console.log(JSON.stringify(userData, null, 2));

    console.log('\n✨ ¡Setup completado!\n');
    console.log('Ahora puedes iniciar sesión con:');
    console.log(`  Usuario: ${username}`);
    console.log(`  Contraseña: ${password}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupAdmin();
