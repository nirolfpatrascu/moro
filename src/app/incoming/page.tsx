"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Card, CardContent, Button, Badge, Modal } from "@/components/ui";
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
  FileInput,
  X,
  CheckCircle,
} from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { InvoiceFormModal } from "@/components/incoming/invoice-form";
import { InvoiceDetailModal } from "@/components/incoming/invoice-detail";
import { exportToCSV } from "@/lib/export";
import { DataTable, type Column } from "@/components/shared/data-table";
import { usePaginatedList } from "@/hooks/use-paginated-list";
import { useSelection } from "@/hooks/use-selection";
import {
  useIncomingInvoices,
  useDeleteIncomingInvoice,
  useMarkIncomingPaid,
  useBulkMarkIncomingPaid,
} from "@/hooks/queries/use-incoming-invoices";
import { useLocations } from "@/hooks/queries/use-locations";

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

const STATUS_LABELS: Record<string, { label: string; variant: "success" | "danger" | "warning" }> =
  {
    PAID: { label: "Platita", variant: "success" },
    UNPAID: { label: "Neplatita", variant: "danger" },
    PARTIAL: { label: "Partial", variant: "warning" },
  };

export default function IncomingInvoicesPage() {
  const { toast } = useToast();
  const { page, setPage, pageSize, sortBy, sortDir, toggleSort } = usePaginatedList({
    initialSortBy: "createdAt",
    initialSortDir: "desc",
  });
  const {
    selected: selectedIds,
    toggle: toggleOne,
    toggleAll,
    clear: clearSelection,
    count: selectionCount,
  } = useSelection();

  // ── Filters & debounced search ──────────────────────────
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [filterLocation, setFilterLocation] = useState("");
  const [filterStatus, setFilterStatus] = useState("");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput, setPage]);

  // ── Modal state ─────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<InvoiceRow | null>(null);
  const [detailInvoice, setDetailInvoice] = useState<InvoiceRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InvoiceRow | null>(null);

  // ── Data fetching via React Query ───────────────────────
  const { data: locationsData } = useLocations();
  const locations = locationsData ?? [];

  const { data, isLoading } = useIncomingInvoices({
    page,
    pageSize,
    sortBy,
    sortDir,
    search: search || undefined,
    locationId: filterLocation || undefined,
    status: filterStatus || undefined,
  });
  const invoices: InvoiceRow[] = data?.data ?? [];
  const pagination = data?.pagination;

  // Clear selection when data changes
  useEffect(() => {
    clearSelection();
  }, [data, clearSelection]);

  // ── Mutations ───────────────────────────────────────────
  const deleteMutation = useDeleteIncomingInvoice();
  const markPaidMutation = useMarkIncomingPaid();
  const bulkMarkPaidMutation = useBulkMarkIncomingPaid();

  const handleMarkPaid = (inv: InvoiceRow) => {
    markPaidMutation.mutate(inv.id, {
      onSuccess: () =>
        toast({ title: `Factura ${inv.invoiceNumber} marcata ca platita`, variant: "success" }),
      onError: () => toast({ title: "Eroare", variant: "danger" }),
    });
  };

  const handleBulkMarkPaid = () => {
    if (selectionCount === 0) return;
    bulkMarkPaidMutation.mutate(Array.from(selectedIds), {
      onSuccess: () => {
        toast({ title: `${selectionCount} facturi marcate ca platite`, variant: "success" });
        clearSelection();
      },
      onError: () => toast({ title: "Eroare la actualizare", variant: "danger" }),
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => toast({ title: "Factura stearsa", variant: "success" }),
      onError: () => toast({ title: "Eroare la stergere", variant: "danger" }),
    });
    setDeleteTarget(null);
  };

  const handleFormSuccess = () => {
    setFormOpen(false);
    setEditingInvoice(null);
  };

  // ── Column definitions ─────────────────────────────────
  const columns: Column<InvoiceRow>[] = [
    {
      key: "invoiceNumber",
      label: "Nr. Factura",
      sortable: true,
      render: (inv) => <span className="font-medium text-text">{inv.invoiceNumber}</span>,
    },
    {
      key: "supplier",
      label: "Furnizor",
      render: (inv) => <span className="text-text-secondary">{inv.supplier.name}</span>,
    },
    {
      key: "issueDate",
      label: "Data",
      sortable: true,
      render: (inv) => <span className="text-text-secondary">{inv.issueDate || "-"}</span>,
    },
    {
      key: "itemDescription",
      label: "Descriere",
      className: "max-w-[200px] truncate",
      render: (inv) => <span className="text-text-secondary">{inv.itemDescription || "-"}</span>,
    },
    {
      key: "totalAmount",
      label: "Total",
      sortable: true,
      className: "text-right",
      render: (inv) => (
        <span className="font-medium text-text">{formatCurrency(inv.totalAmount)}</span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      className: "text-center",
      render: (inv) => {
        const s = STATUS_LABELS[inv.status] || STATUS_LABELS.UNPAID;
        return <Badge variant={s.variant}>{s.label}</Badge>;
      },
    },
    {
      key: "location",
      label: "Locatie",
      className: "text-center",
      render: (inv) => <Badge variant="outline">{inv.location.code}</Badge>,
    },
    {
      key: "actions",
      label: "Actiuni",
      className: "text-right",
      render: (inv) => (
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
      ),
    },
  ];

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[#2D1B0E]">Intrare Facturi</h2>
          <p className="mt-0.5 text-xs text-[#9B8B7F]">
            {pagination?.total ?? 0} facturi de la furnizori
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
      {selectionCount > 0 && (
        <Card>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-text">
                {selectionCount} factur{selectionCount === 1 ? "a selectata" : "i selectate"}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleBulkMarkPaid}
                  loading={bulkMarkPaidMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4" />
                  Marcheaza ca platite
                </Button>
                <Button variant="ghost" size="sm" onClick={clearSelection}>
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
                placeholder=""
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
                  setPage(1);
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
                  setPage(1);
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
      <DataTable<InvoiceRow>
        columns={columns}
        data={invoices}
        loading={isLoading}
        pagination={pagination}
        onPageChange={setPage}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={toggleSort}
        selected={selectedIds}
        onToggleOne={toggleOne}
        onToggleAll={() => toggleAll(invoices.map((i) => i.id))}
        emptyIcon={<FileInput className="mx-auto h-12 w-12 text-border" />}
        emptyText="Nu exista facturi"
        emptySubtext="Adauga manual sau importa din Excel"
      />

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
          handleMarkPaid(inv as InvoiceRow);
          setDetailInvoice(null);
        }}
        onEdit={(inv) => {
          setDetailInvoice(null);
          setEditingInvoice(inv as InvoiceRow);
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
          <p className="text-sm text-text-secondary">Aceasta actiune nu poate fi anulata.</p>
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
