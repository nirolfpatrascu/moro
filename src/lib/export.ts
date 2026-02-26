export interface ExportColumn<T> {
  header: string;
  accessor: (row: T) => string | number;
}

export function exportToCSV<T>(
  data: T[],
  filename: string,
  columns: ExportColumn<T>[]
) {
  // BOM for proper UTF-8 encoding in Excel
  const BOM = "\uFEFF";

  const headers = columns.map((c) => `"${c.header}"`).join(",");
  const rows = data.map((row) =>
    columns
      .map((col) => {
        const val = col.accessor(row);
        if (typeof val === "number") return val;
        // Escape quotes in strings
        return `"${String(val).replace(/"/g, '""')}"`;
      })
      .join(",")
  );

  const csv = BOM + [headers, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
