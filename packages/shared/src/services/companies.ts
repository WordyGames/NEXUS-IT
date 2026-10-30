import { supabase } from '../config/supabase';
import { Company } from '../types';

// Catálogo dinámico de empresas (tabla public.companies). Se mantiene en
// memoria + localStorage para poder usarlo de forma síncrona en los selectores
// y seguir funcionando sin internet (cae a las empresas base).

const BUILT_IN: string[] = Object.values(Company);
const STORAGE_KEY = 'nexus-it-companies';

const merge = (names: string[]): string[] => Array.from(new Set([...BUILT_IN, ...names]));

const readStored = (): string[] => {
  try {
    if (typeof localStorage === 'undefined') return [...BUILT_IN];
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    return Array.isArray(parsed) ? merge(parsed.filter((n) => typeof n === 'string')) : [...BUILT_IN];
  } catch {
    return [...BUILT_IN];
  }
};

let current: string[] = readStored();
const listeners = new Set<() => void>();

const setCurrent = (names: string[]) => {
  const next = merge(names);
  if (next.length === current.length && next.every((n, i) => n === current[i])) return;
  current = next;
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  } catch { /* sin almacenamiento: se ignora */ }
  listeners.forEach((l) => l());
};

export const getCompanyList = (): string[] => current;

export const subscribeCompanies = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};

export const refreshCompanies = async (): Promise<string[]> => {
  const { data, error } = await supabase.from('companies').select('name').order('name');
  if (!error && data) setCurrent(data.map((r: { name: string }) => r.name));
  return current;
};

export const normalizeCompanyName = (name: string): string =>
  name.trim().replace(/\s+/g, ' ').toUpperCase();

export const addCompany = async (rawName: string): Promise<string> => {
  const name = normalizeCompanyName(rawName);
  if (name.length < 2 || name.length > 80) throw new Error('El nombre debe tener entre 2 y 80 caracteres');
  if (current.includes(name)) throw new Error('Esa empresa ya existe');

  const { error } = await supabase.from('companies').insert({ name });
  if (error) {
    if (error.code === '23505') throw new Error('Esa empresa ya existe');
    if (error.code === '42501') throw new Error('No tienes permiso para agregar empresas');
    throw error;
  }
  await refreshCompanies();
  return name;
};
