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
import { TrendingUp, Receipt, Wallet, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui";

type Period = "month" | "quarter" | "year";

const MOTIVATIONAL_MESSAGES = [
  "Fiecare ceașcă de cafea servită este o poveste frumoasă.",
  "Astăzi este o zi perfectă pentru afaceri excelente!",
  "Succesul se construiește zi de zi, ceașcă cu ceașcă.",
  "Pasiunea ta pentru cafea se simte în fiecare detaliu.",
  "Un business de succes începe cu o cafea bună și o atitudine pozitivă.",
  "Cele mai bune lucruri încep cu o cafea dimineața.",
  "O cafea bună face orice zi mai bună.",
  "Fiecare client mulțumit e cea mai bună reclamă.",
  "Consistența este secretul unei cafenele de succes.",
  "Astăzi e momentul perfect să faci ceva extraordinar.",
  "Cafeaua bună aduce oameni buni împreună.",
  "Micile detalii fac diferența între bun și excepțional.",
  "Energia unei zile bune începe cu prima ceașcă.",
  "Fiecare zi e o oportunitate nouă de a crește.",
  "Munca ta de azi construiește succesul de mâine.",
  "Zâmbetul unui client face totul să merite.",
  "Calitatea nu e niciodată un accident, e un efort conștient.",
  "O afacere de succes se construiește pas cu pas.",
  "Cafea bună, oameni buni, rezultate bune.",
  "Astăzi suntem mai buni decât ieri.",
  "Fiecare dimineață e un nou început plin de posibilități.",
  "Pasiunea este ingredientul secret al succesului.",
  "Un business de succes începe cu atenția la detalii.",
  "Cafeaua perfectă vine din dedicare și profesionalism.",
  "Curajul de a îmbunătăți lucrurile face diferența.",
  "Excelența nu e un act, ci un obicei zilnic.",
  "Fiecare zi aduce noi oportunități de a impresiona.",
  "Lucrul bine făcut este cea mai bună strategie.",
  "Echipa puternică, cafea puternică, rezultate puternice.",
  "Clienții fericiți sunt cea mai valoroasă investiție.",
  "Creativitatea și cafeaua merg mână în mână.",
  "Astăzi transformăm cafeaua în povești frumoase.",
  "Succesul e o călătorie, nu o destinație.",
  "Aroma succesului se simte în fiecare colț al cafenelei.",
  "Împreună construim ceva special, ceașcă cu ceașcă.",
  "Fiecare zi e o pagină nouă în povestea Moro.",
  "Răbdarea și cafeaua bună au ceva în comun: merită așteptarea.",
  "Când iubești ce faci, fiecare zi e o reușită.",
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Bună dimineața";
  if (hour < 18) return "Bună ziua";
  return "Bună seara";
}

export default function DashboardPage() {
  const [period, setPeriod] = useState<Period>("month");
  const [locationId, setLocationId] = useState("");
  const [locations, setLocations] = useState<{ id: string; code: string; name: string }[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const [motivationalMessage, setMotivationalMessage] = useState("");
  const [greeting, setGreeting] = useState("");

  useEffect(() => {
    setMotivationalMessage(
      MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)],
    );
    setGreeting(getGreeting());
  }, []);

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

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((data) => {
        setLocations(Array.isArray(data) ? data : data.data || []);
      })
      .catch(() => {});
  }, []);

  const fetchDashboard = useCallback(async () => {
    const params = new URLSearchParams({ period });
    if (locationId) params.set("locationId", locationId);

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

  // Manual refresh only — no auto-refresh interval

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchDashboard();
    setRefreshing(false);
  };

  const periodLabels: Record<Period, string> = {
    month: "Luna curentă",
    quarter: "Trimestru",
    year: "An curent",
  };

  return (
    <div className="space-y-12">
      {/* Greeting Card */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#5C3D2E] via-[#6F4E37] to-[#C4A882] p-10 text-white shadow-xl">
        {/* Decorative background elements */}
        <div className="absolute -right-6 -top-6 h-40 w-40 rounded-full bg-white/5" />
        <div className="absolute -bottom-4 -right-4 h-28 w-28 rounded-full bg-white/5" />
        <div className="absolute bottom-8 right-10 text-7xl opacity-10">&#9749;</div>

        <div className="relative flex items-start gap-6">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-white/15 text-3xl backdrop-blur-sm">
            &#9749;
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-3xl font-extrabold tracking-tight drop-shadow-sm">
              {greeting ? `${greeting}, Moro!` : "Bun venit, Moro!"} &#9749;
            </h2>
            {motivationalMessage && (
              <p className="mt-3 text-lg leading-relaxed text-white/85">{motivationalMessage}</p>
            )}
          </div>
        </div>
      </div>

      {/* Filters row */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm font-medium text-[#6B5B4F]">
          Sumar general &mdash; {periodLabels[period]}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as Period)}
            className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs"
          >
            {(["month", "quarter", "year"] as Period[]).map((p) => (
              <option key={p} value={p}>
                {periodLabels[p]}
              </option>
            ))}
          </select>

          <select
            value={locationId}
            onChange={(e) => setLocationId(e.target.value)}
            className="h-8 rounded-lg border border-gray-200 bg-white px-2 text-xs"
          >
            <option value="">Toate locațiile</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>

          <Button variant="outline" size="sm" onClick={handleRefresh} className="h-8">
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
          </Button>

          <span className="text-[10px] text-[#9B8B7F]">
            {lastRefresh.toLocaleTimeString("ro-RO", { hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>
      </div>

      {/* Row 1: Stat Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
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
              icon={<TrendingUp className="h-4 w-4" />}
              trend={
                summary.revenueTrend !== undefined
                  ? { value: summary.revenueTrend, label: "vs. perioada anterioară" }
                  : undefined
              }
              subtitle={`${summary.receiptCount || 0} încasări`}
            />
            <StatCard
              title="Cheltuieli"
              value={formatCurrency(summary.expenses || 0)}
              icon={<Receipt className="h-4 w-4" />}
              subtitle={periodLabels[period]}
            />
            <StatCard
              title="Profit Net"
              value={formatCurrency(summary.netProfit || 0)}
              icon={<Wallet className="h-4 w-4" />}
              subtitle={
                summary.revenue > 0
                  ? `Marjă: ${Math.round(((summary.netProfit || 0) / summary.revenue) * 100)}%`
                  : undefined
              }
            />
            <StatCard
              title="Restanțe"
              value={formatCurrency(
                (summary.outstandingPayables || 0) + (summary.outstandingReceivables || 0),
              )}
              icon={<AlertTriangle className="h-4 w-4" />}
              subtitle={`${(summary.outstandingPayablesCount || 0) + (summary.outstandingReceivablesCount || 0)} facturi`}
            />
          </>
        )}
      </div>

      {/* Row 2: Cash Flow (full width) */}
      <CashFlowChart data={cashflow} loading={loadingCharts} />

      {/* Row 3: Revenue by Location + Expense by Category */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <RevenueByLocation data={byLocation} loading={loadingCharts} />
        <ExpenseByCategory data={byCategory} loading={loadingCharts} />
      </div>

      {/* Row 4: Aging + Top Suppliers */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <AgingReport data={aging} loading={loadingCharts} />
        <TopSuppliers data={topSuppliers} loading={loadingCharts} />
      </div>

      {/* Row 5: Recent Transactions + Alerts */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <RecentTransactions data={recent} loading={loadingFeed} />
        <OverdueAlerts data={alerts} loading={loadingSummary} />
      </div>
    </div>
  );
}
