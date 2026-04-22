import { describe, expect, it } from 'vitest';
import {
  capitalize,
  generateTicketNumber,
  getCompanyColor,
  getInitials,
  isValidEmail,
  truncate,
} from './helpers';

describe('helpers utils', () => {
  it('genera ticket con formato esperado', () => {
    const year = new Date().getFullYear();
    const ticket = generateTicketNumber();

    expect(ticket).toMatch(new RegExp(`^TK-${year}-\\d{4}$`));
  });

  it('valida correos electrónicos correctamente', () => {
    expect(isValidEmail('equipo.soporte@nexus-it.com')).toBe(true);
    expect(isValidEmail('correo-invalido')).toBe(false);
    expect(isValidEmail('a@b')).toBe(false);
  });

  it('capitaliza correctamente cadenas', () => {
    expect(capitalize('nExUs it')).toBe('Nexus it');
  });

  it('trunca texto agregando elipsis cuando excede el máximo', () => {
    expect(truncate('abcdefghij', 8)).toBe('abcde...');
    expect(truncate('abc', 8)).toBe('abc');
  });

  it('resuelve color por empresa y usa fallback', () => {
    expect(getCompanyColor('GRUPO AMEX')).toBe('#3b82f6');
    expect(getCompanyColor('EMPRESA DESCONOCIDA')).toBe('#6b7280');
  });

  it('extrae iniciales de un nombre', () => {
    expect(getInitials('Luis Solis')).toBe('LS');
    expect(getInitials('Nexus')).toBe('N');
  });
});
