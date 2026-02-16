import { 
  Equipment, 
  Ticket, 
  Maintenance, 
  User, 
  getEquipment, 
  getTickets,
  getMaintenances,
  getUsers 
} from '../index';

export interface SearchResult {
  type: 'equipment' | 'ticket' | 'maintenance' | 'user';
  id: string;
  title: string;
  subtitle?: string;
  company?: string;
  status?: string;
  data: Equipment | Ticket | Maintenance | User;
}

/**
 * Búsqueda global en todo el sistema
 * @param query Texto a buscar
 * @returns Array de resultados
 */
export const globalSearch = async (query: string): Promise<SearchResult[]> => {
  if (!query.trim() || query.length < 2) {
    return [];
  }

  const lowerQuery = query.toLowerCase();
  const results: SearchResult[] = [];

  try {
    // Buscar equipos
    const equipment = await getEquipment();
    const equipmentResults = equipment
      .filter(
        eq =>
          eq.name.toLowerCase().includes(lowerQuery) ||
          eq.id.toLowerCase().includes(lowerQuery) ||
          eq.specs.hostname?.toLowerCase().includes(lowerQuery) ||
          eq.specs.serialNumber?.toLowerCase().includes(lowerQuery)
      )
      .map(eq => ({
        type: 'equipment' as const,
        id: eq.id,
        title: eq.name,
        subtitle: `${eq.type} - ${eq.specs.hostname || 'Sin hostname'}`,
        company: eq.company,
        status: eq.status,
        data: eq
      }));
    results.push(...equipmentResults);

    // Buscar tickets
    const tickets = await getTickets();
    const ticketResults = tickets
      .filter(
        t =>
          t.title.toLowerCase().includes(lowerQuery) ||
          t.ticketNumber.toLowerCase().includes(lowerQuery) ||
          t.description.toLowerCase().includes(lowerQuery)
      )
      .map(t => ({
        type: 'ticket' as const,
        id: t.id,
        title: `${t.ticketNumber}: ${t.title}`,
        subtitle: t.description.substring(0, 100),
        company: t.company,
        status: t.status,
        data: t
      }));
    results.push(...ticketResults);

    // Buscar mantenimientos
    const maintenances = await getMaintenances();
    const maintenanceResults = maintenances
      .filter(
        m =>
          m.title.toLowerCase().includes(lowerQuery) ||
          m.equipmentName.toLowerCase().includes(lowerQuery) ||
          m.description.toLowerCase().includes(lowerQuery)
      )
      .map(m => ({
        type: 'maintenance' as const,
        id: m.id,
        title: m.title,
        subtitle: `${m.equipmentName} - ${m.type}`,
        company: m.company,
        status: m.status,
        data: m
      }));
    results.push(...maintenanceResults);

    // Buscar usuarios (solo para admins)
    try {
      const users = await getUsers();
      const userResults = users
        .filter(
          u =>
            u.name.toLowerCase().includes(lowerQuery) ||
            u.username.toLowerCase().includes(lowerQuery)
        )
        .map(u => ({
          type: 'user' as const,
          id: u.id,
          title: u.name,
          subtitle: `@${u.username} - ${u.role}`,
          company: u.company,
          data: u
        }));
      results.push(...userResults);
    } catch (err) {
      // Si no hay permisos para buscar usuarios, simplemente no los incluye
      console.debug('No se pueden buscar usuarios');
    }

    return results.slice(0, 50); // Máximo 50 resultados
  } catch (error) {
    console.error('Error en búsqueda global:', error);
    return [];
  }
};

/**
 * Obtiene sugerencias de búsqueda basadas en búsquedas previas
 * @returns Array de sugerencias
 */
export const getSearchSuggestions = (): string[] => {
  const stored = localStorage.getItem('search_history');
  if (!stored) return [];
  
  try {
    return JSON.parse(stored).slice(0, 5);
  } catch {
    return [];
  }
};

/**
 * Guarda una búsqueda en el historial
 * @param query Búsqueda a guardar
 */
export const saveSearchHistory = (query: string) => {
  if (!query.trim() || query.length < 2) return;

  const stored = localStorage.getItem('search_history');
  let history: string[] = [];
  
  try {
    history = JSON.parse(stored || '[]');
  } catch {
    history = [];
  }

  // Quitar duplicados y agregar al inicio
  history = [query, ...history.filter(h => h !== query)].slice(0, 10);
  localStorage.setItem('search_history', JSON.stringify(history));
};
