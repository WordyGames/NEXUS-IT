import { useState } from 'react';

export function usePagination<T>(items: T[], pageSize: number) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const paginated = items.slice((clampedPage - 1) * pageSize, clampedPage * pageSize);
  return { page: clampedPage, setPage, paginated, totalPages };
}
