"use client";

import { useState, useEffect, useCallback } from "react";
import { StatCard } from "@/components/ui";
import { StatCardSkeleton } from "@/components/dashboard/skeleton";
import { DashboardFilters } from "@/components/dashboard/dashboard-filters";
import { PnlChart } from "@/components/dashboard/pnl-chart";
import { MonthlySpreadsheet, type SpreadsheetRow } from "@/components/dashboard/monthly-spreadsheet";
import { formatCurrency } from "@/lib/utils";
import { TrendingUp, TrendingDown, Wallet, Percent } from "lucide-react";

const COGS_CATS = ["BAR", "BUCATARIE", "CONSUMABILE", "TRANSPORT", "LIVRARE", "DIVERSE"];
const PEOPLE_CATS = ["SALARII", "COLABORATORI", "TAXE SALARIU", "TICHETE MASA", "BONUSURI", "UNIFORME", "TRAINING"];
const OPEX_CATS = ["LICENTE", "CONSULTING", "CONTABILITATE", "AUTORIZATII", "MARKETING", "DIVERSE", "INVENTAR OBIECTE"];
const COSTFIX_CATS = ["CHIRII", "UTILITATI", "BANCA", "DIVERSE"];
const TAXE_CATS = ["IMPOZIT VENIT", "TVA", "ALTE TAXE"];

function zeros(): number[] {
  return new Array(12).fill(0);
}

export default function PnlDashboardPage() {
  const [year, setYear] = useState(new Date().getFullYear());
  const [locationId, setLocationId] = useState("");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ type: "pnl", year: String(year) });
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

  // Build total expenses array for chart
  const totalExpenses = data
    ? zeros().map(
        (_, i) =>
          (data.cogs?.total?.[i] || 0) +
          (data.people?.total?.[i] || 0) +
          (data.opex?.total?.[i] || 0) +
          (data.costfix?.total?.[i] || 0) +
          (data.taxe?.total?.[i] || 0)
      )
    : zeros();

  // Build spreadsheet rows
  const buildRows = (): SpreadsheetRow[] => {
    if (!data) return [];
    const r: SpreadsheetRow[] = [];

    // A. VENITURI
    r.push({ label: "A. VENITURI", values: zeros(), isHeader: true });
    r.push({ label: "Vanzari totale", values: data.income || zeros(), indent: 1 });

    // B. COGS
    r.push({ label: "B. COGS", values: zeros(), isHeader: true });
    for (const cat of COGS_CATS) {
      r.push({ label: cat, values: data.cogs?.[cat] || zeros(), indent: 1 });
    }
    r.push({ label: "Total COGS", values: data.cogs?.total || zeros(), isSummary: true });
    r.push({ label: "Profit brut", values: data.grossProfit || zeros(), isHighlight: true });
    r.push({ label: "Marja bruta %", values: data.grossMargin || zeros(), isPercent: true });

    // C. PERSONAL
    r.push({ label: "C. PERSONAL", values: zeros(), isHeader: true });
    for (const cat of PEOPLE_CATS) {
      r.push({ label: cat, values: data.people?.[cat] || zeros(), indent: 1 });
    }
    r.push({ label: "Total Personal", values: data.people?.total || zeros(), isSummary: true });

    // D. OPEX
    r.push({ label: "D. OPEX", values: zeros(), isHeader: true });
    for (const cat of OPEX_CATS) {
      r.push({ label: cat, values: data.opex?.[cat] || zeros(), indent: 1 });
    }
    r.push({ label: "Total OPEX", values: data.opex?.total || zeros(), isSummary: true });

    // E. COSTURI FIXE
    r.push({ label: "E. COSTURI FIXE", values: zeros(), isHeader: true });
    for (const cat of COSTFIX_CATS) {
      r.push({ label: cat, values: data.costfix?.[cat] || zeros(), indent: 1 });
    }
    r.push({ label: "Total Costuri Fixe", values: data.costfix?.total || zeros(), isSummary: true });

    r.push({ label: "Profit Operational", values: data.operatingProfit || zeros(), isHighlight: true });
    r.push({ label: "Marja operationala %", values: data.operatingMargin || zeros(), isPercent: true });

    // F. TAXE
    r.push({ label: "F. TAXE", values: zeros(), isHeader: true });
    for (const cat of TAXE_CATS) {
      r.push({ label: cat, values: data.taxe?.[cat] || zeros(), indent: 1 });
    }
    r.push({ label: "Total Taxe", values: data.taxe?.total || zeros(), isSummary: true });

    r.push({ label: "PROFIT NET", values: data.netProfit || zeros(), isHighlight: true });
    r.push({ label: "Marja neta %", values: data.netMargin || zeros(), isPercent: true });

    return r;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text">Profit & Loss</h2>
          <p className="mt-1 text-sm text-text-muted">
            Raport P&L detaliat — {year}
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
              title="Venituri"
              value={formatCurrency(data.totals?.income || 0)}
              icon={<TrendingUp className="h-5 w-5" />}
              subtitle={`An ${year}`}
            />
            <StatCard
              title="Cheltuieli totale"
              value={formatCurrency(data.totals?.expenses || 0)}
              icon={<TrendingDown className="h-5 w-5" />}
              subtitle={`An ${year}`}
            />
            <StatCard
              title="Profit Net"
              value={formatCurrency(data.totals?.netProfit || 0)}
              icon={<Wallet className="h-5 w-5" />}
              subtitle={`An ${year}`}
            />
            <StatCard
              title="Marja neta"
              value={`${(data.totals?.netMargin || 0).toFixed(1)}%`}
              icon={<Percent className="h-5 w-5" />}
              subtitle={`An ${year}`}
            />
          </>
        )}
      </div>

      {/* Chart */}
      <PnlChart
        income={data?.income || zeros()}
        totalExpenses={totalExpenses}
        netProfit={data?.netProfit || zeros()}
        loading={loading}
      />

      {/* Spreadsheet */}
      <MonthlySpreadsheet
        title={`P&L Detaliat — ${year}`}
        rows={buildRows()}
        loading={loading}
      />
    </div>
  );
}
