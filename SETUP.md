# Guía de Configuración Inicial - NEXUS IT

## 1. Configuración de Firebase

### 1.1. Crear Proyecto Firebase
1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. El proyecto ya está creado: `nexus-it-e8568`
3. Credenciales ya configuradas en `packages/shared/src/config/firebase.ts`

### 1.2. Habilitar Servicios

#### Authentication
1. En Firebase Console → Authentication → Sign-in method
2. Habilitar **Email/Password**
3. (Opcional) Habilitar **Google Sign-in**

#### Firestore Database
1. En Firebase Console → Firestore Database
2. Crear base de datos en modo **producción**
3. Configurar reglas de seguridad:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Usuarios solo pueden leer/escribir sus propios datos
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth.uid == userId;
    }
    
    // Equipos: todos pueden leer, solo admins pueden escribir
    match /equipment/{equipmentId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Tickets: todos autenticados pueden leer/escribir
    match /tickets/{ticketId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if request.auth != null && 
                     get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
  }
}
```

#### Storage
1. En Firebase Console → Storage
2. Crear bucket
3. Configurar reglas:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /tickets/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
    
    match /equipment/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;
    }
  }
}
```

## 2. Crear Usuario Administrador

### Opción A: Desde Firebase Console
1. Ve a Authentication → Users → Add user
2. Email: `admin@nexusit.com` (o tu email)
3. Password: Crea una contraseña segura
4. Copia el UID generado

5. Ve a Firestore → users → Add document
6. Document ID: (pega el UID copiado)
7. Campos:
```json
{
  "email": "admin@nexusit.com",
  "name": "Administrador",
  "role": "admin",
  "company": "GRUPO AMEX",
  "isActive": true,
  "createdAt": (timestamp actual),
  "updatedAt": (timestamp actual)
}
```

### Opción B: Script de Inicialización (Recomendado)
Crear archivo `scripts/create-admin.js`:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function createAdmin() {
  try {
    // Crear usuario en Auth
    const userRecord = await admin.auth().createUser({
      email: 'admin@nexusit.com',
      password: 'TuPasswordSeguro123!',
      displayName: 'Administrador NEXUS IT'
    });

    // Crear documento en Firestore
    await admin.firestore().collection('users').doc(userRecord.uid).set({
      email: 'admin@nexusit.com',
      name: 'Administrador',
      role: 'admin',
      company: 'GRUPO AMEX',
      department: 'Sistemas',
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    console.log('✅ Usuario administrador creado exitosamente');
    console.log('UID:', userRecord.uid);
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

createAdmin();
```

## 3. Instalación del Proyecto

```bash
# Clonar repositorio
git clone <repo-url>
cd nexus-it

# Instalar dependencias
npm install

# Compilar paquete compartido
cd packages/shared
npm run build
cd ../..
```

## 4. Ejecutar Aplicaciones

### Desktop (Windows/Mac)
```bash
cd apps/desktop
npm run dev
```

Credenciales de prueba:
- Email: `admin@nexusit.com`
- Password: (la que configuraste)

### Mobile (Android/iOS)
```bash
cd apps/mobile
npm start
```

Luego:
- Presiona `a` para Android
- Presiona `i` para iOS
- Escanea el QR con Expo Go

## 5. Crear Build de Producción

### Desktop
```bash
cd apps/desktop

# Windows
npm run dist:win

# Mac
npm run dist:mac
```

Los instaladores se crearán en `apps/desktop/release/`

### Mobile
```bash
cd apps/mobile

# Configurar EAS (primera vez)
npm install -g eas-cli
eas login
eas build:configure

# Crear builds
npm run build:android
npm run build:ios
```

## 6. Configurar Auto-actualización (Desktop)

1. Crear servidor de actualizaciones o usar GitHub Releases
2. Configurar URL en `apps/desktop/package.json`:
```json
"publish": {
  "provider": "github",
  "owner": "tu-usuario",
  "repo": "nexus-it"
}
```

3. Publicar nueva versión:
```bash
npm run dist
```

## 7. Variables de Entorno (Opcional)

Crear `.env` en cada app si necesitas configuraciones específicas:

```env
# apps/desktop/.env
VITE_API_URL=https://api.nexusit.com

# apps/mobile/.env
EXPO_PUBLIC_API_URL=https://api.nexusit.com
```

## 8. Datos de Prueba

Crear equipos de prueba desde la app:
1. Iniciar sesión como admin
2. Ir a Equipos → Nuevo Equipo
3. Llenar formulario con datos reales de tu empresa

Crear tickets de prueba:
1. Cualquier usuario puede crear tickets
2. Ir a Tickets → Nuevo Ticket
3. El administrador puede gestionar todos los tickets

## 9. Backup de Datos

### Exportar Firestore
```bash
gcloud firestore export gs://nexus-it-backup
```

### Programar backups automáticos
En Firebase Console → Firestore → Import/Export

## 10. Monitoreo

### Analytics
- Revisa Firebase Analytics para ver uso de la app
- Eventos automáticos ya configurados

### Errores
- Configurar Crashlytics para apps móviles
- Revisar logs en Firebase Console

## Soporte

Para problemas o dudas:
1. Revisar logs en la consola de la app
2. Verificar conexión a Firebase
3. Comprobar reglas de Firestore/Storage
4. Revisar que el usuario tenga rol correcto

## Próximos Pasos

1. ✅ Crear usuario administrador
2. ✅ Probar login en Desktop y Mobile
3. ✅ Agregar datos de equipos reales
4. ✅ Capacitar usuarios en creación de tickets
5. ✅ Configurar backups automáticos
6. ✅ Deploy de producción
