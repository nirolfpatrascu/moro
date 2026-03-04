import { useState, useCallback } from "react";

interface UsePaginatedListOptions {
  initialPageSize?: number;
  initialSortBy?: string;
  initialSortDir?: "asc" | "desc";
}

export function usePaginatedList(options: UsePaginatedListOptions = {}) {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(options.initialPageSize ?? 20);
  const [sortBy, setSortBy] = useState(options.initialSortBy ?? "createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">(options.initialSortDir ?? "desc");

  const toggleSort = useCallback(
    (field: string) => {
      if (sortBy === field) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(field);
        setSortDir("asc");
      }
      setPage(1);
    },
    [sortBy],
  );

  return { page, setPage, pageSize, sortBy, sortDir, toggleSort };
}
