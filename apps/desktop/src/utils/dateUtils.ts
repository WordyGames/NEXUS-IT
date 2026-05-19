import { Ticket } from '@nexus-it/shared';

/** Convierte cualquier representación de fecha de Firestore/JS a Date nativa */
export function toDate(date: unknown): Date {
  if (!date) return new Date();
  if (date instanceof Date) return date;
  if (typeof date === 'object' && date !== null) {
    if ('toDate' in date && typeof (date as any).toDate === 'function') {
      return (date as any).toDate();
    }
    if ('seconds' in date) {
      return new Date((date as any).seconds * 1000);
    }
  }
  const parsed = new Date(date as string | number);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

/** Formatea una fecha para mostrar (dd/mm/aaaa) */
export function formatDate(date: unknown): string {
  return toDate(date).toLocaleDateString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

/** Formatea fecha + hora (dd/mm/aaaa hh:mm) */
export function formatDateTime(date: unknown): string {
  return toDate(date).toLocaleString('es-MX', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Convierte fecha a string para inputs tipo date (yyyy-mm-dd) */
export function formatDateForInput(date: unknown): string {
  const d = toDate(date);
  return d.toISOString().split('T')[0];
}

/** Retorna el timestamp numérico de un ticket.createdAt para ordenación */
export function getTicketSortValue(ticket: Pick<Ticket, 'createdAt'>): number {
  const createdAt: unknown = ticket.createdAt;
  if (!createdAt) return 0;
  if (createdAt instanceof Date) return createdAt.getTime();
  if (typeof createdAt === 'object' && createdAt !== null) {
    if ('toDate' in createdAt) return (createdAt as any).toDate().getTime();
    if ('seconds' in createdAt) return (createdAt as any).seconds * 1000;
  }
  const parsed = new Date(createdAt as string | number).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
}

/** Diferencia en días entre hoy y una fecha (negativo = pasada) */
export function daysDiff(date: unknown): number {
  const target = toDate(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.floor((target.getTime() - today.getTime()) / 86_400_000);
}
