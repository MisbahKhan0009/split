import { useEffect, useMemo, useState } from "react";

/**
 * Client-side pagination over an already-sorted array. The backend already
 * returns list endpoints newest-first, so this only slices pages; it never
 * re-sorts, so callers stay in control of ordering.
 */
export function usePagination<T>(items: T[], pageSize: number) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  // If the underlying list shrinks (filtering, deletion) below the current
  // page, snap back into range instead of showing a blank page.
  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const goTo = (next: number) => setPage(Math.min(Math.max(1, next), pageCount));

  return {
    page,
    pageCount,
    pageItems,
    goTo,
    nextPage: () => goTo(page + 1),
    prevPage: () => goTo(page - 1),
    resetPage: () => setPage(1),
    total: items.length,
    pageSize,
  };
}
