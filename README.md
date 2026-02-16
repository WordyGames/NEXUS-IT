# NEXUS IT - Sistema de Gestión TI

Sistema integral de gestión de equipos informáticos y tickets de soporte para 4 empresas del grupo.

## ✨ Características Principales

✅ **Gestión de Equipos** - Alta, baja y modificación con specs completas  
✅ **Tarjetas Responsivas** - Vista por empresa con colores identificadores  
✅ **Sistema de Tickets** - Soporte técnico completo con prioridades  
✅ **Panel Admin** - Control total para el encargado de sistemas  
✅ **Auto-actualización** - Updates automáticos en app desktop  
✅ **Multi-plataforma** - Desktop (Windows/Mac) y Mobile (Android/iOS)

## 🏢 Empresas
- **ESPECIAS NATURALES DEL NORTE** (Verde)
- **GRUPO AMEX** (Azul)
- **EQUIPOS OSENAL** (Púrpura)

## 📱 Aplicaciones

### Desktop (Windows/Mac)
Aplicación Electron con React para gestión completa desde PC
```bash
cd apps/desktop
npm install
npm run dev
```

### Mobile (Android/iOS)
Aplicación React Native con Expo para gestión desde móvil
```bash
cd apps/mobile
npm install
npm start
```

## 🚀 Características

### Gestión de Equipos
- Alta, baja y modificación de equipos
- Registro de specs (CPU, RAM, Storage, SO, etc.)
- Búsqueda y filtrado por empresa
- Tarjetas responsivas por empresa

### Sistema de Tickets
- Creación de tickets de soporte
- Seguimiento de estado
- Asignación al administrador
- Historial de tickets

### Panel de Administrador
- Acceso exclusivo para encargado de sistemas
- Dashboard con estadísticas
- Gestión completa de equipos y tickets
- Exportación de reportes

### Auto-actualización
- Actualizaciones automáticas (desktop)
- Notificaciones de nuevas versiones
- Instalación sin intervención

## 🛠️ Tecnologías
- **Frontend**: React + TypeScript / React Native + TypeScript
- **Desktop**: Electron
- **Mobile**: Expo
- **Backend**: Firebase (Firestore, Auth, Analytics)
- **Estilos**: Tailwind CSS
- **Monorepo**: npm workspaces

## 📦 Instalación

### Requisitos Previos
- Node.js 18+
- npm o yarn
- Git

### Instalación General
```bash
# Clonar repositorio
git clone <repo-url>
cd nexus-it

# Instalar dependencias
npm install

# Configurar Firebase
# Actualizar packages/shared/src/config/firebase.ts con tus credenciales
```

## 🔥 Firebase Setup
El proyecto está configurado con:
- **Project ID**: nexus-it-e8568
- **Autenticación**: Sistema interno basado en usuarios (username/password)
- **Firestore**: Base de datos en tiempo real
- **Storage**: Almacenamiento de archivos
- **Analytics**: Seguimiento de uso

### Sistema de Autenticación
- ✅ Login con usuario y contraseña (sin email)
- ✅ Gestión de usuarios desde panel admin
- ✅ Sesiones con expiración de 7 días
- ✅ Control de roles (Admin, Gerente, Usuario)

**Primer uso**: Consulta [FIRST_TIME_SETUP.md](./FIRST_TIME_SETUP.md) para crear el primer administrador

## 📝 Scripts Disponibles

### Root
```bash
npm run dev          # Ejecutar todas las apps en desarrollo
npm run build        # Compilar todas las apps
npm run clean        # Limpiar node_modules y builds
```

### Desktop
```bash
npm run dev          # Modo desarrollo
npm run build        # Compilar para producción
npm run dist         # Crear instalador (Windows/Mac)
```

### Mobile
```bash
npm start            # Iniciar Expo
npm run android      # Ejecutar en Android
npm run ios          # Ejecutar en iOS
npm run build        # Compilar APK/IPA
```

## 👤 Administrador
El sistema cuenta con un panel exclusivo para el administrador de sistemas con control total sobre equipos, tickets y usuarios.

## 📄 Licencia
Propietario - NEXUS IT © 2026
