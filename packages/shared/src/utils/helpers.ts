import { Timestamp } from '../types';

/**
 * Convierte un Timestamp a Date
 */
export const timestampToDate = (timestamp: Timestamp | Date): Date => {
  if (timestamp instanceof Date) {
    return timestamp;
  }
  return timestamp.toDate();
};

/**
 * Formatea una fecha en formato local
 */
export const formatDate = (date: Date | Timestamp, locale: string = 'es-MX'): string => {
  const d = timestampToDate(date);
  return d.toLocaleDateString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Formatea una fecha con hora
 */
export const formatDateTime = (date: Date | Timestamp, locale: string = 'es-MX'): string => {
  const d = timestampToDate(date);
  return d.toLocaleString(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Genera un número de ticket único
 */
export const generateTicketNumber = (): string => {
  const year = new Date().getFullYear();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TK-${year}-${random}`;
};

/**
 * Calcula tiempo transcurrido en formato legible
 */
export const timeAgo = (date: Date | Timestamp, locale: string = 'es-MX'): string => {
  const d = timestampToDate(date);
  const seconds = Math.floor((new Date().getTime() - d.getTime()) / 1000);
  
  let interval = seconds / 31536000;
  if (interval > 1) {
    return Math.floor(interval) + (locale === 'es-MX' ? ' años' : ' years');
  }
  
  interval = seconds / 2592000;
  if (interval > 1) {
    return Math.floor(interval) + (locale === 'es-MX' ? ' meses' : ' months');
  }
  
  interval = seconds / 86400;
  if (interval > 1) {
    return Math.floor(interval) + (locale === 'es-MX' ? ' días' : ' days');
  }
  
  interval = seconds / 3600;
  if (interval > 1) {
    return Math.floor(interval) + (locale === 'es-MX' ? ' horas' : ' hours');
  }
  
  interval = seconds / 60;
  if (interval > 1) {
    return Math.floor(interval) + (locale === 'es-MX' ? ' minutos' : ' minutes');
  }
  
  return locale === 'es-MX' ? 'justo ahora' : 'just now';
};

/**
 * Valida email
 */
export const isValidEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Valida UUID v1-v5
 */
export const isValidUuid = (value: string): boolean => UUID_REGEX.test(value);

/**
 * Genera UUID v4 incluso cuando randomUUID no está disponible
 */
export const generateUuid = (): string => {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);

  if (typeof globalThis.crypto?.getRandomValues === 'function') {
    globalThis.crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }

  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));

  return [
    hex.slice(0, 4).join(''),
    hex.slice(4, 6).join(''),
    hex.slice(6, 8).join(''),
    hex.slice(8, 10).join(''),
    hex.slice(10, 16).join('')
  ].join('-');
};

/**
 * Capitaliza primera letra
 */
export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

/**
 * Trunca texto con ellipsis
 */
export const truncate = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
};

/**
 * Obtiene color según empresa
 */
export const getCompanyColor = (company: string): string => {
  const colors: Record<string, string> = {
    'ESPECIAS NATURALES DEL NORTE': '#10b981', // green
    'GRUPO AMEX': '#3b82f6', // blue


  };
  return colors[company] || '#6b7280'; // gray default
};

/**
 * Obtiene iniciales de un nombre
 */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
};
