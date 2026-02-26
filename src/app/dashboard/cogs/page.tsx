"use client";

import { useState, useEffect, useCallback } from "react";
import { StatCard, Card, CardHeader, CardTitle, CardContent } from "@/components/ui";
import { StatCardSkeleton } from "@/components/dashboard/skeleton";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { CogsCharts } from "@/components/dashboard/cogs-charts";
import { MonthlySpreadsheet, type SpreadsheetRow } from "@/components/dashboard/monthly-spreadsheet";
import { formatCurrency } from "@/lib/utils";
import { BarChart3, TrendingUp, Percent, Calculator } from "lucide-react";

const COGS_CATS = ["BAR", "BUCATARIE", "CONSUMABILE", "TRANSPORT", "LIVRARE", "DIVERSE"];
const SHORT_MONTHS = ["IAN", "FEB", "MAR", "APR", "MAI", "IUN", "IUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

function zeros(): number[] {
  return new Array(12).fill(0);
}

export default function CogsDashboardPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [locationId, setLocationId] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: "cogs-detail", year: String(year) });
      if (locationId) params.set("locationId", locationId);
      const res = await fetch(`/api/dashboard?${params}`);
      setData(await res.json());
    } catch {
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [year, locationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const buildRows = (): SpreadsheetRow[] => {
    if (!data) return [];
    const r: SpreadsheetRow[] = [];

    r.push({ label: "COGS pe categorie", values: zeros(), isHeader: true });
    for (const cat of COGS_CATS) {
      r.push({ label: cat, values: data.categories?.[cat] || zeros(), indent: 1 });
    }
    r.push({ label: "Total COGS", values: data.totalCogs || zeros(), isSummary: true });
    r.push({ label: "Venituri referinta", values: data.revenue || zeros(), indent: 0 });
    r.push({ label: "COGS % din Venituri", values: data.cogsPercent || zeros(), isHighlight: true, isPercent: true });

    return r;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#2D1B0E]">COGS</h2>
          <p className="mt-0.5 text-xs text-[#9B8B7F]">
            Cost of Goods Sold — {year}
          </p>
        </div>
        <DashboardFilters
          year={year}
          onYearChange={setYear}
          locationId={locationId}
          onLocationChange={setLocationId}
        />
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loading || !data ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard
              title="Total COGS"
              value={formatCurrency(data.totals?.cogs || 0)}
              icon={<BarChart3 className="h-4 w-4" />}
              subtitle={`An ${year}`}
            />
            <StatCard
              title="Venituri"
              value={formatCurrency(data.totals?.revenue || 0)}
              icon={<TrendingUp className="h-4 w-4" />}
              subtitle={`An ${year}`}
            />
            <StatCard
              title="COGS %"
              value={`${(data.totals?.cogsPercent || 0).toFixed(1)}%`}
              icon={<Percent className="h-4 w-4" />}
              subtitle={`An ${year}`}
            />
            <StatCard
              title="Media lunara COGS"
              value={formatCurrency(data.totals?.monthlyAvgCogs || 0)}
              icon={<Calculator className="h-4 w-4" />}
              subtitle={`An ${year}`}
            />
          </>
        )}
      </div>

      {/* Charts */}
      <CogsCharts
        categories={data?.categories || {}}
        loading={loading}
      />

      {/* Spreadsheet */}
      <MonthlySpreadsheet
        title={`COGS Detaliat — ${year}`}
        rows={buildRows()}
        loading={loading}
      />

      {/* Top Suppliers Table */}
      {data?.topSuppliers && data.topSuppliers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Top 10 Furnizori COGS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-sm">
                <thead>
                  <tr className="border-b-2 border-border">
                    <th className="py-2 pr-4 text-left font-semibold text-text-muted">Furnizor</th>
                    {SHORT_MONTHS.map((m) => (
                      <th key={m} className="px-2 py-2 text-right font-semibold text-text-muted whitespace-nowrap">
                        {m}
                      </th>
                    ))}
                    <th className="px-2 py-2 text-right font-bold text-text whitespace-nowrap">TOTAL</th>
                  </tr>
                </thead>
                <tbody>
                  {data.topSuppliers.map((s: { name: string; total: number; monthly: number[] }, i: number) => (
                    <tr key={i} className="border-b border-border-light hover:bg-background/50">
                      <td className="py-2 pr-4 font-medium whitespace-nowrap">{s.name}</td>
                      {(s.monthly || zeros()).map((v: number, j: number) => (
                        <td key={j} className="px-2 py-2 text-right tabular-nums whitespace-nowrap">
                          {formatCurrency(v)}
                        </td>
                      ))}
                      <td className="px-2 py-2 text-right font-bold tabular-nums whitespace-nowrap">
                        {formatCurrency(s.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
