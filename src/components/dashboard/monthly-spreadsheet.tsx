"use client";

import { cn, formatCurrency } from "@/lib/utils";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui";

export interface SpreadsheetRow {
  label: string;
  values: number[];
  isHeader?: boolean;
  isSummary?: boolean;
  isHighlight?: boolean;
  isPercent?: boolean;
  indent?: number;
}

const SHORT_MONTHS = ["IAN", "FEB", "MAR", "APR", "MAI", "IUN", "IUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function formatCell(value: number, isPercent?: boolean): string {
  if (isPercent) {
    return `${value.toFixed(1)}%`;
  }
  return formatCurrency(value);
}

export function MonthlySpreadsheet({
  title,
  rows,
  loading,
}: {
  title: string;
  rows: SpreadsheetRow[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96 animate-pulse rounded-lg bg-gray-100" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-xs">
            <thead>
              <tr className="border-b-2 border-gray-200">
                <th className="sticky left-0 z-10 bg-white py-2 pr-4 text-left text-xs font-semibold text-[#9B8B7F]">
                  Categorie
                </th>
                {SHORT_MONTHS.map((m) => (
                  <th key={m} className="px-2 py-2 text-right text-xs font-semibold text-[#9B8B7F] whitespace-nowrap">
                    {m}
                  </th>
                ))}
                <th className="px-2 py-2 text-right text-xs font-bold text-[#2D1B0E] whitespace-nowrap">
                  TOTAL
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const total = row.values.reduce((a, b) => a + b, 0);
                const totalDisplay = row.isPercent
                  ? row.values.filter((v) => v !== 0).length > 0
                    ? (total / row.values.filter((v) => v !== 0).length)
                    : 0
                  : total;

                return (
                  <tr
                    key={i}
                    className={cn(
                      "border-b border-gray-50 transition-colors hover:bg-[#FFF8F0]/50",
                      row.isHeader && "bg-[#6F4E37]/5",
                      row.isSummary && "border-t-2 border-gray-200 font-bold",
                      row.isHighlight && "bg-[#D4A574]/10 font-semibold"
                    )}
                  >
                    <td
                      className={cn(
                        "sticky left-0 z-10 py-1.5 pr-4 whitespace-nowrap text-sm",
                        row.isHeader ? "bg-[#6F4E37]/5 font-bold text-[#6F4E37]" : "bg-white",
                        row.isSummary && "bg-white font-bold",
                        row.isHighlight && "bg-[#D4A574]/10 font-semibold",
                        row.indent === 1 && "pl-4",
                        row.indent === 2 && "pl-8"
                      )}
                    >
                      {row.label}
                    </td>
                    {row.values.map((val, j) => (
                      <td
                        key={j}
                        className={cn(
                          "px-2 py-1.5 text-right tabular-nums whitespace-nowrap",
                          val < 0 && "text-[#F44336]",
                          row.isHeader && "font-bold"
                        )}
                      >
                        {row.isHeader ? "" : formatCell(val, row.isPercent)}
                      </td>
                    ))}
                    <td
                      className={cn(
                        "px-2 py-1.5 text-right font-bold tabular-nums whitespace-nowrap",
                        totalDisplay < 0 && "text-[#F44336]"
                      )}
                    >
                      {row.isHeader ? "" : formatCell(totalDisplay, row.isPercent)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
