# Guía de Configuración Inicial - NEXUS IT

Esta guía te ayudará a configurar el sistema por primera vez, específicamente creando el primer usuario administrador.

## Requisitos Previos

1. Proyecto de Firebase creado ([console.firebase.google.com](https://console.firebase.google.com))
2. Credenciales de Firebase configuradas en `packages/shared/src/config/firebase.ts`
3. Firebase Firestore habilitado en tu proyecto

## Crear el Primer Usuario Administrador

Como el sistema usa autenticación basada en usuarios (no email), necesitas crear el primer administrador **directamente en Firestore**.

### Opción 1: Usar la Consola de Firebase (Recomendado)

1. Ve a la [Consola de Firebase](https://console.firebase.google.com)
2. Selecciona tu proyecto `nexus-it-e8568`
3. En el menú lateral, clic en **Firestore Database**
4. Clic en **Iniciar colección** (o Add collection si ya existe)
5. Nombre de la colección: `users`
6. Agrega el primer documento con estos campos:

```
username: "lsolis"         (string)
password: "QXJlczEyMDk="   (string) - Esta es "Ares1209" hasheada con btoa
name: "Luis Solis"         (string)
role: "admin"              (string)
company: "ESPECIAS_NATURALES_DEL_NORTE"  (string)
department: "IT"           (string - opcional)
phone: ""                  (string - opcional)
createdAt: [Timestamp]     (timestamp - usa el botón para agregar timestamp actual)
updatedAt: [Timestamp]     (timestamp - usa el botón para agregar timestamp actual)
isActive: true             (boolean)
```

7. Guarda el documento

### Opción 2: Usar el SDK de Firebase (Para Desarrolladores)

Si prefieres crear el usuario mediante código, puedes ejecutar este script una sola vez:

```javascript
// crear-admin.js
const admin = require('firebase-admin');
const serviceAccount = require('./path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function createAdmin() {
  await db.collection('users').add({
    username: 'lsolis',
    password: btoa('Ares1209'), // En producción usar bcrypt
    name: 'Luis Solis',
    role: 'admin',
    company: 'ESPECIAS_NATURALES_DEL_NORTE',
    department: 'IT',
    phone: '',
    createdAt: admin.firestore.Timestamp.now(),
    updatedAt: admin.firestore.Timestamp.now(),
    isActive: true
  });
  
  console.log('Administrador creado exitosamente');
}

createAdmin();
```

## Generar Hash de Contraseña

Para crear más usuarios manualmente, necesitas generar el hash de la contraseña. Puedes usar la consola del navegador:

1. Abre las DevTools (F12) en Chrome/Edge
2. Ve a la pestaña Console
3. Escribe: `btoa('tuContraseña')`
4. Presiona Enter
5. Copia el resultado y úsalo como valor del campo `password`

**Ejemplo:**
- Contraseña: `Ares1209`
- Hash: `QXJlczEyMDk=`

## Primer Inicio de Sesión

1. Ejecuta la aplicación desktop o mobile
2. En la pantalla de login:
   - **Usuario:** lsolis
   - **Contraseña:** Ares1209

3. Una vez autenticado, ve a la sección **Usuarios** (solo visible para administradores)

## Crear Más Usuarios desde la Aplicación

Después de iniciar sesión como administrador:

1. Ve a la sección **Usuarios** en el menú lateral
2. Clic en **Crear Usuario**
3. Completa el formulario:
   - Usuario (username)
   - Contraseña
   - Nombre completo
   - Empresa
   - Rol (Usuario, Gerente, Administrador)
   - Departamento (opcional)
   - Teléfono (opcional)
4. Clic en **Crear Usuario**

## Roles de Usuario

- **Administrador (`admin`)**: Acceso completo, puede gestionar usuarios, equipos, tickets y configuración
- **Gerente (`manager`)**: Acceso a dashboard, equipos y tickets (sin gestión de usuarios)
- **Usuario (`user`)**: Acceso básico a tickets y consulta de equipos

## Empresas Disponibles

1. **ESPECIAS_NATURALES_DEL_NORTE** - Especias Naturales del Norte
2. **GRUPO_AMEX** - Grupo AMEX
3. **MONTACARGAS_DE_JUAREZ** - Montacargas de Juárez
4. **AMEX_JUAREZ** - AMEX Juárez

## Seguridad de Contraseñas

⚠️ **IMPORTANTE:** El sistema actual usa codificación base64 (`btoa`) para almacenar contraseñas, lo cual es **solo para desarrollo**.

**Para producción, debes:**
1. Implementar hashing seguro con bcrypt o argon2
2. Actualizar las funciones `hashPassword` y `verifyPassword` en `packages/shared/src/services/users.ts`

Ejemplo con bcrypt:
```typescript
import bcrypt from 'bcryptjs';

const hashPassword = async (password: string): Promise<string> => {
  return await bcrypt.hash(password, 10);
};

const verifyPassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};
```

## Reglas de Firestore (Seguridad)

Asegúrate de configurar reglas de seguridad en Firestore. Ejemplo básico:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Colección de usuarios - solo lectura para autenticados
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if false; // Solo desde la app
    }
    
    // Colección de sesiones
    match /sessions/{sessionId} {
      allow read, write: if request.auth != null;
    }
    
    // Equipos
    match /equipment/{equipmentId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    // Tickets
    match /tickets/{ticketId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## Troubleshooting

### No puedo iniciar sesión
- Verifica que el usuario exista en Firestore
- Confirma que el campo `isActive` esté en `true`
- Revisa que la contraseña esté correctamente hasheada

### Error de permisos en Firestore
- Revisa las reglas de seguridad en Firebase Console
- Asegúrate de que Firestore esté habilitado en tu proyecto

### La sesión expira rápidamente
- Las sesiones duran 7 días por defecto
- Si necesitas cambiar la duración, edita `packages/shared/src/services/users.ts` línea 136

## Próximos Pasos

1. ✅ Crear usuario administrador
2. ✅ Iniciar sesión
3. Crear usuarios para tu equipo
4. Configurar empresas y departamentos
5. Comenzar a registrar equipos
6. Gestionar tickets de soporte

## Soporte

Si encuentras problemas durante la configuración inicial, revisa:
- [README.md](./README.md) - Información general del proyecto
- [SETUP.md](./SETUP.md) - Instalación y configuración completa
- [GUIDE.md](./GUIDE.md) - Guía de uso de la aplicación
