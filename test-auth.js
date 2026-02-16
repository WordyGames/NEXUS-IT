// Script para verificar autenticación
const admin = require('firebase-admin');

// Inicializar Firebase Admin (puedes usar las credenciales del proyecto)
// Por ahora vamos a verificar directamente desde la web

console.log('=== TEST DE AUTENTICACIÓN ===\n');

// Verificar hash de contraseña
const password = 'Ares1209';
const expectedHash = 'QXJlczEyMDk=';
const actualHash = Buffer.from(password).toString('base64');

console.log('Contraseña:', password);
console.log('Hash esperado:', expectedHash);
console.log('Hash generado:', actualHash);
console.log('¿Coinciden?:', expectedHash === actualHash);

console.log('\n=== DATOS PARA FIRESTORE ===\n');
console.log('Copia estos valores exactamente:\n');
console.log('username: lsolis');
console.log('password:', expectedHash);
console.log('name: Luis Solis');
console.log('role: admin');
console.log('company: ESPECIAS_NATURALES_DEL_NORTE');
console.log('department: IT');
console.log('phone: (vacío)');
console.log('isActive: true');
console.log('createdAt: [timestamp]');
console.log('updatedAt: [timestamp]');
