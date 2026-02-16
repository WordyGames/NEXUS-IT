# Guía de Integración: Notificaciones Inteligentes

## 🚀 Características Implementadas

### 1. **Alertas de Garantía** ⚠️
- Notificaciones cuando la garantía de un equipo está próxima a vencer (30 días)
- Visible solo para admins
- Se genera automáticamente al crear/actualizar equipos

### 2. **Recordatorios de Mantenimiento** 🔧
- Alertas para mantenimientos programados (7 días antes)
- Se notifica a todos los usuarios
- Se genera automáticamente al crear/actualizar mantenimientos

### 3. **Cambios de Tickets** 📌💬
- **Cambio de Estado**: Se notifica cuando cambia el estado (open → in_progress → closed)
- **Comentarios**: Se notifica cuando hay nuevos comentarios
- Los usuarios relevantes (creador y asignado) reciben la notificación

---

## 📁 Archivos Creados/Modificados

### Nuevos archivos:
- `packages/shared/src/services/notifications.ts` (298 líneas)
- `packages/shared/src/services/notificationsIntegration.ts` (62 líneas)
- `apps/desktop/src/components/NotificationBell.tsx` (159 líneas)
- `apps/desktop/src/components/NotificationsPanel.tsx` (187 líneas)
- `apps/desktop/src/pages/Notifications.tsx` (348 líneas)

### Archivos modificados:
- `packages/shared/src/types/index.ts` - Agregados tipos de notificación
- `packages/shared/src/index.ts` - Exportados servicios de notificación
- `apps/desktop/src/App.tsx` - Agregada ruta /notifications
- `apps/desktop/src/components/Navbar.tsx` - Agregado NotificationBell
- `apps/desktop/src/components/Sidebar.tsx` - Agregada opción de notificaciones

---

## 🔗 Integración en Servicios Existentes

### Para generar notificaciones de garantía (en Equipment.tsx o EquipmentForm.tsx):

```typescript
import { 
  triggerEquipmentNotifications, 
  createEquipment 
} from '@nexus-it/shared';

// Al crear or actualizar equipo
const handleSaveEquipment = async (equipmentData: Equipment) => {
  const id = await createEquipment(equipmentData);
  // Generar notificaciones de garantía
  await triggerEquipmentNotifications({ ...equipmentData, id });
};
```

### Para generar notificaciones de mantenimiento (en MaintenanceForm.tsx):

```typescript
import { 
  triggerMaintenanceNotifications, 
  createMaintenance 
} from '@nexus-it/shared';

// Al crear or actualizar mantenimiento
const handleSaveMaintenance = async (maintenanceData: Maintenance) => {
  const id = await createMaintenance(maintenanceData);
  await triggerMaintenanceNotifications({ ...maintenanceData, id });
};
```

### Para generar notificaciones de cambio de ticket (en TicketForm.tsx o Tickets.tsx):

```typescript
import { 
  triggerTicketStatusChange, 
  updateTicket 
} from '@nexus-it/shared';

// Al cambiar estado de ticket
const handleStatusChange = async (ticketId: string, newStatus: TicketStatus) => {
  const ticket = await getTicketById(ticketId);
  const previousStatus = ticket.status;
  
  await updateTicket(ticketId, { status: newStatus });
  
  // Generar notificación
  await triggerTicketStatusChange(
    { ...ticket, status: newStatus },
    previousStatus,
    userId, // ID del usuario que hace el cambio
    userName // Nombre del usuario
  );
};
```

### Para generar notificaciones de comentario (en TicketDetails.tsx):

```typescript
import { 
  triggerTicketComment, 
  addTicketComment 
} from '@nexus-it/shared';

// Al agregar comentario
const handleAddComment = async (ticketId: string, commentText: string) => {
  const ticket = await getTicketById(ticketId);
  
  await addTicketComment(ticketId, {
    text: commentText,
    createdBy: userId,
    createdByName: userName,
    createdAt: new Date()
  });
  
  // Generar notificación
  await triggerTicketComment(
    ticket,
    userId,
    userName,
    commentText
  );
};
```

