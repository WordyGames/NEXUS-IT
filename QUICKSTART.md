# 🚀 INICIO RÁPIDO - NEXUS IT

## ⚡ Pasos para Empezar

### 1️⃣ Instalar Dependencias
```powershell
# Opción A: Script automático (Recomendado)
.\quick-start.ps1

# Opción B: Manual
npm install
cd packages/shared && npm run build && cd ../..
```

### 2️⃣ Configurar Firebase
Ver [SETUP.md](SETUP.md) para:
- Crear usuario administrador
- Configurar reglas de Firestore
- Habilitar Authentication

**Credenciales de prueba:**
- Email: `admin@nexusit.com`
- Password: (la que configures)

### 3️⃣ Ejecutar Aplicación

#### Desktop
```powershell
cd apps/desktop
npm run dev
```
Se abrirá la app en `http://localhost:5173` y luego en Electron

#### Mobile
```powershell
cd apps/mobile
npm start
```
Escanea el QR con Expo Go desde tu celular

## 📱 Apps Disponibles

```
nexus-it/
├── apps/
│   ├── desktop/    → Electron (Windows/Mac)
│   └── mobile/     → React Native (Android/iOS)
└── packages/
    └── shared/     → Código compartido
```

## 🎯 Primeros Pasos Después de Instalar

1. **Login como Admin**
   - Usa las credenciales que creaste

2. **Dashboard**
   - Verás tarjetas de las 4 empresas
   - Estadísticas generales

3. **Crear Equipo**
   - Ve a "Equipos" → "Nuevo Equipo"
   - Llena los datos y specs
   - Selecciona empresa

4. **Crear Ticket**
   - Ve a "Tickets" → "Nuevo Ticket"
   - Describe el problema
   - Selecciona prioridad

5. **Gestionar desde Móvil**
   - Abre la app móvil
   - Login con mismas credenciales
   - Consulta equipos y tickets

## 🔧 Comandos Útiles

### Root
```powershell
npm run dev          # Ejecutar todas las apps
npm run build        # Compilar todo
npm run clean        # Limpiar node_modules
```

### Desktop
```powershell
npm run dev          # Desarrollo
npm run build        # Compilar
npm run dist         # Crear instalador
npm run dist:win     # Solo Windows
npm run dist:mac     # Solo macOS
```

### Mobile
```powershell
npm start            # Iniciar Expo
npm run android      # Ejecutar en Android
npm run ios          # Ejecutar en iOS (requiere macOS)
```

## 📚 Documentación

- [README.md](README.md) - Información general
- [SETUP.md](SETUP.md) - Configuración detallada
- [GUIDE.md](GUIDE.md) - Guía de uso completa

## 🏢 Empresas y Colores

| Empresa | Color | Hex |
|---------|-------|-----|
| ESPECIAS NATURALES DEL NORTE | 🟢 Verde | #10b981 |
| GRUPO AMEX | 🔵 Azul | #3b82f6 |
| MONTACARGAS DE JUAREZ | 🟠 Ámbar | #f59e0b |
| AMEX JUAREZ | 🟣 Púrpura | #8b5cf6 |

## ✅ Checklist de Primera Vez

- [ ] Instalar Node.js 18+
- [ ] Clonar repositorio
- [ ] Ejecutar `npm install`
- [ ] Compilar `packages/shared`
- [ ] Configurar Firebase
- [ ] Crear usuario admin
- [ ] Probar login en Desktop
- [ ] Probar login en Mobile
- [ ] Crear equipo de prueba
- [ ] Crear ticket de prueba

## 🆘 Problemas Comunes

### Error: Cannot find module '@nexus-it/shared'
```powershell
cd packages/shared
npm run build
```

### Error: Firebase not initialized
- Verifica que exista `packages/shared/src/config/firebase.ts`
- Revisa que las credenciales sean correctas

### Error en Electron: "Failed to load URL"
- Espera a que Vite compile (mensaje "VITE ready")
- Reinicia con `npm run dev`

### Expo no se conecta
- Verifica WiFi (mismo que PC)
- Reinicia Expo: `r` en terminal
- Limpia cache: `expo start -c`

## 🎨 Características Implementadas

✅ **Sistema Completo**
- Autenticación con Firebase
- Gestión de equipos con specs
- Sistema de tickets
- Dashboard con estadísticas
- Tarjetas responsivas por empresa
- Panel de administrador
- Auto-actualización (desktop)

✅ **Apps Multiplataforma**
- Desktop: Windows + macOS
- Mobile: Android + iOS

✅ **Arquitectura Moderna**
- Monorepo con workspaces
- TypeScript
- Firebase (Auth + Firestore)
- React + Electron (Desktop)
- React Native + Expo (Mobile)

## 📞 Soporte

**Encargado de Sistemas**
- Email: sistemas@nexusit.com
- Crear ticket en el sistema

## 🚀 Siguiente Nivel

Una vez que domines lo básico:

1. **Personalizar**
   - Cambiar colores en `tailwind.config.js`
   - Modificar logos
   - Ajustar textos

2. **Deploy**
   - Crear builds de producción
   - Configurar auto-updates
   - Publicar en stores

3. **Extender**
   - Agregar más empresas
   - Nuevos tipos de equipos
   - Categorías personalizadas

---

**¡Listo para empezar! 🎉**

Ejecuta `.\quick-start.ps1` y comienza a usar NEXUS IT.
