import { Timestamp } from 'firebase/firestore';

// Tipo para adjuntos
export interface Attachment {
  id: string;
  fileName: string;
  fileType: string; // image/jpeg, application/pdf, etc.
  fileSize: number; // en bytes
  url: string; // URL de descarga en Storage
  storagePath?: string; // Ruta en Firebase Storage para poder eliminar/reubicar
  uploadedBy: string; // ID del usuario
  uploadedByName: string;
  createdAt: Date | Timestamp;
}

// Enum para empresas
export enum Company {
  ESPECIAS_NATURALES = 'ESPECIAS NATURALES DEL NORTE',
  GRUPO_AMEX = 'GRUPO AMEX',
  EQUIPOS_OSENAL = 'EQUIPOS OSENAL'
}

// Tipo para equipos
export interface Equipment {
  id: string;
  company: Company;
  name: string;
  type: 'desktop' | 'laptop' | 'phone' | 'tablet' | 'server' | 'printer' | 'router' | 'switch' | 'other';
  specs: EquipmentSpecs;
  location: string;
  assignedTo?: string;
  purchaseDate?: Date | Timestamp;
  warrantyExpiration?: Date | Timestamp;
  status: 'active' | 'inactive' | 'maintenance' | 'retired';
  notes?: string;
  attachments?: Attachment[]; // Fotos o documentos del equipo
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  createdBy: string;
}

// Specs técnicas de equipos
export interface EquipmentSpecs {
  // Hardware
  cpu?: string;
  ram?: string;
  storage?: string;
  gpu?: string;
  
  // Software
  os?: string;
  osVersion?: string;
  
  // Network
  ipAddress?: string;
  macAddress?: string;
  hostname?: string;
  
  // Otros
  serialNumber?: string;
  imei?: string;
  phoneNumber?: string;
  googleAccountEmail?: string;
  googleAccountPassword?: string;
  model?: string;
  manufacturer?: string;
  
  // Para impresoras
  printerType?: 'laser' | 'inkjet' | 'multifunctional';
  
  // Para red
  ports?: number;
  speed?: string;
}

// Tipo para tickets
export enum TicketPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent'
}

export enum TicketStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  RESOLVED = 'resolved',
  CLOSED = 'closed',
  CANCELLED = 'cancelled'
}

export enum TicketCategory {
  HARDWARE = 'hardware',
  SOFTWARE = 'software',
  NETWORK = 'network',
  EMAIL = 'email',
  PRINTER = 'printer',
  ACCESS = 'access',
  OTHER = 'other'
}

export interface Ticket {
  id: string;
  ticketNumber: string; // Formato: TK-2026-0001
  company: Company;
  title: string;
  description: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  createdBy: string;
  createdByName: string;
  assignedTo?: string; // ID del administrador
  assignedToName?: string;
  equipment?: string; // ID del equipo relacionado
  attachments?: Attachment[]; // Fotos, documentos, etc.
  comments?: TicketComment[];
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  resolvedAt?: Date | Timestamp;
  closedAt?: Date | Timestamp;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  userId: string;
  userName: string;
  text: string;
  attachments?: Attachment[];
  createdAt: Date | Timestamp;
}

// Tipo para mantenimientos
export enum MaintenanceType {
  PREVENTIVO = 'preventivo',
  CORRECTIVO = 'correctivo',
  ACTUALIZACION = 'actualizacion',
  INSPECCION = 'inspeccion'
}

export enum MaintenanceStatus {
  PROGRAMADO = 'programado',
  EN_PROGRESO = 'en_progreso',
  COMPLETADO = 'completado',
  CANCELADO = 'cancelado',
  ATRASADO = 'atrasado'
}

export interface MaintenanceTask {
  id: string;
  description: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: Date | Timestamp;
  notes?: string;
}

