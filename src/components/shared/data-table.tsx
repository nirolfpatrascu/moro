"use client";

import { Card } from "@/components/ui";
import { ChevronLeft, ChevronRight, ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";
import { type ReactNode } from "react";

// ── Types ───────────────────────────────────────────────────

export interface Column<T> {
  key: string;
  label: string;
  sortable?: boolean;
  className?: string;
  render: (row: T) => ReactNode;
}

export interface PaginationInfo {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface DataTableProps<T extends { id: string }> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  pagination?: PaginationInfo;
  onPageChange?: (page: number) => void;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  onSort?: (field: string) => void;
  selected?: Set<string>;
  onToggleOne?: (id: string) => void;
  onToggleAll?: () => void;
  emptyIcon?: ReactNode;
  emptyText?: string;
  emptySubtext?: string;
  colCount?: number;
}

// ── Component ───────────────────────────────────────────────

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading,
  pagination,
  onPageChange,
  sortBy,
  sortDir,
  onSort,
  selected,
  onToggleOne,
  onToggleAll,
  emptyIcon,
  emptyText = "Nu exista date",
  emptySubtext,
}: DataTableProps<T>) {
  const hasSelection = selected && onToggleOne && onToggleAll;
  const allSelected = hasSelection && data.length > 0 && data.every((r) => selected.has(r.id));
  const totalCols = columns.length + (hasSelection ? 1 : 0);

  const SortIcon = ({ field }: { field: string }) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  return (
    <Card>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-background">
              {hasSelection && (
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={onToggleAll}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`px-4 py-3 font-medium text-text-secondary ${
                    col.sortable && onSort ? "cursor-pointer select-none hover:text-text" : ""
                  } ${col.className ?? "text-left"}`}
                  onClick={col.sortable && onSort ? () => onSort(col.key) : undefined}
                >
                  {col.sortable && onSort ? (
                    <span className="inline-flex items-center gap-1">
                      {col.label} <SortIcon field={col.key} />
                    </span>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border-light">
                  {Array.from({ length: totalCols }).map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 animate-pulse rounded bg-border-light" />
                    </td>
                  ))}
                </tr>
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={totalCols} className="px-4 py-12 text-center">
                  {emptyIcon && <div className="mx-auto mb-3">{emptyIcon}</div>}
                  <p className="text-text-muted">{emptyText}</p>
                  {emptySubtext && <p className="mt-1 text-xs text-text-muted">{emptySubtext}</p>}
                </td>
              </tr>
            ) : (
              data.map((row) => {
                const isSelected = hasSelection && selected.has(row.id);
                return (
                  <tr
                    key={row.id}
                    className={`border-b border-border-light last:border-0 transition-colors hover:bg-surface-hover ${
                      isSelected ? "bg-primary/5" : ""
                    }`}
                  >
                    {hasSelection && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => onToggleOne(row.id)}
                          className="h-4 w-4 rounded border-border accent-primary"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={`px-4 py-3 ${col.className ?? ""}`}>
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {pagination && pagination.totalPages > 1 && onPageChange && (
        <div className="flex items-center justify-between border-t border-border px-4 py-3">
          <p className="text-xs text-text-muted">
            {(pagination.page - 1) * pagination.pageSize + 1}–
            {Math.min(pagination.page * pagination.pageSize, pagination.total)} din{" "}
            {pagination.total}
          </p>
          <div className="flex items-center gap-1">
            <button
              className="rounded p-1 text-text-muted hover:bg-surface-hover disabled:opacity-40"
              onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
              disabled={pagination.page <= 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="px-2 text-xs text-text-secondary">
              {pagination.page} / {pagination.totalPages}
            </span>
            <button
              className="rounded p-1 text-text-muted hover:bg-surface-hover disabled:opacity-40"
              onClick={() => onPageChange(Math.min(pagination.totalPages, pagination.page + 1))}
              disabled={pagination.page >= pagination.totalPages}
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
