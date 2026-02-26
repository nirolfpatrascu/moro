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
  ChevronLeft,
  ChevronRight,
  FileInput,
  X,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { InvoiceFormModal } from "@/components/incoming/invoice-form";
import { InvoiceDetailModal } from "@/components/incoming/invoice-detail";

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
  status: string;
  notes: string | null;
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

export default function IncomingInvoicesPage() {
  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, pageSize: 20, total: 0, totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [locations, setLocations] = useState<{ id: string; code: string; name: string }[]>([]);
  const [showFilters, setShowFilters] = useState(false);

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
      params.set("sortBy", "createdAt");
      params.set("sortDir", "desc");
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
  }, [pagination.page, search, filterLocation, filterStatus, toast]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  // ── Debounced search ────────────────────────────────────
  const [searchInput, setSearchInput] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPagination((p) => ({ ...p, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

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
          <h2 className="text-2xl font-bold text-text">Intrare Facturi</h2>
          <p className="mt-1 text-sm text-text-muted">
            {pagination.total} facturi de la furnizori
          </p>
        </div>
        <div className="flex items-center gap-2">
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

      {/* Search & Filters */}
      <Card>
        <CardContent>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
              <input
                type="text"
                placeholder="Cauta dupa nr. factura, furnizor, descriere..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-surface pl-10 pr-3 text-sm text-text placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/50"
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
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Nr. Factura</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Furnizor</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Data</th>
                <th className="px-4 py-3 text-left font-medium text-text-secondary">Descriere</th>
                <th className="px-4 py-3 text-right font-medium text-text-secondary">Total</th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary">Status</th>
                <th className="px-4 py-3 text-center font-medium text-text-secondary">Locatie</th>
                <th className="px-4 py-3 text-right font-medium text-text-secondary">Actiuni</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-light">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 animate-pulse rounded bg-border-light" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center">
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
                  return (
                    <tr
                      key={inv.id}
                      className="border-b border-border-light last:border-0 transition-colors hover:bg-surface-hover"
                    >
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
