/** Texto sin acentos ni mayusculas, para buscar de forma tolerante. */
export const normalizeText = (value: string): string =>
  (value || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Todas las palabras de la consulta deben aparecer en el texto (en cualquier orden). */
export const matchesQuery = (query: string, ...fields: Array<string | undefined>): boolean => {
  const words = normalizeText(query).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  const haystack = normalizeText(fields.filter(Boolean).join(' '));
  return words.every((word) => haystack.includes(word));
};
