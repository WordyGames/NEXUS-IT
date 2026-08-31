// ── Caché offline de solo lectura ────────────────────────────────────────────
// NEXUS-IT no tenía ninguna capa de caché local: cada pantalla pedía todo
// directo a Supabase, así que sin internet no cargaba nada (ni siquiera datos
// que el usuario ya había visto segundos antes).
//
// Este módulo agrega una caché de "última copia buena" para las consultas de
// lectura: si la petición a Supabase tiene éxito, se guarda el resultado en
// localStorage; si falla por un problema de red, se devuelve la última copia
// guardada en vez de tronar la pantalla. NO cubre escritura offline (crear/
// editar sigue requiriendo conexión) — es intencional, alcance v1.

const PREFIX = 'nexus-it-offline-cache::';

interface CacheEntry<T> {
  data: T;
  cachedAt: string; // ISO
}

// Revive strings con forma de fecha ISO-8601 a instancias de Date al leer de
// localStorage, ya que los servicios (equipment.ts, tickets.ts, etc.) esperan
// campos como `createdAt`/`updatedAt` como Date, no como string.
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
function reviveDates(_key: string, value: unknown): unknown {
  if (typeof value === 'string' && ISO_DATE_RE.test(value)) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) return d;
  }
  return value;
}

function cacheKey(namespace: string, params?: unknown): string {
  return `${PREFIX}${namespace}::${params ? JSON.stringify(params) : 'all'}`;
}

export interface CachedRead<T> {
  data: T;
  cachedAt: Date;
}

export function readCache<T>(namespace: string, params?: unknown): CachedRead<T> | null {
  if (typeof window === 'undefined' || !window.localStorage) return null;
  try {
    const raw = window.localStorage.getItem(cacheKey(namespace, params));
    if (!raw) return null;
    const parsed = JSON.parse(raw, reviveDates) as CacheEntry<T>;
    return { data: parsed.data, cachedAt: new Date(parsed.cachedAt) };
  } catch {
    return null;
  }
}

function writeCache<T>(namespace: string, data: T, params?: unknown): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const entry: CacheEntry<T> = { data, cachedAt: new Date().toISOString() };
    window.localStorage.setItem(cacheKey(namespace, params), JSON.stringify(entry));
  } catch {
    // Cuota de localStorage llena u otro error al guardar — no es crítico,
    // simplemente esta consulta no queda cacheada para la próxima vez.
  }
}

// Heurística: ¿el error parece ser por falta de conexión (y no un error real
// de permisos/datos que sí debe mostrarse tal cual)?
export function isLikelyNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return true;
  const msg = error && typeof error === 'object' && 'message' in error
    ? String((error as { message: unknown }).message).toLowerCase()
    : '';
  return (
    msg.includes('failed to fetch') ||
    msg.includes('load failed') ||
    msg.includes('network') ||
    msg.includes('err_internet_disconnected') ||
    msg.includes('err_name_not_resolved') ||
    msg.includes('err_connection')
  );
}

/**
 * Envuelve una función de lectura (getEquipment, getTickets, etc.) con caché
 * offline de solo lectura:
 *  - Si la petición tiene éxito: guarda el resultado y lo retorna normal.
 *  - Si falla por un problema de red y hay copia en caché: devuelve esa copia
 *    (el llamador sigue viendo datos, aunque puedan estar desactualizados).
 *  - Si falla por otra razón (permisos, error real del servidor) o no hay
 *    nada en caché: relanza el error, igual que antes de este cambio.
 */
export async function withOfflineCache<T>(
  namespace: string,
  fetchFn: () => Promise<T>,
  params?: unknown
): Promise<T> {
  try {
    const data = await fetchFn();
    writeCache(namespace, data, params);
    return data;
  } catch (error) {
    if (isLikelyNetworkError(error)) {
      const cached = readCache<T>(namespace, params);
      if (cached) {
        console.warn(`[offlineCache] Sin conexión, usando copia local de "${namespace}" (guardada ${cached.cachedAt.toLocaleString('es-MX')})`);
        return cached.data;
      }
    }
    throw error;
  }
}
