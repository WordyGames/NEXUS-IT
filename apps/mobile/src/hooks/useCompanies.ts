import { useSyncExternalStore } from 'react';
import { getCompanyList, subscribeCompanies } from '@nexus-it/shared';

/** Lista de empresas (se actualiza sola al agregar una nueva). */
export const useCompanies = (): string[] => useSyncExternalStore(subscribeCompanies, getCompanyList);