export interface Maintenance {
  id: string;
  equipmentId: string;
  equipmentName: string;
  company: Company;
  type: MaintenanceType;
  status: MaintenanceStatus;
  title: string;
  description: string;
  notificationEmail?: string;
  scheduledDate: Date | Timestamp;
  completedDate?: Date | Timestamp;
  nextMaintenanceDate?: Date | Timestamp; // Para mantenimientos recurrentes
  frequency?: 'weekly' | 'monthly' | 'quarterly' | 'semiannual' | 'annual'; // Frecuencia de repetición
  assignedTo?: string; // Técnico asignado
  assignedToName?: string;
  tasks: MaintenanceTask[]; // Checklist de tareas
  notes?: string;
  attachments?: Attachment[]; // Fotos, reportes, etc.
  cost?: number; // Costo del mantenimiento
  createdBy: string;
  createdByName: string;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

export interface MaintenanceFilters {
  company?: Company;
  equipmentId?: string;
  type?: MaintenanceType;
  status?: MaintenanceStatus;
  assignedTo?: string;
  dateFrom?: Date;
  dateTo?: Date;
  search?: string;
}

// Tipo para usuarios
export enum UserRole {
  ADMIN = 'admin',
  USER = 'user'
}

export enum UserPermission {
  DASHBOARD_ADMIN = 'dashboard.admin',
  EQUIPMENT_VIEW = 'equipment.view',
  EQUIPMENT_MANAGE = 'equipment.manage',
  MAINTENANCES_VIEW = 'maintenances.view',
  MAINTENANCES_MANAGE = 'maintenances.manage',
  REPORTS_VIEW = 'reports.view',
  WARRANTY_VIEW = 'warranty.view',
  USERS_VIEW = 'users.view',
  USERS_MANAGE = 'users.manage',
  SETTINGS_VIEW = 'settings.view',
  TICKETS_VIEW = 'tickets.view',
  TICKETS_VIEW_ALL = 'tickets.view_all',
  TICKETS_CHANGE_STATUS = 'tickets.change_status',
  NOTIFICATIONS_VIEW = 'notifications.view'
}

export type UserPermissions = Partial<Record<UserPermission, boolean>>;

export interface User {
  id: string; // ID único generado
  username: string; // Usuario único para login
  password: string; // Hash de contraseña
  name: string;
  role: UserRole;
  permissions?: UserPermissions;
  company: Company;
  department?: string;
  position?: string; // Puesto/cargo del empleado
  phone?: string;
  email?: string;
  photoURL?: string;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
  lastLogin?: Date | Timestamp;
  isActive: boolean;
}

// Sesión de usuario
export interface UserSession {
  userId: string;
  username: string;
  name: string;
  role: UserRole;
  company: Company;
  loginAt: Date | Timestamp;
  expiresAt: Date | Timestamp;
}

// Tipo para estadísticas del dashboard
export interface DashboardStats {
  totalEquipment: number;
  equipmentByCompany: Record<Company, number>;
  equipmentByStatus: Record<Equipment['status'], number>;
  totalTickets: number;
  ticketsByStatus: Record<TicketStatus, number>;
  ticketsByPriority: Record<TicketPriority, number>;
  openTickets: number;
  resolvedTickets: number;
  averageResolutionTime: number; // en horas
}

// Tipo para filtros
export interface EquipmentFilters {
  company?: Company;
  type?: Equipment['type'];
  status?: Equipment['status'];
  search?: string;
  assignedTo?: string;
}

export interface TicketFilters {
  company?: Company;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assignedTo?: string;
  createdBy?: string;
  createdByName?: string;
  search?: string;
}

// Notificaciones inteligentes
export enum NotificationType {
  WARRANTY_EXPIRING = 'warranty_expiring',
  MAINTENANCE_UPCOMING = 'maintenance_upcoming',
  TICKET_STATUS_CHANGED = 'ticket_status_changed',
  TICKET_COMMENTED = 'ticket_commented',
  MAINTENANCE_COMPLETED = 'maintenance_completed'
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  dedupeKey?: string;
  references: {
    equipmentId?: string;
    ticketId?: string;
    maintenanceId?: string;
  };
  createdAt: Date | Timestamp;
  expiresAt?: Date | Timestamp; // Para no mostrar notificaciones antiguas
}

// Chat de soporte individual por usuario
export enum SupportChatSender {
  USER = 'user',
  AGENT = 'agent'
}

export interface SupportChatMessage {
  id: string;
  userId: string;
  userName: string;
  sender: SupportChatSender;
  senderName?: string;
  text: string;
  createdAt: Date | Timestamp;
}

export interface SupportChatThread {
  id: string; // Igual al userId
  userId: string;
  userName: string;
  lastMessage?: string;
  lastSender?: SupportChatSender;
  hasUnreadForUser?: boolean;
  hasUnreadForAdmin?: boolean;
  userLastReadAt?: Date | Timestamp;
  adminLastReadAt?: Date | Timestamp;
  lastMessageAt?: Date | Timestamp;
  createdAt: Date | Timestamp;
  updatedAt: Date | Timestamp;
}

// Carta Responsiva
export interface CartaResponsiva {
  id: string;
  equipmentId: string;
  userId: string;
  userName: string;
  userPosition?: string;
  userDepartment?: string;
  company: Company;
  equipmentInfo: {
    marca?: string;
    modelo?: string;
    uuid?: string;
    cpu?: string;
    ram?: string;
    serialNumber?: string;
    imei?: string;
    phoneNumber?: string;
    googleAccountEmail?: string;
    googleAccountPassword?: string;
  };
  notes?: string; // Notas adicionales
  generatedBy: string;
  generatedByName: string;
  generatedAt: Date | Timestamp;
  signedByEmployee?: boolean;
  signedByRH?: boolean;
  signatureEmployeeUrl?: string; // URL de firma en Storage
  signatureRHUrl?: string;
}
