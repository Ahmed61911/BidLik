import { useEffect, useMemo, useState } from "react";

/** Client-side pagination over an already-fetched array. Resets to page 1
 * whenever the source array changes (e.g. a filter narrows the result set). */
export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));

  // Reset to page 1 when the result set size changes (e.g. a filter/search
  // narrows it) — keyed on length, not array identity, since many callers
  // pass a freshly-filtered array on every render.
  useEffect(() => {
    setPage(1);
  }, [items.length]);

  useEffect(() => {
    if (page > pageCount) setPage(pageCount);
  }, [page, pageCount]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  return { page, setPage, pageCount, pageItems };
}
