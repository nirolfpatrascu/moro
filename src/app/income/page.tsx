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
  Search,
  Filter,
  Eye,
  Pencil,
  Trash2,
  Download,
  ChevronLeft,
  ChevronRight,
  Receipt,
  X,
  Zap,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { RECEIPT_TYPES, PAYMENT_METHODS } from "@/lib/validations/receipt";
import { ReceiptFormModal } from "@/components/receipts/receipt-form";
import { ReceiptDetailModal } from "@/components/receipts/receipt-detail";
import { exportToCSV } from "@/lib/export";

interface ReceiptRow {
  id: string;
  locationId: string;
  date: string;
  type: string;
  description: string | null;
  category: string | null;
  amount: number;
  paymentMethod: string;
  receiptNumber: string | null;
  notes: string | null;
  createdAt: string;
  location: { id: string; code: string; name: string };
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface DailyTotals {
  [date: string]: { sales: number; refunds: number; expenses: number; net: number };
}

type SortField = "date" | "amount" | "type" | "createdAt";

const TYPE_BADGE: Record<string, { label: string; variant: "success" | "warning" | "danger" }> = {
  SALE: { label: "Vanzare", variant: "success" },
  REFUND: { label: "Retur", variant: "warning" },
  EXPENSE: { label: "Cheltuiala", variant: "danger" },
};

const PAYMENT_BADGE: Record<string, string> = {
  CASH: "Cash",
  CARD: "Card",
  TRANSFER: "Transfer",
};

export default function IncomePage() {
  const [receipts, setReceipts] = useState<ReceiptRow[]>([]);
  const [dailyTotals, setDailyTotals] = useState<DailyTotals>({});
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, pageSize: 20, total: 0, totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterType, setFilterType] = useState("");
  const [filterPayment, setFilterPayment] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [locations, setLocations] = useState<{ id: string; code: string; name: string }[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  const [formOpen, setFormOpen] = useState(false);
  const [editingReceipt, setEditingReceipt] = useState<ReceiptRow | null>(null);
  const [detailReceipt, setDetailReceipt] = useState<ReceiptRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ReceiptRow | null>(null);

  // Remember last used location
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

  const fetchReceipts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(pagination.page));
      params.set("pageSize", "20");
      params.set("sortBy", sortBy);
      params.set("sortDir", sortDir);
      if (search) params.set("search", search);
      if (filterLocation) params.set("locationId", filterLocation);
      if (filterType) params.set("type", filterType);
      if (filterPayment) params.set("paymentMethod", filterPayment);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const res = await fetch(`/api/receipts?${params}`);
      const data = await res.json();

