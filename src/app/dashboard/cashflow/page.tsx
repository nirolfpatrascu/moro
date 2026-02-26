"use client";

import { useState, useEffect, useCallback } from "react";
import { StatCard } from "@/components/ui";
import { StatCardSkeleton } from "@/components/dashboard/skeleton";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { CashFlowDetailChart } from "@/components/dashboard/cashflow-detail-chart";
import { MonthlySpreadsheet, type SpreadsheetRow } from "@/components/dashboard/monthly-spreadsheet";
import { formatCurrency } from "@/lib/utils";
import { ArrowDownCircle, ArrowUpCircle, Wallet, TrendingUp } from "lucide-react";

function zeros(): number[] {
  return new Array(12).fill(0);
}

export default function CashFlowDashboardPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [locationId, setLocationId] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: "cashflow-detail", year: String(year) });
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

    // INTRARI
    r.push({ label: "INTRARI", values: zeros(), isHeader: true });
    r.push({ label: "Vanzari Cash", values: data.inflows?.cashSales || zeros(), indent: 1 });
    r.push({ label: "Vanzari Card", values: data.inflows?.cardSales || zeros(), indent: 1 });
    r.push({ label: "Vanzari Transfer", values: data.inflows?.transferSales || zeros(), indent: 1 });
    r.push({ label: "Facturi colectate", values: data.inflows?.invoiceCollections || zeros(), indent: 1 });
    r.push({ label: "Total Intrari", values: data.inflows?.totalInflows || zeros(), isSummary: true });

    // IESIRI
    r.push({ label: "IESIRI", values: zeros(), isHeader: true });
    r.push({ label: "COGS", values: data.outflows?.cogs || zeros(), indent: 1 });
    r.push({ label: "Personal", values: data.outflows?.people || zeros(), indent: 1 });
    r.push({ label: "OPEX", values: data.outflows?.opex || zeros(), indent: 1 });
    r.push({ label: "Costuri Fixe", values: data.outflows?.costfix || zeros(), indent: 1 });
    r.push({ label: "Taxe", values: data.outflows?.taxe || zeros(), indent: 1 });
    r.push({ label: "Total Iesiri", values: data.outflows?.totalOutflows || zeros(), isSummary: true });

    // NET & CUMULATIVE
    r.push({ label: "FLUX NET", values: data.netCashFlow || zeros(), isHighlight: true });
    r.push({ label: "Flux Cumulativ", values: data.cumulativeCashFlow || zeros(), isHighlight: true });

    return r;
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#2D1B0E]">Cash Flow</h2>
          <p className="mt-0.5 text-xs text-[#9B8B7F]">
            Raport cash flow detaliat — {year}
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
              title="Total Intrari"
              value={formatCurrency(data.totals?.inflows || 0)}
              icon={<ArrowDownCircle className="h-4 w-4" />}
              subtitle={`An ${year}`}
            />
            <StatCard
              title="Total Iesiri"
              value={formatCurrency(data.totals?.outflows || 0)}
              icon={<ArrowUpCircle className="h-4 w-4" />}
              subtitle={`An ${year}`}
            />
            <StatCard
              title="Flux Net"
              value={formatCurrency(data.totals?.net || 0)}
              icon={<Wallet className="h-4 w-4" />}
              subtitle={`An ${year}`}
            />
            <StatCard
              title="Media lunara"
              value={formatCurrency(data.totals?.monthlyAvg || 0)}
              icon={<TrendingUp className="h-4 w-4" />}
              subtitle={`An ${year}`}
            />
          </>
        )}
      </div>

      {/* Chart */}
      <CashFlowDetailChart
        inflows={data?.inflows?.totalInflows || zeros()}
        outflows={data?.outflows?.totalOutflows || zeros()}
        netCashFlow={data?.netCashFlow || zeros()}
        loading={loading}
      />

      {/* Spreadsheet */}
      <MonthlySpreadsheet
        title={`Cash Flow Detaliat — ${year}`}
        rows={buildRows()}
        loading={loading}
      />
    </div>
  );
}