---

## 🎨 UI Components

### NotificationBell (Header)
- Muestra contador de notificaciones no leídas
- Dropdown con últimas 5 notificaciones
- Link a página completa de notificaciones
- Se actualiza cada 30 segundos

### NotificationsPage (Full Page)
- Lista completa de todas las notificaciones
- Filtros por tipo (Garantía, Mantenimiento, Cambio de estado, Comentarios)
- Opción para ver solo no leídas
- Marcar individual o todas como leídas
- Click para ir a detalles de ticket/equipo

---

## 🔧 Tipos de Datos

```typescript
// Notification Interface
interface Notification {
  id: string;
  userId: string;
  type: NotificationType; // WARRANTY_EXPIRING | MAINTENANCE_UPCOMING | etc
  title: string;
  message: string;
  read: boolean;
  references: {
    equipmentId?: string;
    ticketId?: string;
    maintenanceId?: string;
  };
  createdAt: Date | Timestamp;
  expiresAt?: Date | Timestamp;
}

// NotificationType Enum
enum NotificationType {
  WARRANTY_EXPIRING = 'warranty_expiring',
  MAINTENANCE_UPCOMING = 'maintenance_upcoming',
  TICKET_STATUS_CHANGED = 'ticket_status_changed',
  TICKET_COMMENTED = 'ticket_commented',
  MAINTENANCE_COMPLETED = 'maintenance_completed'
}
```

---

## 📊 Firestore Collection

**Collection**: `notifications`

```
notifications/
├── {notificationId}
│   ├── userId: "user123"
│   ├── type: "warranty_expiring"
│   ├── title: "⚠️ Garantía próxima a vencer"
│   ├── message: "El equipo 'Dell Laptop' vence garantía en 25 días..."
│   ├── read: false
│   ├── references:
│   │   ├── equipmentId: "eq123"
│   ├── createdAt: Timestamp
│   └── expiresAt: Timestamp
```

---

## 🚀 Pasos Siguientes

1. **Integrar en Equipos**: Agregar `triggerEquipmentNotifications()` en EquipmentForm.tsx
2. **Integrar en Mantenimientos**: Agregar `triggerMaintenanceNotifications()` en MaintenanceForm.tsx
3. **Integrar en Tickets**: 
   - Agregar `triggerTicketStatusChange()` al cambiar estado
   - Agregar `triggerTicketComment()` al agregar comentarios
4. **Probar**: Crear equipos/tickets/mantenimientos y verificar notificaciones
5. **Opcional**: Agregar notificaciones push de escritorio

---

## 🛠️ Funciones de Limpieza (Cron Job)

Ejecutar periódicamente (ej: cada hora) para limpiar notificaciones expiradas:

```typescript
import { cleanExpiredNotifications } from '@nexus-it/shared';

// En un scheduled task o Cloud Function
await cleanExpiredNotifications();
```

---

## 📝 Testing

```typescript
// Crear notificación de prueba
import { getUnreadNotifications, markNotificationAsRead } from '@nexus-it/shared';

const userId = 'test-user-123';
const unread = await getUnreadNotifications(userId); // Contar no leídas
console.log(`Notificaciones no leídas: ${unread}`);

// Marcar como leída
await markNotificationAsRead(notificationId);
```

---

## ✅ Checklist de Integración

- [ ] Agregar imports en EquipmentForm.tsx
- [ ] Agregar trigger en handleSaveEquipment
- [ ] Agregar imports en MaintenanceForm.tsx
- [ ] Agregar trigger en handleSaveMaintenance
- [ ] Agregar imports en Tickets.tsx
- [ ] Agregar trigger en handleStatusChange
- [ ] Agregar trigger en handleAddComment
- [ ] Probar creación de equipo con garantía próxima
- [ ] Probar creación de mantenimiento próximo
- [ ] Probar cambio de estado de ticket
- [ ] Probar adición de comentario
- [ ] Verificar que aparecen en NotificationBell
- [ ] Verificar que aparecen en página de notificaciones
- [ ] Verificar filtros funcionan correctamente
