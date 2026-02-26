"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
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
  Upload,
  Download,
  ChevronLeft,
  ChevronRight,
  FileInput,
  X,
  CheckCircle,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { InvoiceFormModal } from "@/components/incoming/invoice-form";
import { InvoiceDetailModal } from "@/components/incoming/invoice-detail";
import { exportToCSV } from "@/lib/export";

// ── Types ─────────────────────────────────────────────────
interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  supplierId: string;
  locationId: string;
  issueDate: string | null;
  dueDate: string | null;
  itemDescription: string | null;
  qty: number;
  unitPrice: number;
  totalAmount: number;
  amountExVat: number;
  vatAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: string;
  notes: string | null;
  plCategory: string;
  category: string;
  subcategory: string | null;
  year: number;
  month: string;
  paymentYear: number | null;
  paymentMonth: string | null;
  paymentDay: number | null;
  location: { id: string; code: string; name: string };
  supplier: { id: string; name: string };
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

const STATUS_LABELS: Record<string, { label: string; variant: "success" | "danger" | "warning" }> = {
  PAID: { label: "Platita", variant: "success" },
  UNPAID: { label: "Neplatita", variant: "danger" },
  PARTIAL: { label: "Partial", variant: "warning" },
};

type SortField = "createdAt" | "invoiceNumber" | "totalAmount" | "issueDate" | "status";

