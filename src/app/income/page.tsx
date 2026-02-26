"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  Button,
  Badge,
  Modal,
} from "@/components/ui";
import { useToast } from "@/components/ui/toast";
import {
  Plus,
  Filter,
  Eye,
  Pencil,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  X,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { DailyIncomeFormModal } from "@/components/daily-income/daily-income-form";
import { DailyIncomeDetailModal } from "@/components/daily-income/daily-income-detail";
import { exportToCSV } from "@/lib/export";

interface DailyIncomeRow {
  id: string;
  locationId: string;
  date: string;
  dayOfWeek: string | null;
  totalSales: number;
  tva: number;
  salesExVat: number;
  receiptCount: number;
  avgReceipt: number;
  barSales: number;
  barProductCount: number;
  kitchenSales: number;
  kitchenProductCount: number;
  cashAmount: number;
  cardAmount: number;
  transferAmount: number;
  accountAmount: number;
  deliveryAmount: number;
  tipsFiscal: number;
  tipsTotal: number;
  createdAt: string;
  location: { id: string; code: string; name: string };
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface Summary {
  totalRevenue: number;
  totalRevenueExVat: number;
  totalDays: number;
}

type SortField = "date" | "totalSales";

export default function IncomePage() {
  const [records, setRecords] = useState<DailyIncomeRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, pageSize: 20, total: 0, totalPages: 0,
  });
  const [summary, setSummary] = useState<Summary>({
    totalRevenue: 0, totalRevenueExVat: 0, totalDays: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterLocation, setFilterLocation] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [locations, setLocations] = useState<{ id: string; code: string; name: string }[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<DailyIncomeRow | null>(null);
  const [detailRecord, setDetailRecord] = useState<DailyIncomeRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DailyIncomeRow | null>(null);

  const [lastLocationId, setLastLocationId] = useState("");

  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((data) => {
        const locs = Array.isArray(data) ? data : data.data || [];
        setLocations(locs);
        if (locs.length > 0 && !lastLocationId) {
          setLastLocationId(locs[0].id);
        }
      })
      .catch(() => {});
  }, [lastLocationId]);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(pagination.page));
      params.set("pageSize", "20");
      params.set("sortBy", sortBy);
      params.set("sortDir", sortDir);
      if (filterLocation) params.set("locationId", filterLocation);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/daily-income?${params}`);
      const data = await res.json();

      if (res.ok) {
        setRecords(data.data);
        setPagination(data.pagination);
        setSummary(data.summary);
      }
    } catch {
      toast({ title: "Eroare", description: "Nu s-au putut incarca incasarile zilnice", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, filterLocation, dateFrom, dateTo, sortBy, sortDir, toast]);

  useEffect(() => {
    fetchRecords();
  }, [fetchRecords]);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("desc");
    }
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/daily-income/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Inregistrare stearsa", variant: "success" });
        fetchRecords();
      } else {
        toast({ title: "Eroare la stergere", variant: "danger" });
      }
    } catch {
      toast({ title: "Eroare la stergere", variant: "danger" });
    }
    setDeleteTarget(null);
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingRecord(null);
    fetchRecords();
  };

  const hasFilters = filterLocation || dateFrom || dateTo;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#2D1B0E]">Incasari Zilnice</h2>
          <p className="mt-0.5 text-xs text-[#9B8B7F]">
            {pagination.total} zile inregistrate
            {summary.totalRevenue > 0 && (
              <> &middot; Total: {formatCurrency(summary.totalRevenue)}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              exportToCSV(records, "incasari-zilnice", [
                { header: "Data", accessor: (r) => new Date(r.date).toLocaleDateString("ro-RO") },
                { header: "Zi", accessor: (r) => r.dayOfWeek || "" },
                { header: "Locatie", accessor: (r) => r.location.code },
                { header: "Total Vanzari", accessor: (r) => r.totalSales },
                { header: "TVA", accessor: (r) => r.tva },
                { header: "Fara TVA", accessor: (r) => r.salesExVat },
                { header: "Nr Bonuri", accessor: (r) => r.receiptCount },
                { header: "Cec Mediu", accessor: (r) => r.avgReceipt },
                { header: "Bar", accessor: (r) => r.barSales },
                { header: "Nr Prod Bar", accessor: (r) => r.barProductCount },
                { header: "Bucatarie", accessor: (r) => r.kitchenSales },
                { header: "Nr Prod Bucatarie", accessor: (r) => r.kitchenProductCount },
                { header: "Cash", accessor: (r) => r.cashAmount },
                { header: "Card", accessor: (r) => r.cardAmount },
                { header: "Virament", accessor: (r) => r.transferAmount },
                { header: "Cont", accessor: (r) => r.accountAmount },
                { header: "Livrator", accessor: (r) => r.deliveryAmount },
                { header: "Tips Fiscal", accessor: (r) => r.tipsFiscal },
                { header: "Tips Total", accessor: (r) => r.tipsTotal },
              ]);
            }}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingRecord(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Adauga zi
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <CalendarDays className="h-4 w-4 text-text-muted" />
              <span className="text-sm text-text-muted">
                {summary.totalDays} zile &middot; {formatCurrency(summary.totalRevenue)}
              </span>
            </div>
            <Button
              variant={showFilters ? "secondary" : "outline"}
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
            >
              <Filter className="h-4 w-4" />
              Filtre
              {hasFilters && (
                <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] text-white">
                  !
                </span>
              )}
            </Button>
          </div>

          {showFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
              <select
                value={filterLocation}
                onChange={(e) => { setFilterLocation(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
                className="h-9 rounded-lg border border-border bg-surface px-3 text-sm"
              >
                <option value="">Toate locatiile</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
                className="h-9 rounded-lg border border-border bg-surface px-3 text-sm"
                placeholder="De la"
              />
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
                className="h-9 rounded-lg border border-border bg-surface px-3 text-sm"
                placeholder="Pana la"
              />
              {hasFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterLocation("");
                    setDateFrom("");
                    setDateTo("");
                  }}
                >
                  <X className="h-4 w-4" />
                  Sterge filtre
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-background">
                <th
                  className="px-4 py-3 text-left font-medium text-text-secondary cursor-pointer select-none hover:text-text"
                  onClick={() => handleSort("date")}
                >
                  <span className="inline-flex items-center gap-1">
                    Data <SortIcon field="date" />
                  </span>
                </th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary">Locatie</th>
                <th
                  className="px-4 py-3 text-right font-medium text-text-secondary cursor-pointer select-none hover:text-text"
                  onClick={() => handleSort("totalSales")}
                >
                  <span className="inline-flex items-center justify-end gap-1">
                    Total Vanzari <SortIcon field="totalSales" />
                  </span>
                </th>
                <th className="px-4 py-3 text-right font-medium text-text-secondary">TVA</th>
                <th className="px-4 py-3 text-right font-medium text-text-secondary">Fara TVA</th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary">Nr Bonuri</th>
                <th className="px-4 py-3 text-right font-medium text-text-secondary">Bar</th>
                <th className="px-4 py-3 text-right font-medium text-text-secondary">Bucatarie</th>
                <th className="px-4 py-3 text-right font-medium text-text-secondary">Cash</th>
                <th className="px-4 py-3 text-right font-medium text-text-secondary">Card</th>
                <th className="px-4 py-3 text-right font-medium text-text-secondary">Tips</th>
                <th className="px-4 py-3 text-right font-medium text-text-secondary">Actiuni</th>
              </tr>
            </thead>
            {loading ? (
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-light">
                    {Array.from({ length: 12 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-border-light" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ) : records.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={12} className="px-4 py-12 text-center">
                    <CalendarDays className="mx-auto mb-3 h-12 w-12 text-border" />
                    <p className="text-text-muted">Nu exista incasari zilnice</p>
                    <p className="mt-1 text-xs text-text-muted">
                      Importa din Excel sau adauga manual
                    </p>
                  </td>
                </tr>
              </tbody>
            ) : (
              <tbody>
                {records.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border-light last:border-0 transition-colors hover:bg-surface-hover"
                  >
                    <td className="px-4 py-3 text-text whitespace-nowrap">
                      {new Date(r.date).toLocaleDateString("ro-RO")}
                      {r.dayOfWeek && (
                        <span className="ml-1.5 text-xs text-text-muted">({r.dayOfWeek})</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <Badge variant="outline">{r.location.code}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-text">
                      {formatCurrency(r.totalSales)}
                    </td>
                    <td className="px-4 py-3 text-right text-text-secondary">
                      {formatCurrency(r.tva)}
                    </td>
                    <td className="px-4 py-3 text-right text-text-secondary">
                      {formatCurrency(r.salesExVat)}
                    </td>
                    <td className="px-4 py-3 text-center text-text-secondary">
                      {r.receiptCount}
                    </td>
                    <td className="px-4 py-3 text-right text-text-secondary">
                      {formatCurrency(r.barSales)}
                    </td>
                    <td className="px-4 py-3 text-right text-text-secondary">
                      {formatCurrency(r.kitchenSales)}
                    </td>
                    <td className="px-4 py-3 text-right text-text-secondary">
                      {formatCurrency(r.cashAmount)}
                    </td>
                    <td className="px-4 py-3 text-right text-text-secondary">
                      {formatCurrency(r.cardAmount)}
                    </td>
                    <td className="px-4 py-3 text-right text-text-secondary">
                      {formatCurrency(r.tipsTotal)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => setDetailRecord(r)}
                          className="rounded p-1.5 text-text-muted hover:bg-surface-hover hover:text-text"
                          title="Detalii"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => { setEditingRecord(r); setFormOpen(true); }}
                          className="rounded p-1.5 text-text-muted hover:bg-surface-hover hover:text-primary"
                          title="Editeaza"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(r)}
                          className="rounded p-1.5 text-text-muted hover:bg-danger-light hover:text-danger"
                          title="Sterge"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            )}
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border px-4 py-3">
            <p className="text-xs text-text-muted">
              {(pagination.page - 1) * pagination.pageSize + 1}–
              {Math.min(pagination.page * pagination.pageSize, pagination.total)} din{" "}
              {pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <button
                className="rounded p-1 text-text-muted hover:bg-surface-hover disabled:opacity-40"
                onClick={() => setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))}
                disabled={pagination.page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs text-text-secondary">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                className="rounded p-1 text-text-muted hover:bg-surface-hover disabled:opacity-40"
                onClick={() => setPagination((p) => ({ ...p, page: Math.min(p.totalPages, p.page + 1) }))}
                disabled={pagination.page >= pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Form Modal */}
      <DailyIncomeFormModal
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingRecord(null);
        }}
        record={editingRecord}
        locations={locations}
        onSuccess={handleFormSuccess}
        defaultLocationId={lastLocationId}
      />

      {/* Detail Modal */}
      <DailyIncomeDetailModal
        record={detailRecord}
        onClose={() => setDetailRecord(null)}
        onEdit={(r) => {
          setDetailRecord(null);
          setEditingRecord(r);
          setFormOpen(true);
        }}
      />

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Sterge inregistrare"
        description={`Esti sigur ca vrei sa stergi inregistrarea din ${deleteTarget ? new Date(deleteTarget.date).toLocaleDateString("ro-RO") : ""} (${deleteTarget?.location?.name || ""}) — ${deleteTarget ? formatCurrency(deleteTarget.totalSales) : ""}?`}
      >
        <div className="space-y-4">
          <p className="text-sm text-text-secondary">
            Aceasta actiune nu poate fi anulata.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Anuleaza
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Sterge
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