      if (res.ok) {
        setReceipts(data.data);
        setDailyTotals(data.dailyTotals || {});
        setPagination(data.pagination);
      }
    } catch {
      toast({ title: "Eroare", description: "Nu s-au putut incarca incasarile", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, search, filterLocation, filterType, filterPayment, dateFrom, dateTo, sortBy, sortDir, toast]);

  useEffect(() => {
    fetchReceipts();
  }, [fetchReceipts]);

  // Debounced search
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPagination((p) => ({ ...p, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Sorting
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
      const res = await fetch(`/api/receipts/${deleteTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Incasare stearsa", variant: "success" });
        fetchReceipts();
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
    setEditingReceipt(null);
    fetchReceipts();
  };

  // Group receipts by date for daily totals rows
  const groupedDates = new Set(
    receipts.map((r) => new Date(r.date).toISOString().split("T")[0])
  );

  // Build display rows: for each date group, show receipts then a totals row
  const sortedDates = Array.from(groupedDates).sort((a, b) =>
    sortDir === "desc" ? b.localeCompare(a) : a.localeCompare(b)
  );

  const hasFilters = filterLocation || filterType || filterPayment || dateFrom || dateTo;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#2D1B0E]">Incasari Zilnice</h2>
          <p className="mt-0.5 text-xs text-[#9B8B7F]">
            {pagination.total} incasari inregistrate
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              exportToCSV(receipts, "incasari", [
                { header: "Data", accessor: (r) => new Date(r.date).toLocaleDateString("ro-RO") },
                { header: "Tip", accessor: (r) => r.type },
                { header: "Descriere", accessor: (r) => r.description || "" },
                { header: "Categorie", accessor: (r) => r.category || "" },
                { header: "Suma", accessor: (r) => r.amount },
                { header: "Metoda plata", accessor: (r) => r.paymentMethod },
                { header: "Nr. bon", accessor: (r) => r.receiptNumber || "" },
                { header: "Locatie", accessor: (r) => r.location.code },
              ]);
            }}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setEditingReceipt(null);
              setFormOpen(true);
            }}
          >
            <Zap className="h-4 w-4" />
            Incasare rapida
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingReceipt(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Adauga incasare
          </Button>
        </div>
      </div>

      {/* Search & Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Cauta dupa descriere, nr. bon, categorie..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-surface pl-3 pr-10 text-sm text-right text-text placeholder:text-right placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
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
              <select
                value={filterType}
                onChange={(e) => { setFilterType(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
                className="h-9 rounded-lg border border-border bg-surface px-3 text-sm"
              >
                <option value="">Toate tipurile</option>
                {RECEIPT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <select
                value={filterPayment}
                onChange={(e) => { setFilterPayment(e.target.value); setPagination((p) => ({ ...p, page: 1 })); }}
                className="h-9 rounded-lg border border-border bg-surface px-3 text-sm"
              >
                <option value="">Toate metodele</option>
                {PAYMENT_METHODS.map((p) => (
                  <option key={p.value} value={p.value}>{p.label}</option>
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
                    setFilterType("");
                    setFilterPayment("");
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
                <th
                  className="px-4 py-3 text-left font-medium text-text-secondary cursor-pointer select-none hover:text-text"
                  onClick={() => handleSort("type")}
                >
                  <span className="inline-flex items-center gap-1">
                    Tip <SortIcon field="type" />
                  </span>
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Descriere</th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary">Plata</th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary">Locatie</th>
                <th
                  className="px-4 py-3 text-right font-medium text-text-secondary cursor-pointer select-none hover:text-text"
                  onClick={() => handleSort("amount")}
                >
                  <span className="inline-flex items-center justify-end gap-1">
                    Suma <SortIcon field="amount" />
                  </span>
                </th>
                <th className="px-4 py-3 text-right font-medium text-text-secondary">Actiuni</th>
              </tr>
            </thead>
            {loading ? (
              <tbody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-light">
                    {Array.from({ length: 7 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-border-light" />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            ) : receipts.length === 0 ? (
              <tbody>
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <Receipt className="mx-auto mb-3 h-12 w-12 text-border" />
                    <p className="text-text-muted">Nu exista incasari</p>
                    <p className="mt-1 text-xs text-text-muted">
                      Inregistreaza prima incasare
                    </p>
                  </td>
                </tr>
              </tbody>
            ) : (
              sortedDates.map((dateKey) => {
                const dayReceipts = receipts.filter(
                  (r) => new Date(r.date).toISOString().split("T")[0] === dateKey
                );
                const totals = dailyTotals[dateKey];

                return (
                  <tbody key={dateKey}>
                    {dayReceipts.map((r) => {
                      const typeInfo = TYPE_BADGE[r.type] || TYPE_BADGE.SALE;
                      return (
                        <tr
                          key={r.id}
                          className="border-b border-border-light last:border-0 transition-colors hover:bg-surface-hover"
                        >
                          <td className="px-4 py-3 text-text-secondary">
                            {new Date(r.date).toLocaleDateString("ro-RO")}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={typeInfo.variant}>{typeInfo.label}</Badge>
                          </td>
                          <td className="px-4 py-3 text-text-secondary max-w-[200px] truncate">
                            {r.description || r.category || "-"}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="outline">{PAYMENT_BADGE[r.paymentMethod] || r.paymentMethod}</Badge>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <Badge variant="outline">{r.location.code}</Badge>
                          </td>
                          <td className="px-4 py-3 text-right font-medium text-text">
                            {r.type === "REFUND" || r.type === "EXPENSE" ? "-" : ""}
                            {formatCurrency(r.amount)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setDetailReceipt(r)}
                                className="rounded p-1.5 text-text-muted hover:bg-surface-hover hover:text-text"
                                title="Detalii"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => { setEditingReceipt(r); setFormOpen(true); }}
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
                      );
                    })}
                    {/* Daily totals row */}
                    {totals && (
                      <tr className="bg-background/60 border-b-2 border-border">
                        <td className="px-4 py-2 text-xs font-semibold text-text-muted">
                          Total {new Date(dateKey).toLocaleDateString("ro-RO")}
                        </td>
                        <td colSpan={4} className="px-4 py-2 text-xs text-text-muted">
                          <span className="text-success">{formatCurrency(totals.sales)} vanzari</span>
                          {totals.refunds > 0 && (
                            <span className="ml-3 text-warning">-{formatCurrency(totals.refunds)} retururi</span>
                          )}
                          {totals.expenses > 0 && (
                            <span className="ml-3 text-danger">-{formatCurrency(totals.expenses)} cheltuieli</span>
                          )}
                        </td>
                        <td className="px-4 py-2 text-right text-xs font-bold text-text">
                          Net: {formatCurrency(totals.net)}
                        </td>
                        <td />
                      </tr>
                    )}
                  </tbody>
                );
              })
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
      <ReceiptFormModal
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingReceipt(null);
        }}
        receipt={editingReceipt}
        locations={locations}
        onSuccess={handleFormSuccess}
        defaultLocationId={lastLocationId}
      />

      {/* Detail Modal */}
      <ReceiptDetailModal
        receipt={detailReceipt}
        onClose={() => setDetailReceipt(null)}
        onEdit={(r) => {
          setDetailReceipt(null);
          setEditingReceipt(r);
          setFormOpen(true);
        }}
      />

      {/* Delete Confirmation */}
      <Modal
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Sterge incasare"
        description={`Esti sigur ca vrei sa stergi aceasta incasare de ${deleteTarget ? formatCurrency(deleteTarget.amount) : ""}?`}
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
