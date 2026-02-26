"use client";

import { useState, useEffect, useCallback } from "react";
import { StatCard } from "@/components/ui";
import { StatCardSkeleton } from "@/components/dashboard/skeleton";
import { CashFlowChart } from "@/components/dashboard/cash-flow-chart";
import { RevenueByLocation } from "@/components/dashboard/revenue-by-location";
import { ExpenseByCategory } from "@/components/dashboard/expense-by-category";
import { AgingReport } from "@/components/dashboard/aging-report";
import { TopSuppliers } from "@/components/dashboard/top-suppliers";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
import { OverdueAlerts } from "@/components/dashboard/overdue-alerts";
import { formatCurrency } from "@/lib/utils";
import {
  TrendingUp,
  Receipt,
  Wallet,
  AlertTriangle,
  RefreshCw,
} from "lucide-react";
import { Button } from "@/components/ui";

type Period = "month" | "quarter" | "year";

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [locationId, setLocationId] = useState("");
  const [locations, setLocations] = useState<{ id: string; code: string; name: string }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  // Data states
  const [summary, setSummary] = useState<Record<string, number> | null>(null);
  const [cashflow, setCashflow] = useState(null);
  const [byLocation, setByLocation] = useState(null);
  const [byCategory, setByCategory] = useState(null);
  const [aging, setAging] = useState(null);
  const [topSuppliers, setTopSuppliers] = useState(null);
  const [recent, setRecent] = useState(null);
  const [alerts, setAlerts] = useState(null);

  const [loadingSummary, setLoadingSummary] = useState(true);
  const [loadingCharts, setLoadingCharts] = useState(true);
  const [loadingFeed, setLoadingFeed] = useState(true);

  // Load locations
  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((data) => {
        setLocations(Array.isArray(data) ? data : data.data || []);
      })
      .catch(() => {});
  }, []);

  // Fetch dashboard data
  const fetchDashboard = useCallback(async () => {
    const params = new URLSearchParams({ period });
    if (locationId) params.set("locationId", locationId);

    // Fetch summary + alerts in parallel (fast)
    setLoadingSummary(true);
    Promise.all([
      fetch(`/api/dashboard?type=summary&${params}`).then((r) => r.json()),
      fetch(`/api/dashboard?type=alerts&${params}`).then((r) => r.json()),
    ])
      .then(([s, a]) => {
        setSummary(s);
        setAlerts(a);
      })
      .catch(() => {})
      .finally(() => setLoadingSummary(false));

    // Fetch charts in parallel
    setLoadingCharts(true);
    Promise.all([
      fetch(`/api/dashboard?type=cashflow&${params}`).then((r) => r.json()),
      fetch(`/api/dashboard?type=by-location&${params}`).then((r) => r.json()),
      fetch(`/api/dashboard?type=by-category&${params}`).then((r) => r.json()),
      fetch(`/api/dashboard?type=aging&${params}`).then((r) => r.json()),
      fetch(`/api/dashboard?type=top-suppliers&${params}`).then((r) => r.json()),
    ])
      .then(([cf, bl, bc, ag, ts]) => {
        setCashflow(cf);
        setByLocation(bl);
        setByCategory(bc);
        setAging(ag);
        setTopSuppliers(ts);
      })
      .catch(() => {})
      .finally(() => setLoadingCharts(false));

    // Fetch feed
    setLoadingFeed(true);
    fetch(`/api/dashboard?type=recent&${params}`)
      .then((r) => r.json())
      .then(setRecent)
      .catch(() => {})
      .finally(() => setLoadingFeed(false));

    setLastRefresh(new Date());
  }, [period, locationId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  // Auto-refresh every 60 seconds
  useEffect(() => {
    const interval = setInterval(fetchDashboard, 60000);
    return () => clearInterval(interval);
  }, [fetchDashboard]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  };

  const periodLabels: Record<Period, string> = {
    month: "Luna curenta",
    quarter: "Trimestru",
    year: "An curent",
  };

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-text">Dashboard</h2>
          <p className="mt-1 text-sm text-text-muted">
            Sumar general — {periodLabels[period]}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {/* Period selector */}
          <div className="flex rounded-lg bg-background p-0.5">
            {(["month", "quarter", "year"] as Period[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  period === p
                    ? "bg-surface text-text shadow-sm"
                    : "text-text-muted hover:text-text"
                }`}
              >
                {periodLabels[p]}
              </button>
            ))}
          </div>

          {/* Location filter */}
          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="h-8 rounded-lg border border-border bg-surface px-2 text-xs"
          >
            <option value="">Toate locatiile</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>

          {/* Refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            className="h-8"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>

          <span className="text-[10px] text-text-muted">
            {lastRefresh.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      {/* Row 1: Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {loadingSummary || !summary ? (
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
              value={formatCurrency(summary.revenue || 0)}
              icon={<TrendingUp className="h-5 w-5" />}
              trend={
                summary.revenueTrend !== undefined
                  ? { value: summary.revenueTrend, label: "vs. perioada anterioara" }
                  : undefined
              }
              subtitle={`${summary.receiptCount || 0} incasari`}
            />
            <StatCard
              title="Cheltuieli"
              value={formatCurrency(summary.expenses || 0)}
              icon={<Receipt className="h-5 w-5" />}
              subtitle={periodLabels[period]}
            />
            <StatCard
              title="Profit Net"
              value={formatCurrency(summary.netProfit || 0)}
              icon={<Wallet className="h-5 w-5" />}
              subtitle={
                summary.revenue > 0
                  ? `Marja: ${Math.round(((summary.netProfit || 0) / summary.revenue) * 100)}%`
                  : undefined
              }
            />
            <StatCard
              title="Restante"
              value={formatCurrency(
                (summary.outstandingPayables || 0) + (summary.outstandingReceivables || 0)
              )}
              icon={<AlertTriangle className="h-5 w-5" />}
              subtitle={`${(summary.outstandingPayablesCount || 0) + (summary.outstandingReceivablesCount || 0)} facturi`}
            />
          </>
        )}
      </div>

      {/* Row 2: Cash Flow (full width) */}
      <CashFlowChart data={cashflow} loading={loadingCharts} />

      {/* Row 3: Revenue by Location + Expense by Category */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RevenueByLocation data={byLocation} loading={loadingCharts} />
        <ExpenseByCategory data={byCategory} loading={loadingCharts} />
      </div>

      {/* Row 4: Aging + Top Suppliers */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <AgingReport data={aging} loading={loadingCharts} />
        <TopSuppliers data={topSuppliers} loading={loadingCharts} />
      </div>

      {/* Row 5: Recent Transactions + Alerts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <RecentTransactions data={recent} loading={loadingFeed} />
        <OverdueAlerts data={alerts} loading={loadingSummary} />
      </div>
    </div>
  );
}