export default function IncomingInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, pageSize: 20, total: 0, totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [sortBy, setSortBy] = useState<SortField>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [locations, setLocations] = useState<{ id: string; code: string; name: string }[]>([]);
  const [showFilters, setShowFilters] = useState(false);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRow | null>(null);
  const [detailInvoice, setDetailInvoice] = useState<InvoiceRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceRow | null>(null);

  const { toast } = useToast();

  // ── Load locations ──────────────────────────────────────
  useEffect(() => {
    fetch("/api/locations")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setLocations(data);
        else if (data.data) setLocations(data.data);
      })
      .catch(() => {});
  }, []);

  // ── Fetch invoices ─────────────────────────────────────
  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(pagination.page));
      params.set("pageSize", "20");
      params.set("sortBy", sortBy);
      params.set("sortDir", sortDir);
      if (search) params.set("search", search);
      if (filterLocation) params.set("locationId", filterLocation);
      if (filterStatus) params.set("status", filterStatus);

      const res = await fetch(`/api/incoming-invoices?${params}`);
      const data = await res.json();

      if (res.ok) {
        setInvoices(data.data);
        setPagination(data.pagination);
      }
    } catch {
      toast({ title: "Eroare", description: "Nu s-au putut incarca facturile", variant: "danger" });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, search, filterLocation, filterStatus, sortBy, sortDir, toast]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // Clear selection when data changes
  useEffect(() => {
    setSelectedIds(new Set());
  }, [invoices]);

  // ── Debounced search ────────────────────────────────────
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPagination((p) => ({ ...p, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // ── Sorting ──────────────────────────────────────────────
  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(field);
      setSortDir("asc");
    }
    setPagination((p) => ({ ...p, page: 1 }));
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortBy !== field) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />;
  };

  // ── Selection ────────────────────────────────────────────
  const allSelected = invoices.length > 0 && invoices.every((inv) => selectedIds.has(inv.id));

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(invoices.map((inv) => inv.id)));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ── Bulk mark as paid ────────────────────────────────────
  const handleBulkMarkPaid = async () => {
    if (selectedIds.size === 0) return;
    setBulkLoading(true);
    try {
      const res = await fetch("/api/incoming-invoices", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedIds), status: "PAID" }),
      });
      if (res.ok) {
        toast({ title: `${selectedIds.size} facturi marcate ca platite`, variant: "success" });
        setSelectedIds(new Set());
        fetchInvoices();
      } else {
        toast({ title: "Eroare la actualizare", variant: "danger" });
      }
    } catch {
      toast({ title: "Eroare la actualizare", variant: "danger" });
    } finally {
      setBulkLoading(false);
    }
  };

  // ── Quick mark as paid (single) ──────────────────────────
  const handleMarkPaid = async (inv: InvoiceRow) => {
    try {
      const res = await fetch(`/api/incoming-invoices/${inv.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "PAID" }),
      });
      if (res.ok) {
        toast({ title: `Factura ${inv.invoiceNumber} marcata ca platita`, variant: "success" });
        fetchInvoices();
      } else {
        toast({ title: "Eroare", variant: "danger" });
      }
    } catch {
      toast({ title: "Eroare", variant: "danger" });
    }
  };

  // ── Delete ──────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(`/api/incoming-invoices/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast({ title: "Factura stearsa", variant: "success" });
        fetchInvoices();
      } else {
        toast({ title: "Eroare la stergere", variant: "danger" });
      }
    } catch {
      toast({ title: "Eroare la stergere", variant: "danger" });
    }
    setDeleteTarget(null);
  };

  // ── After form submit ───────────────────────────────────
  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingInvoice(null);
    fetchInvoices();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#2D1B0E]">Intrare Facturi</h2>
          <p className="mt-0.5 text-xs text-[#9B8B7F]">
            {pagination.total} facturi de la furnizori
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              exportToCSV(invoices, "facturi-intrare", [
                { header: "Nr. Factura", accessor: (i) => i.invoiceNumber },
                { header: "Furnizor", accessor: (i) => i.supplier.name },
                { header: "Locatie", accessor: (i) => i.location.code },
                { header: "Data emitere", accessor: (i) => i.issueDate || "" },
                { header: "Descriere", accessor: (i) => i.itemDescription || "" },
                { header: "Total fara TVA", accessor: (i) => i.amountExVat },
                { header: "TVA", accessor: (i) => i.vatAmount },
                { header: "Total", accessor: (i) => i.totalAmount },
                { header: "Platit", accessor: (i) => i.paidAmount },
                { header: "Rest", accessor: (i) => i.remainingAmount },
                { header: "Status", accessor: (i) => i.status },
                { header: "Categorie", accessor: (i) => i.plCategory },
              ]);
            }}
          >
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Link href="/import">
            <Button variant="outline" size="sm">
              <Upload className="h-4 w-4" />
              Import Excel
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingInvoice(null);
              setFormOpen(true);
            }}
          >
            <Plus className="h-4 w-4" />
            Adauga factura
          </Button>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedIds.size > 0 && (
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text">
                {selectedIds.size} factur{selectedIds.size === 1 ? "a selectata" : "i selectate"}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleBulkMarkPaid}
                  loading={bulkLoading}
                >
                  <CheckCircle className="h-4 w-4" />
                  Marcheaza ca platite
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Anuleaza selectia
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Cauta dupa nr. factura, furnizor, descriere..."
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
            </Button>
          </div>

          {showFilters && (
            <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-border pt-3">
              <select
                value={filterLocation}
                onChange={(e) => {
                  setFilterLocation(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="h-9 rounded-lg border border-border bg-surface px-3 text-sm"
              >
                <option value="">Toate locatiile</option>
                {locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.name}
                  </option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => {
                  setFilterStatus(e.target.value);
                  setPagination((p) => ({ ...p, page: 1 }));
                }}
                className="h-9 rounded-lg border border-border bg-surface px-3 text-sm"
              >
                <option value="">Toate statusurile</option>
                <option value="PAID">Platite</option>
                <option value="UNPAID">Neplatite</option>
                <option value="PARTIAL">Partial platite</option>
              </select>
              {(filterLocation || filterStatus) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterLocation("");
                    setFilterStatus("");
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
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 rounded border-border accent-primary"
                  />
                </th>
                <th
                  className="px-4 py-3 text-left font-medium text-text-secondary cursor-pointer select-none hover:text-text"
                  onClick={() => handleSort("invoiceNumber")}
                >
                  <span className="inline-flex items-center gap-1">
                    Nr. Factura <SortIcon field="invoiceNumber" />
                  </span>
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Furnizor</th>
                <th
                  className="px-4 py-3 text-left font-medium text-text-secondary cursor-pointer select-none hover:text-text"
                  onClick={() => handleSort("issueDate")}
                >
                  <span className="inline-flex items-center gap-1">
                    Data <SortIcon field="issueDate" />
                  </span>
                </th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Descriere</th>
                <th
                  className="px-4 py-3 text-right font-medium text-text-secondary cursor-pointer select-none hover:text-text"
                  onClick={() => handleSort("totalAmount")}
                >
                  <span className="inline-flex items-center justify-end gap-1">
                    Total <SortIcon field="totalAmount" />
                  </span>
                </th>
                <th
                  className="px-4 py-3 text-center font-medium text-text-secondary cursor-pointer select-none hover:text-text"
                  onClick={() => handleSort("status")}
                >
                  <span className="inline-flex items-center gap-1">
                    Status <SortIcon field="status" />
                  </span>
                </th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary">Locatie</th>
                <th className="px-4 py-3 text-right font-medium text-text-secondary">Actiuni</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-light">
                    {Array.from({ length: 9 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-border-light" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center">
                    <FileInput className="mx-auto mb-3 h-12 w-12 text-border" />
                    <p className="text-text-muted">Nu exista facturi</p>
                    <p className="mt-1 text-xs text-text-muted">
                      Adauga manual sau importa din Excel
                    </p>
                  </td>
                </tr>
              ) : (
                invoices.map((inv) => {
                  const statusInfo = STATUS_LABELS[inv.status] || STATUS_LABELS.UNPAID;
                  const isSelected = selectedIds.has(inv.id);
                  return (
                    <tr
                      key={inv.id}
                      className={`border-b border-border-light last:border-0 transition-colors hover:bg-surface-hover ${
                        isSelected ? "bg-primary/5" : ""
                      }`}
                    >
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOne(inv.id)}
                          className="h-4 w-4 rounded border-border accent-primary"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-text">
                        {inv.invoiceNumber}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {inv.supplier.name}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {inv.issueDate || "-"}
                      </td>
                      <td className="px-4 py-3 text-text-secondary max-w-[200px] truncate">
                        {inv.itemDescription || "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-text">
                        {formatCurrency(inv.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant={statusInfo.variant}>
                          {statusInfo.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Badge variant="outline">{inv.location.code}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {inv.status !== "PAID" && (
                            <button
                              onClick={() => handleMarkPaid(inv)}
                              className="rounded p-1.5 text-text-muted hover:bg-success-light hover:text-success"
                              title="Marcheaza ca platita"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setDetailInvoice(inv)}
                            className="rounded p-1.5 text-text-muted hover:bg-surface-hover hover:text-text"
                            title="Detalii"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditingInvoice(inv);
                              setFormOpen(true);
                            }}
                            className="rounded p-1.5 text-text-muted hover:bg-surface-hover hover:text-primary"
                            title="Editeaza"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(inv)}
                            className="rounded p-1.5 text-text-muted hover:bg-danger-light hover:text-danger"
                            title="Sterge"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
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
                onClick={() =>
                  setPagination((p) => ({ ...p, page: Math.max(1, p.page - 1) }))
                }
                disabled={pagination.page <= 1}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="px-2 text-xs text-text-secondary">
                {pagination.page} / {pagination.totalPages}
              </span>
              <button
                className="rounded p-1 text-text-muted hover:bg-surface-hover disabled:opacity-40"
                onClick={() =>
                  setPagination((p) => ({
                    ...p,
                    page: Math.min(p.totalPages, p.page + 1),
                  }))
                }
                disabled={pagination.page >= pagination.totalPages}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Create/Edit Form Modal */}
      <InvoiceFormModal
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingInvoice(null);
        }}
        invoice={editingInvoice}
        locations={locations}
        onSuccess={handleFormSuccess}
      />

      {/* Detail Modal */}
      <InvoiceDetailModal
        invoice={detailInvoice}
        onClose={() => setDetailInvoice(null)}
        onMarkPaid={(inv) => {
          handleMarkPaid(inv);
          setDetailInvoice(null);
        }}
        onEdit={(inv) => {
          setDetailInvoice(null);
          setEditingInvoice(inv);
          setFormOpen(true);
        }}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!deleteTarget}
        onOpenChange={() => setDeleteTarget(null)}
        title="Sterge factura"
        description={`Esti sigur ca vrei sa stergi factura ${deleteTarget?.invoiceNumber}?`}
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
