# NEXUS IT - Gestión de Equipos y Tickets

Sistema integral de gestión TI para 4 empresas del grupo empresarial.

## 🏢 Empresas Administradas

### 1. ESPECIAS NATURALES DEL NORTE
- Color identificador: Verde (#10b981)
- Sector: Producción de especias
- Equipos típicos: Estaciones de trabajo, servidores de producción

### 2. GRUPO AMEX
- Color identificador: Azul (#3b82f6)
- Sector: Grupo empresarial
- Equipos típicos: Equipos administrativos, servidores corporativos

### 3. MONTACARGAS DE JUAREZ
- Color identificador: Ámbar (#f59e0b)
- Sector: Servicios industriales
- Equipos típicos: PCs de taller, sistemas de diagnóstico

### 4. AMEX JUAREZ
- Color identificador: Púrpura (#8b5cf6)
- Sector: Operaciones locales
- Equipos típicos: Equipos de oficina, impresoras

## 👤 Roles de Usuario

### Administrador (Encargado de Sistemas)
- Acceso total al sistema
- Gestión de equipos (CRUD completo)
- Gestión de tickets
- Asignación de tickets
- Acceso a estadísticas
- Panel de configuración

### Usuario Regular
- Ver equipos de su empresa
- Crear tickets de soporte
- Ver estado de sus tickets
- Dashboard con información general

## 💻 Gestión de Equipos

### Tipos de Equipos Soportados
- **Desktop**: Computadoras de escritorio
- **Laptop**: Computadoras portátiles
- **Server**: Servidores
- **Printer**: Impresoras
- **Router**: Routers
- **Switch**: Switches de red
- **Other**: Otros dispositivos

### Información de Specs
Cada equipo puede registrar:

#### Hardware
- CPU (procesador)
- RAM (memoria)
- Storage (almacenamiento)
- GPU (tarjeta gráfica)

#### Software
- Sistema Operativo
- Versión del OS

#### Red
- Dirección IP
- Dirección MAC
- Hostname

#### Otros
- Número de serie
- Modelo
- Fabricante
- Tipo de impresora (para impresoras)
- Puertos/Velocidad (para equipos de red)

### Estados de Equipo
- **Active**: Equipo en uso activo
- **Inactive**: Equipo fuera de servicio temporal
- **Maintenance**: En mantenimiento
- **Retired**: Dado de baja permanente

## 🎫 Sistema de Tickets

### Flujo de Trabajo

1. **Creación**
   - Usuario detecta problema
   - Crea ticket con descripción
   - Selecciona categoría y prioridad
   - Sistema genera número único (TK-2026-XXXX)

2. **Asignación**
   - Ticket aparece en lista del administrador
   - Administrador revisa y asigna

3. **En Progreso**
   - Administrador trabaja en solución
   - Puede agregar comentarios
   - Usuario puede ver actualizaciones

4. **Resolución**
   - Administrador marca como resuelto
   - Se registra tiempo de resolución

5. **Cierre**
   - Ticket se cierra
   - Queda en historial para referencia

### Categorías de Tickets
- **Hardware**: Problemas de equipos físicos
- **Software**: Issues de aplicaciones/SO
- **Network**: Problemas de conectividad
- **Email**: Problemas de correo
- **Printer**: Issues de impresión
- **Access**: Problemas de acceso/permisos
- **Other**: Otros problemas

### Prioridades
- **Low**: No urgente, puede esperar
- **Medium**: Normal, atender en orden
- **High**: Importante, atender pronto
- **Urgent**: Crítico, atención inmediata

### Estados de Ticket
- **Open**: Creado, pendiente de atención
- **In Progress**: Siendo atendido
- **Resolved**: Solucionado
- **Closed**: Cerrado definitivamente
- **Cancelled**: Cancelado

## 📊 Dashboard y Estadísticas

### Métricas Principales
- Total de equipos
- Total de tickets
- Tickets abiertos
- Tiempo promedio de resolución

### Por Empresa
- Número de equipos por empresa
- Tickets activos por empresa
- Distribución de recursos

### Para Administrador
- Estado de todos los equipos
- Tipos de equipos
- Prioridades pendientes
- Tendencias de tickets

## 🔄 Auto-actualización (Desktop)

El sistema desktop incluye actualización automática:

1. Al iniciar, verifica nuevas versiones
2. Notifica al usuario si hay actualización
3. Usuario puede descargar
4. Instalación al cerrar la app

## 📱 Apps Disponibles

### Desktop (Electron)
- Windows (exe, nsis)
- macOS (dmg)
- Funcionalidad completa
- Auto-actualización
- Modo offline limitado

### Mobile (React Native/Expo)
- Android (APK/AAB)
- iOS (IPA)
- Consulta de equipos
- Creación de tickets
- Notificaciones push (futuro)

## 🔐 Seguridad

### Autenticación
- Firebase Authentication
- Email/Password
- Sesiones persistentes

### Autorización
- Roles basados en Firestore
- Reglas de seguridad en backend
- Validación client-side

### Datos
- Encriptación en tránsito (HTTPS)
- Almacenamiento seguro en Firestore
- Backups automáticos

## 📈 Mejoras Futuras

### Fase 2
- [ ] Reportes exportables (PDF/Excel)
- [ ] Gráficas de tendencias
- [ ] Notificaciones push móvil
- [ ] Escáner de códigos QR/barras
- [ ] Historial de cambios de equipo

### Fase 3
- [ ] Calendario de mantenimientos
- [ ] Inventario de software
- [ ] Gestión de licencias
- [ ] Chat en tiempo real
- [ ] Modo offline completo

### Fase 4
- [ ] IA para categorización automática
- [ ] Predicción de fallas
- [ ] Asignación inteligente de tickets
- [ ] Análisis de tendencias

## 🛠️ Mantenimiento

### Diario
- Revisar tickets nuevos
- Responder comentarios
- Actualizar estados

### Semanal
- Revisar equipos en mantenimiento
- Cerrar tickets resueltos
- Generar reportes

### Mensual
- Backup manual de datos
- Revisar métricas
- Actualizar documentación
- Capacitación de usuarios

## 📞 Contacto de Soporte

Para soporte técnico del sistema:
- Email: sistemas@nexusit.com
- Crear ticket dentro del sistema
- Teléfono: (656) XXX-XXXX

---

**© 2026 NEXUS IT - Sistema de Gestión TI**
